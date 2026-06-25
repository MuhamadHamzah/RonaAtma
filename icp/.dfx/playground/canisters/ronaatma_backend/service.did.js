export const idlFactory = ({ IDL }) => {
  const DataType = IDL.Variant({
    'badgeMint' : IDL.Null,
    'crisisAlert' : IDL.Null,
    'bullyingReport' : IDL.Null,
    'moodEntry' : IDL.Null,
  });
  const AnchorResult = IDL.Record({
    'hash' : IDL.Text,
    'anchorId' : IDL.Nat,
    'timestamp' : IDL.Int,
  });
  const AnchorRecord = IDL.Record({
    'id' : IDL.Nat,
    'hash' : IDL.Text,
    'dataType' : DataType,
    'timestamp' : IDL.Int,
    'pseudoId' : IDL.Text,
  });
  const Badge = IDL.Record({
    'id' : IDL.Nat,
    'badgeType' : IDL.Text,
    'mintedAt' : IDL.Int,
    'pseudoId' : IDL.Text,
  });
  const MintResult = IDL.Record({
    'tokenId' : IDL.Nat,
    'badgeType' : IDL.Text,
    'mintedAt' : IDL.Int,
  });
  const Result = IDL.Variant({ 'ok' : MintResult, 'err' : IDL.Text });
  return IDL.Service({
    'anchorRecord' : IDL.Func(
        [IDL.Text, DataType, IDL.Text],
        [AnchorResult],
        [],
      ),
    'getAuditTrail' : IDL.Func([IDL.Nat], [IDL.Vec(AnchorRecord)], ['query']),
    'getSBTBadges' : IDL.Func([IDL.Text], [IDL.Vec(Badge)], ['query']),
    'getStats' : IDL.Func(
        [],
        [IDL.Record({ 'totalBadges' : IDL.Nat, 'totalAnchors' : IDL.Nat })],
        ['query'],
      ),
    'mintSBT' : IDL.Func([IDL.Text, IDL.Text], [Result], []),
    'verifyRecord' : IDL.Func([IDL.Nat], [IDL.Opt(AnchorRecord)], ['query']),
  });
};
export const init = ({ IDL }) => { return []; };
