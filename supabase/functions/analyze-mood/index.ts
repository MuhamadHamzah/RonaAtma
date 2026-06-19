import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { journal_text, mood_score } = await req.json() as { journal_text: string; mood_score: number };
    const apiKey = Deno.env.get("ANTHROPIC_API_KEY");

    if (!apiKey) {
      return new Response(JSON.stringify({ error: "ANTHROPIC_API_KEY not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-3-haiku-20240307",
        max_tokens: 512,
        system: `Kamu adalah psikolog AI yang menganalisis jurnal harian siswa SMA Indonesia untuk deteksi dini masalah kesehatan jiwa.
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
- low: perasaan normal, tekanan wajar`,
        messages: [{ role: "user", content: `Mood score siswa: ${mood_score}/10\n\nJurnal:\n${journal_text}` }],
      }),
    });

    if (!response.ok) {
      throw new Error(`Claude API error: ${response.statusText}`);
    }

    const data = await response.json() as { content: [{ text: string }] };
    const raw = data.content[0].text.trim();
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON in response");
    const result = JSON.parse(jsonMatch[0]);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const error = err as Error;
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
