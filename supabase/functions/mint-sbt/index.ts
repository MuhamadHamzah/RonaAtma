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

const VALID_BADGE_TYPES = ["resilience", "advocate", "pioneer"] as const;

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { userId, badgeType } = (await req.json()) as {
      userId: string;
      badgeType: string;
    };

    if (!userId || !badgeType) {
      return new Response(
        JSON.stringify({
          error: "Parameter tidak lengkap. Diperlukan: userId, badgeType",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Validate badge type
    if (
      !VALID_BADGE_TYPES.includes(badgeType as (typeof VALID_BADGE_TYPES)[number])
    ) {
      return new Response(
        JSON.stringify({
          error: `Tipe badge tidak valid: ${badgeType}. Harus salah satu dari: ${VALID_BADGE_TYPES.join(", ")}`,
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

    // Check eligibility
    const eligible = await checkEligibility(supabase, userId, badgeType);
    if (!eligible.ok) {
      return new Response(
        JSON.stringify({ error: eligible.reason }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Check if badge already minted
    const { data: existingBadge } = await supabase
      .from("digital_badges")
      .select("id")
      .eq("student_id", userId)
      .eq("badge_type", badgeType)
      .maybeSingle();

    if (existingBadge) {
      return new Response(
        JSON.stringify({
          error: `Badge "${badgeType}" sudah pernah dicetak untuk akun ini`,
        }),
        {
          status: 409,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Generate pseudonymous ID
    const pseudoId = await generatePseudonymousId(userId);

    // Mint SBT on ICP
    const actor = await getCanisterActor();
    const mintResult = (await actor.mintSBT(pseudoId, badgeType)) as
      | { Ok: { tokenId: bigint; pseudoId: string; badgeType: string; mintedAt: bigint } }
      | { Err: string };

    if ("Err" in mintResult) {
      return new Response(
        JSON.stringify({ error: `Gagal mencetak badge: ${mintResult.Err}` }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const minted = mintResult.Ok;
    const tokenId = `icp-sbt-${Number(minted.tokenId)}`;

    // Insert badge into database
    const { error: insertError } = await supabase
      .from("digital_badges")
      .insert({
        student_id: userId,
        badge_type: badgeType,
        minted_tx: `icp-tx-${Number(minted.tokenId)}`,
        on_chain_hash: pseudoId,
        icp_token_id: tokenId,
        minted_at: new Date(Number(minted.mintedAt) / 1_000_000).toISOString(),
      });

    if (insertError) {
      console.error("Gagal menyimpan badge ke database:", insertError.message);
    }

    // Anchor the mint event in audit trail
    const mintData = { badgeType, pseudoId, tokenId };
    const mintDataString = JSON.stringify(mintData);
    const hashBuffer = await crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(mintDataString)
    );
    const hashHex = Array.from(new Uint8Array(hashBuffer))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    try {
      await actor.anchorRecord(hashHex, { badgeMint: null }, pseudoId);
    } catch (anchorErr) {
      console.error(
        "Gagal menganchor mint event:",
        (anchorErr as Error).message
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        tokenId,
        badgeType,
        pseudoId,
        mintedAt: Number(minted.mintedAt),
        canisterId: Deno.env.get("ICP_CANISTER_ID"),
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    const error = err as Error;
    console.error("Mint SBT error:", error.message);
    return new Response(
      JSON.stringify({
        error: `Gagal mencetak badge: ${error.message}`,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

// --- Eligibility Checks ---

async function checkEligibility(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  badgeType: string
): Promise<{ ok: boolean; reason?: string }> {
  switch (badgeType) {
    case "resilience": {
      // At least 1 bullying report
      const { count } = await supabase
        .from("bullying_reports")
        .select("id", { count: "exact", head: true })
        .eq("reporter_id", userId);

      if (!count || count < 1) {
        return {
          ok: false,
          reason:
            "Kamu belum memenuhi syarat badge Resilience. Diperlukan minimal 1 laporan perundungan.",
        };
      }
      return { ok: true };
    }

    case "advocate": {
      // At least 3 mood entries
      const { count } = await supabase
        .from("mood_entries")
        .select("id", { count: "exact", head: true })
        .eq("student_id", userId);

      if (!count || count < 3) {
        return {
          ok: false,
          reason:
            "Kamu belum memenuhi syarat badge Advocate. Diperlukan minimal 3 entri mood.",
        };
      }
      return { ok: true };
    }

    case "pioneer": {
      // At least 1 forum post
      const { count } = await supabase
        .from("forum_posts")
        .select("id", { count: "exact", head: true })
        .eq("author_id", userId);

      if (!count || count < 1) {
        return {
          ok: false,
          reason:
            "Kamu belum memenuhi syarat badge Pioneer. Diperlukan minimal 1 postingan forum.",
        };
      }
      return { ok: true };
    }

    default:
      return { ok: false, reason: "Tipe badge tidak dikenali" };
  }
}
