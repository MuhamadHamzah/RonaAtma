import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const CRISIS_KEYWORDS = [
  "bunuh diri",
  "mati aja",
  "mengakhiri hidup",
  "sayat tangan",
  "gantung diri",
  "self harm",
  "ingin mati",
  "suicide"
];

function detectCrisis(text: string): boolean {
  const normalized = text.toLowerCase();
  return CRISIS_KEYWORDS.some(keyword => normalized.includes(keyword));
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { messages, system, userId } = await req.json() as {
      messages: { role: string; content: string }[];
      system: string;
      userId?: string;
    };

    if (!userId) {
      return new Response(JSON.stringify({ error: "userId required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // --- RATE LIMITING ---
    const now = new Date();
    const { data: limitData } = await supabase
      .from("rate_limits")
      .select("*")
      .eq("user_id", userId)
      .eq("action_type", "chat")
      .maybeSingle();

    if (limitData) {
      const windowStart = new Date(limitData.window_start);
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
      if (windowStart > oneHourAgo) {
        if (limitData.count >= 30) {
          return new Response(JSON.stringify({ error: "Batas pengiriman pesan terlampaui (maksimal 30 pesan per jam). Silakan coba lagi nanti." }), {
            status: 429,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        await supabase
          .from("rate_limits")
          .update({ count: limitData.count + 1 })
          .eq("id", limitData.id);
      } else {
        await supabase
          .from("rate_limits")
          .update({ count: 1, window_start: now.toISOString() })
          .eq("id", limitData.id);
      }
    } else {
      await supabase
        .from("rate_limits")
        .insert({ user_id: userId, action_type: "chat", count: 1, window_start: now.toISOString() });
    }

    // Identify user's last message
    const userMessages = messages.filter(m => m.role === "user");
    const userContent = userMessages[userMessages.length - 1]?.content || "";
    const isCrisis = detectCrisis(userContent);

    if (isCrisis) {
      // Trigger crisis handler function asynchronously
      fetch(`${supabaseUrl}/functions/v1/crisis-handler`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${supabaseServiceKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ userId, triggerSource: "chat-ai", content: userContent }),
      }).catch(err => console.error("Failed to invoke crisis-handler:", err));
    }

    // Call AI API
    const apiKey = Deno.env.get("GROQ_API_KEY");
    let botResponseText = "";
    let apiFailed = false;

    if (!apiKey) {
      apiFailed = true;
    } else {
      try {
        const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "llama-3.3-70b-versatile",
            max_tokens: 512,
            messages: [
              { role: "system", content: system },
              ...messages.map((m) => ({ role: m.role, content: m.content }))
            ],
          }),
        });

        if (!response.ok) {
          throw new Error(`Groq API error: ${response.statusText}`);
        }

        const data = await response.json() as {
          choices: { message: { content: string } }[];
        };
        botResponseText = data.choices[0].message.content;
      } catch (err) {
        console.error("AI API Call failed:", err);
        apiFailed = true;
      }
    }

    if (apiFailed) {
      botResponseText = "Maaf, layanan AI sedang tidak tersedia. Jika kamu sedang mengalami masalah serius, silakan hubungi guru BK sekolahmu untuk mendapatkan bantuan.";
    }

    // Save both user message and bot response to chatbot_messages table
    // 1. Save user message
    if (userContent) {
      await supabase.from("chatbot_messages").insert({
        student_id: userId,
        role: "user",
        content: userContent,
        crisis_detected: isCrisis,
      });
    }

    // 2. Save bot message
    await supabase.from("chatbot_messages").insert({
      student_id: userId,
      role: "assistant",
      content: botResponseText,
      crisis_detected: isCrisis, // match the flag if user triggered crisis
    });

    return new Response(JSON.stringify({ content: botResponseText, crisis_detected: isCrisis }), {
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
