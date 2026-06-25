import type { Principal } from '@icp-sdk/core/principal';
import type { ActorMethod } from '@icp-sdk/core/agent';
import type { IDL } from '@icp-sdk/core/candid';

export interface AnchorRecord {
  'id' : bigint,
  'hash' : string,
  'dataType' : DataType,
  'timestamp' : bigint,
  'pseudoId' : string,
}
export interface AnchorResult {
  'hash' : string,
  'anchorId' : bigint,
  'timestamp' : bigint,
}
export interface Badge {
  'id' : bigint,
  'badgeType' : string,
  'mintedAt' : bigint,
  'pseudoId' : string,
}
export type DataType = { 'badgeMint' : null } |
  { 'crisisAlert' : null } |
  { 'bullyingReport' : null } |
  { 'moodEntry' : null };
export interface MintResult {
  'tokenId' : bigint,
  'badgeType' : string,
  'mintedAt' : bigint,
}
export type Result = { 'ok' : MintResult } |
  { 'err' : string };
export interface _SERVICE {
  'anchorRecord' : ActorMethod<[string, DataType, string], AnchorResult>,
  'getAuditTrail' : ActorMethod<[bigint], Array<AnchorRecord>>,
  'getSBTBadges' : ActorMethod<[string], Array<Badge>>,
  'getStats' : ActorMethod<
    [],
    { 'totalBadges' : bigint, 'totalAnchors' : bigint }
  >,
  'mintSBT' : ActorMethod<[string, string], Result>,
  'verifyRecord' : ActorMethod<[bigint], [] | [AnchorRecord]>,
}
export declare const idlFactory: IDL.InterfaceFactory;
export declare const init: (args: { IDL: typeof IDL }) => IDL.Type[];
