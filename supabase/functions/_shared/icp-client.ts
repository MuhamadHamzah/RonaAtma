import { HttpAgent, Actor } from "npm:@dfinity/agent";
import { Ed25519KeyIdentity } from "npm:@dfinity/identity";
import { IDL } from "npm:@dfinity/candid";

// --- Candid IDL Interface Definition ---

const DataType = IDL.Variant({
  bullyingReport: IDL.Null,
  crisisAlert: IDL.Null,
  moodEntry: IDL.Null,
  badgeMint: IDL.Null,
});

const AnchorResult = IDL.Record({
  anchorId: IDL.Nat,
  hash: IDL.Text,
  timestamp: IDL.Int,
});

const MintResult = IDL.Record({
  tokenId: IDL.Nat,
  pseudoId: IDL.Text,
  badgeType: IDL.Text,
  mintedAt: IDL.Int,
});

const AnchorRecord = IDL.Record({
  anchorId: IDL.Nat,
  hash: IDL.Text,
  dataType: DataType,
  pseudoId: IDL.Text,
  timestamp: IDL.Int,
});

const Badge = IDL.Record({
  tokenId: IDL.Nat,
  pseudoId: IDL.Text,
  badgeType: IDL.Text,
  mintedAt: IDL.Int,
});

const canisterIdlFactory: IDL.InterfaceFactory = ({ IDL: idl }) => {
  // Re-define locally for the factory scope
  const _DataType = idl.Variant({
    bullyingReport: idl.Null,
    crisisAlert: idl.Null,
    moodEntry: idl.Null,
    badgeMint: idl.Null,
  });

  const _AnchorResult = idl.Record({
    anchorId: idl.Nat,
    hash: idl.Text,
    timestamp: idl.Int,
  });

  const _MintResult = idl.Record({
    tokenId: idl.Nat,
    pseudoId: idl.Text,
    badgeType: idl.Text,
    mintedAt: idl.Int,
  });

  const _AnchorRecord = idl.Record({
    anchorId: idl.Nat,
    hash: idl.Text,
    dataType: _DataType,
    pseudoId: idl.Text,
    timestamp: idl.Int,
  });

  const _Badge = idl.Record({
    tokenId: idl.Nat,
    pseudoId: idl.Text,
    badgeType: idl.Text,
    mintedAt: idl.Int,
  });

  return idl.Service({
    anchorRecord: idl.Func(
      [idl.Text, _DataType, idl.Text],
      [_AnchorResult],
      []
    ),
    mintSBT: idl.Func(
      [idl.Text, idl.Text],
      [idl.Variant({ Ok: _MintResult, Err: idl.Text })],
      []
    ),
    getSBTBadges: idl.Func([idl.Text], [idl.Vec(_Badge)], ["query"]),
    verifyRecord: idl.Func([idl.Text], [idl.Opt(_AnchorRecord)], ["query"]),
    getAuditTrail: idl.Func(
      [idl.Text],
      [idl.Vec(_AnchorRecord)],
      ["query"]
    ),
    getStats: idl.Func(
      [],
      [
        idl.Record({
          totalAnchors: idl.Nat,
          totalSBTs: idl.Nat,
          totalPseudoIds: idl.Nat,
        }),
      ],
      ["query"]
    ),
  });
};

// --- PEM Parsing ---

function decodePem(pemBase64: string): Uint8Array {
  const pemRaw = atob(pemBase64);
  const pemLines = pemRaw.split("\n");
  const base64Content = pemLines
    .filter(
      (line) =>
        !line.startsWith("-----BEGIN") && !line.startsWith("-----END") && line.trim() !== ""
    )
    .join("");
  const binaryString = atob(base64Content);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

// --- Actor Factory ---

export async function getCanisterActor(): Promise<ReturnType<typeof Actor.createActor>> {
  const canisterId = Deno.env.get("ICP_CANISTER_ID");
  const pemBase64 = Deno.env.get("ICP_IDENTITY_PEM");
  const host = Deno.env.get("ICP_HOST") || "https://ic0.app";

  if (!canisterId) {
    throw new Error("ICP_CANISTER_ID tidak dikonfigurasi");
  }
  if (!pemBase64) {
    throw new Error("ICP_IDENTITY_PEM tidak dikonfigurasi");
  }

  const pemBytes = decodePem(pemBase64);

  // Ed25519 DER private key is 48 bytes; the raw seed is the last 32 bytes
  const seed = pemBytes.length > 32 ? pemBytes.slice(pemBytes.length - 32) : pemBytes;
  const identity = Ed25519KeyIdentity.generate(seed);

  const agent = new HttpAgent({ identity, host });

  // On non-mainnet (local), fetch root key
  if (host !== "https://ic0.app" && host !== "https://icp0.io") {
    await agent.fetchRootKey();
  }

  const actor = Actor.createActor(canisterIdlFactory, {
    agent,
    canisterId,
  });

  return actor;
}

// --- Pseudonymous ID Generation ---

export async function generatePseudonymousId(userId: string): Promise<string> {
  const salt = Deno.env.get("PSEUDONYMOUS_SALT");
  if (!salt) {
    throw new Error("PSEUDONYMOUS_SALT tidak dikonfigurasi");
  }

  const data = new TextEncoder().encode(`${userId}:${salt}`);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = new Uint8Array(hashBuffer);
  const hexString = Array.from(hashArray)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  return `0x${hexString.slice(0, 40)}`;
}

// Re-export IDL types for consumers
export { DataType, AnchorResult, MintResult, AnchorRecord, Badge };
