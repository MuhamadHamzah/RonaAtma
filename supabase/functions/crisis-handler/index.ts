import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js";
import {
  getCanisterActor,
  generatePseudonymousId,
} from "../_shared/icp-client.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { userId, triggerSource, content } = (await req.json()) as {
      userId: string;
      triggerSource: string;
      content: string;
    };

    if (!userId || !triggerSource || !content) {
      return new Response(
        JSON.stringify({
          error:
            "Parameter tidak lengkap. Diperlukan: userId, triggerSource, content",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Create service role client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Insert alert
    const { data: alert, error: alertError } = await supabase
      .from("alerts")
      .insert({
        student_id: userId,
        alert_type: "crisis_language",
        severity: "critical",
        title: "Deteksi Krisis - Bahasa Kritis Terdeteksi",
        description: `Sumber: ${triggerSource}. Konten mengandung indikasi krisis yang memerlukan penanganan segera.`,
        ai_score: null,
        is_read: false,
        is_resolved: false,
      })
      .select("id")
      .single();

    if (alertError) {
      throw new Error(`Gagal menyimpan alert: ${alertError.message}`);
    }

    // Compute hash of crisis content (for immutability, NOT storing raw content on-chain)
    const hashBuffer = await crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(content)
    );
    const hash = Array.from(new Uint8Array(hashBuffer))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    // Generate pseudonymous ID
    const pseudoId = await generatePseudonymousId(userId);

    // Anchor to ICP
    let icpAnchorId: string | null = null;
    try {
      const actor = await getCanisterActor();
      const result = (await actor.anchorRecord(
        hash,
        { crisisAlert: null },
        pseudoId
      )) as {
        anchorId: bigint;
        hash: string;
        timestamp: bigint;
      };

      icpAnchorId = `icp-anchor-${Number(result.anchorId)}`;

      // Update alert with ICP anchor ID
      await supabase
        .from("alerts")
        .update({ icp_anchor_id: icpAnchorId })
        .eq("id", alert.id);
    } catch (icpErr) {
      console.error(
        "Gagal menganchor krisis ke ICP:",
        (icpErr as Error).message
      );
      // Continue - alert is already saved in database
    }

    return new Response(
      JSON.stringify({
        success: true,
        alertId: alert.id,
        icpAnchorId,
        message: "Alert krisis berhasil dicatat dan diamankan.",
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    const error = err as Error;
    console.error("Crisis handler error:", error.message);
    return new Response(
      JSON.stringify({
        error: `Gagal menangani krisis: ${error.message}`,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
