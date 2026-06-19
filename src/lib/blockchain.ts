import { supabase } from './supabase';
import type { BlockchainRecord } from '../types';

const NETWORK = 'ronaatma-audit-chain';

async function sha256(message: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

function generateTxId(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return '0x' + Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function generatePseudonymousId(userId: string, schoolId: string): Promise<string> {
  const input = `${userId}:${schoolId}:ronaatma-salt-2024`;
  const hash = await sha256(input);
  return `0x${hash.slice(0, 40)}`;
}

export async function generateDeterministicWallet(userId: string): Promise<string> {
  const input = `${userId}:wallet-salt-2026`;
  const hash = await sha256(input);
  return `0x${hash.slice(0, 40)}`;
}


export async function anchorRecord(data: Record<string, unknown>): Promise<BlockchainRecord> {
  const payload = JSON.stringify({ ...data, timestamp: Date.now(), network: NETWORK });
  const hash = await sha256(payload);
  const tx_id = generateTxId();
  const record: BlockchainRecord = { hash: `0x${hash}`, tx_id, timestamp: Date.now(), network: NETWORK };

  // Fire-and-forget audit log (best-effort)
  void supabase.from('blockchain_audit').insert({
    hash: record.hash,
    tx_id: record.tx_id,
    payload_type: (data.type as string) ?? 'unknown',
    anchored_at: new Date(record.timestamp).toISOString(),
  }).then(() => undefined, () => undefined);

  return record;
}

export function shortHash(hash: string): string {
  if (!hash || hash.length < 12) return hash;
  return `${hash.slice(0, 6)}…${hash.slice(-4)}`;
}
