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
    const { content } = await req.json() as { content: string };
    const apiKey = Deno.env.get("ANTHROPIC_API_KEY");

    if (!apiKey) {
      return new Response(JSON.stringify({ status: "approved" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
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
        max_tokens: 256,
        system: `Kamu adalah moderator konten forum komunitas siswa SMA Indonesia.
Evaluasi teks dan kembalikan JSON:
{
  "status": <"approved"|"flagged"|"rejected">,
  "reason": <string penjelasan singkat jika flagged/rejected, null jika approved>
}
Aturan:
- rejected: kata kasar ekstrim, ujaran kebencian, pornografi, ancaman kekerasan nyata
- flagged: konten sensitif yang perlu review manusia (perundungan tersirat, konten menyedihkan berat)
- approved: konten normal, curhat wajar, motivasi, pertanyaan, cerita biasa`,
        messages: [{ role: "user", content: `Moderasi konten berikut:\n\n${content}` }],
      }),
    });

    if (!response.ok) throw new Error(`Claude API error: ${response.statusText}`);

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
    // Fail open — approve if moderation service errors
    return new Response(JSON.stringify({ status: "approved", error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
