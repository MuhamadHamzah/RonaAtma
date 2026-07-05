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
    const apiKey = Deno.env.get("GROQ_API_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "GROQ_API_KEY tidak dikonfigurasi" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const contentType = req.headers.get("content-type") || "";
    if (!contentType.includes("multipart/form-data")) {
      return new Response(JSON.stringify({ error: "Content-Type harus berupa multipart/form-data" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const formData = await req.formData();
    const audioFile = formData.get("audio") as File;

    if (!audioFile) {
      return new Response(JSON.stringify({ error: "File audio tidak ditemukan dalam form data" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build the request body for Groq's transcription endpoint
    const groqFormData = new FormData();
    groqFormData.append("file", audioFile);
    groqFormData.append("model", "whisper-large-v3"); // Gunakan full model v3 untuk akurasi tertinggi (WER terendah)
    groqFormData.append("language", "id"); // Paksa bahasa Indonesia
    // Instruksi verbatim untuk mencegah ringkasan atau salah dengar kata gaul/formal
    groqFormData.append("prompt", "Transkripsikan seluruh rekaman suara siswa SMA Indonesia secara akurat dan literal kata demi kata (verbatim). Jangan lewatkan kata apa pun, jangan perbaiki tata bahasa, pertahankan kata gaul, singkatan, guru, BK, RonaAtma, dan semua tanda baca dengan tepat.");

    const response = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
      },
      body: groqFormData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Groq Whisper API error: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const result = await response.json() as { text: string };

    return new Response(JSON.stringify({ text: result.text }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const error = err as Error;
    console.error("Speech-to-text error:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
