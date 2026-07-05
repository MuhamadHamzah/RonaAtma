import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

// Default Voice: Jessica (Playful, Bright, Warm - Ideal for teenager peer counselor)
const DEFAULT_VOICE_ID = "cgSgspJ2msm6clMCkdW9";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { text, voiceId, emotion } = await req.json() as {
      text: string;
      voiceId?: string;
      emotion?: string;
    };

    if (!text) {
      return new Response(JSON.stringify({ error: "Missing text to synthesize" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Ambil string kunci, pisahkan dengan koma untuk rotasi (bisa single key atau multiple key)
    const rawKeys = Deno.env.get("ELEVENLABS_API_KEY") || "sk_677a39a461cdfb91afff3dcf56f7bae5203bfc8629324a6e";
    const apiKeys = rawKeys.split(",").map(k => k.trim()).filter(Boolean);
    const selectedVoiceId = voiceId || DEFAULT_VOICE_ID;

    let stability = 0.5;
    let similarityBoost = 0.75;
    if (emotion === "concerned") {
      stability = 0.6;
    } else if (emotion === "encouraging") {
      stability = 0.45;
    }

    const elevenLabsUrl = `https://api.elevenlabs.io/v1/text-to-speech/${selectedVoiceId}`;
    let lastError: Error | null = null;
    let audioBuffer: ArrayBuffer | null = null;

    // Loop mencoba setiap API Key yang tersedia hingga sukses (Rotasi Kunci)
    for (let i = 0; i < apiKeys.length; i++) {
      const activeKey = apiKeys[i];
      try {
        console.log(`[TTS] Mencoba menyintesis menggunakan API Key indeks ke-${i}...`);
        const response = await fetch(elevenLabsUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "xi-api-key": activeKey,
            "accept": "audio/mpeg",
          },
          body: JSON.stringify({
            text: text,
            model_id: "eleven_multilingual_v2",
            voice_settings: {
              stability: stability,
              similarity_boost: similarityBoost,
            },
          }),
        });

        if (response.ok) {
          audioBuffer = await response.arrayBuffer();
          console.log(`[TTS] Sukses menggunakan API Key indeks ke-${i}.`);
          break; // Keluar dari loop jika berhasil
        } else {
          const errText = await response.text();
          console.warn(`[TTS] API Key indeks ke-${i} gagal: ${response.status} - ${errText}`);
          lastError = new Error(`ElevenLabs API error (${response.status}): ${errText}`);
        }
      } catch (err) {
        console.warn(`[TTS] Koneksi API Key indeks ke-${i} error:`, err);
        lastError = err as Error;
      }
    }

    if (audioBuffer) {
      return new Response(audioBuffer, {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "audio/mpeg",
        },
      });
    }

    // Jika semua API key habis/gagal
    throw lastError || new Error("Semua API Key ElevenLabs gagal atau habis kuota.");

  } catch (err) {
    const error = err as Error;
    console.error("Text-to-speech final error:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
