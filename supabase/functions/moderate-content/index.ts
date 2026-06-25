import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const LOCAL_PROFANITY_WORDS = [
  "anjing", "bangsat", "babi", "goblok", "tolol", "bodoh", "kontol", "memek", "ngentot",
  "pantek", "perek", "bajingan", "jancok", "dancok", "kunyuk", "kampret", "lonte", "brengsek",
  "asu", "bgst", "kntl", "mmk", "lont", "jancuk", "peli", "itil", "buto", "ngepet", "tai", "setan",
  "iblis", "gila", "sinting", "seks", "porno", "coly", "coli", "masturbasi", "persetubuhan",
  "bunuh", "mati", "suicide", "self-harm", "potong urat", "sayat", "gantung diri", "loncat"
];

function localModeration(text: string): { status: "approved" | "flagged"; reason: string | null } {
  const normalized = text.toLowerCase();
  const matchedWords = LOCAL_PROFANITY_WORDS.filter(word => {
    const regex = new RegExp(`\\b${word}\\b|${word}`, 'i'); 
    return regex.test(normalized);
  });

  if (matchedWords.length > 0) {
    return {
      status: "flagged",
      reason: `Terdeteksi kata sensitif/kasar oleh filter cadangan lokal: ${matchedWords.slice(0, 3).join(", ")}`
    };
  }

  return {
    status: "approved",
    reason: null
  };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  let content = "";
  try {
    const body = await req.json() as { content: string };
    content = body.content || "";
    const apiKey = Deno.env.get("GROQ_API_KEY");

    if (!apiKey) {
      const result = localModeration(content);
      if (result.status === "flagged") {
        result.reason = `${result.reason} (API Key tidak dikonfigurasi).`;
      }
      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        max_tokens: 256,
        messages: [
          {
            role: "system",
            content: `Kamu adalah moderator konten forum komunitas siswa SMA Indonesia.
Evaluasi teks dan kembalikan JSON:
{
  "status": <"approved"|"flagged"|"rejected">,
  "reason": <string penjelasan singkat jika flagged/rejected, null jika approved>
}
Aturan:
- rejected: kata kasar ekstrim, ujaran kebencian, pornografi, ancaman kekerasan nyata
- flagged: konten sensitif yang perlu review manusia (perundungan tersirat, konten menyedihkan berat)
- approved: konten normal, curhat wajar, motivasi, pertanyaan, cerita biasa
PENTING: Kembalikan HANYA JSON tanpa teks tambahan.`
          },
          { role: "user", content: `Moderasi konten berikut:\n\n${content}` }
        ],
      }),
    });

    if (!response.ok) throw new Error(`Groq API error: ${response.statusText}`);

    const data = await response.json() as {
      choices: { message: { content: string } }[];
    };
    const raw = data.choices[0].message.content.trim();
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON in response");
    const result = JSON.parse(jsonMatch[0]);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const error = err as Error;
    console.error("Groq API error, falling back to local moderation:", err);
    const result = localModeration(content);
    if (result.status === "flagged") {
      result.reason = `${result.reason} (API AI sedang mengalami gangguan).`;
    }
    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
