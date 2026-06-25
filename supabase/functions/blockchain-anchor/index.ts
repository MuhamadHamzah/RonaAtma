import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { getCanisterActor, generatePseudonymousId } from "../_shared/icp-client.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

// Map string dataType to candid variant key
function toDataTypeVariant(
  dataType: string
): Record<string, null> {
  const mapping: Record<string, null> = {
    bullyingReport: null,
    crisisAlert: null,
    moodEntry: null,
    badgeMint: null,
  };

  if (!(dataType in mapping)) {
    throw new Error(
      `Tipe data tidak valid: ${dataType}. Harus salah satu dari: bullyingReport, crisisAlert, moodEntry, badgeMint`
    );
  }

  return { [dataType]: null };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { data, dataType, userId } = (await req.json()) as {
      data: unknown;
      dataType: string;
      userId: string;
    };

    if (!data || !dataType || !userId) {
      return new Response(
        JSON.stringify({
          error: "Parameter tidak lengkap. Diperlukan: data, dataType, userId",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Compute SHA-256 hash of the data
    const dataString = JSON.stringify(data);
    const hashBuffer = await crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(dataString)
    );
    const hashArray = new Uint8Array(hashBuffer);
    const hash = Array.from(hashArray)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    // Generate pseudonymous ID
    const pseudoId = await generatePseudonymousId(userId);

    // Convert dataType string to candid variant
    const dataTypeVariant = toDataTypeVariant(dataType);

    // Call ICP canister
    const actor = await getCanisterActor();
    const result = (await actor.anchorRecord(hash, dataTypeVariant, pseudoId)) as {
      anchorId: bigint;
      hash: string;
      timestamp: bigint;
    };

    const canisterId = Deno.env.get("ICP_CANISTER_ID")!;

    return new Response(
      JSON.stringify({
        anchorId: Number(result.anchorId),
        hash: result.hash,
        timestamp: Number(result.timestamp),
        canisterId,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    const error = err as Error;
    console.error("Blockchain anchor error:", error.message);
    return new Response(
      JSON.stringify({
        error: `Gagal menganchor data ke blockchain: ${error.message}`,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
