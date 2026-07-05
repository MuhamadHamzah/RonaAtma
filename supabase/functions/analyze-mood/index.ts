import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js";
import { getCanisterActor, generatePseudonymousId } from "../_shared/icp-client.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface MoodAnalysisResult {
  sentiment_score: number;
  depression_risk_level: "low" | "medium" | "high" | "critical";
  ai_feedback: string;
  keywords: string[];
  crisis_detected: boolean;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { journal_text, mood_score, userId } = await req.json() as {
      journal_text: string;
      mood_score: number;
      userId?: string;
    };

    if (!userId || !journal_text || mood_score === undefined) {
      return new Response(JSON.stringify({ error: "Missing required fields: journal_text, mood_score, userId" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const apiKey = Deno.env.get("GROQ_API_KEY");
    let result: MoodAnalysisResult;
    let apiFailed = false;

    if (!apiKey) {
      apiFailed = true;
    } else {
      try {
        const modelName = Deno.env.get("GROQ_LLM_MODEL") || "llama-3.3-70b-versatile";
        const systemPrompt = `Kamu adalah psikolog AI yang menganalisis jurnal harian siswa SMA Indonesia untuk deteksi dini masalah kesehatan jiwa.
Analisis teks dan kembalikan JSON dengan format tepat:
{
  "sentiment_score": <angka 0-100, 100 paling positif>,
  "depression_risk_level": <"low"|"medium"|"high"|"critical">,
  "ai_feedback": <string empati 2-3 kalimat dalam Bahasa Indonesia>,
  "keywords": <array 3-5 kata kunci emosional dari teks>,
  "crisis_detected": <boolean, true jika ada tanda krisis akut>
}
Panduan:
- critical: ideasi bunuh diri, menyakiti diri, tidak mau hidup
- high: depresi berat, putus asa total, isolasi sosial ekstrim
- medium: sedih berkepanjangan, tekanan berat, cemas tinggi
- low: perasaan normal, tekanan wajar
PENTING: Kembalikan HANYA JSON tanpa teks tambahan.`;

        const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: modelName,
            max_tokens: 512,
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: `Mood score siswa: ${mood_score}/10\n\nJurnal:\n${journal_text}` }
            ],
          }),
        });

        if (!response.ok) {
          throw new Error(`Groq API error: ${response.statusText}`);
        }

        const data = await response.json() as {
          choices: { message: { content: string } }[];
        };
        const raw = data.choices[0].message.content.trim();
        const jsonMatch = raw.match(/\{[\s\S]*\}/);
        if (!jsonMatch) throw new Error("No JSON in response");
        result = JSON.parse(jsonMatch[0]) as MoodAnalysisResult;
      } catch (err) {
        console.error("Groq API failed, falling back to defaults:", err);
        apiFailed = true;
      }
    }

    if (apiFailed) {
      // Safe defaults based on student's manual mood score
      result = {
        sentiment_score: mood_score * 10,
        depression_risk_level: mood_score <= 2 ? "high" : mood_score <= 5 ? "medium" : "low",
        ai_feedback: "Terima kasih sudah mencatat perasaanmu hari ini. Tetap semangat dan jangan ragu bercerita jika ada masalah ya.",
        keywords: ["harian", "catatan", "mood"],
        crisis_detected: false,
      };
    }

    // --- ALERTS & BLOCKCHAIN ANCHORING ---
    let icp_anchor_id: string | null = null;
    const isHighRisk = result.depression_risk_level === "high" || result.depression_risk_level === "critical" || result.crisis_detected;

    if (isHighRisk) {
      try {
        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        // 1. Generate pseudoId and hash data
        const pseudoId = await generatePseudonymousId(userId);
        const dataToHash = {
          journal_text,
          mood_score,
          sentiment_score: result.sentiment_score,
          depression_risk_level: result.depression_risk_level,
          crisis_detected: result.crisis_detected,
        };
        const hashBuffer = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(JSON.stringify(dataToHash)));
        const hashArray = new Uint8Array(hashBuffer);
        const hash = Array.from(hashArray).map(b => b.toString(16).padStart(2, "0")).join("");

        // 2. Call canister actor
        const actor = await getCanisterActor();
        const anchorResult = await actor.anchorRecord(
          hash,
          { moodEntry: null },
          pseudoId
        );

        if (anchorResult && anchorResult.anchorId !== undefined) {
          icp_anchor_id = String(anchorResult.anchorId);

          // 3. Create critical alert linked to ICP anchor ID
          const { error: alertError } = await supabase
            .from("alerts")
            .insert({
              student_id: userId,
              alert_type: result.crisis_detected ? "crisis_language" : "depression_risk",
              severity: result.depression_risk_level === "critical" ? "critical" : "high",
              title: result.crisis_detected ? "Peringatan Krisis Akut (Mood Tracker)" : "Risiko Depresi Tinggi (Mood Tracker)",
              description: `Siswa terdeteksi memerlukan perhatian bimbingan konseling segera berdasarkan analisis mood tracker.`,
              ai_score: result.sentiment_score,
              is_read: false,
              is_resolved: false,
              icp_anchor_id: icp_anchor_id,
            });

          if (alertError) {
            console.error("Gagal membuat database alert:", alertError);
          }
        }
      } catch (blockchainErr) {
        console.error("Gagal melakukan penulisan blockchain ICP:", blockchainErr);
      }
    }

    return new Response(JSON.stringify({ ...result, icp_anchor_id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const error = err as Error;
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
