import HashMap "mo:base/HashMap";
import Nat "mo:base/Nat";
import Int "mo:base/Int";
import Time "mo:base/Time";
import Iter "mo:base/Iter";
import Array "mo:base/Array";
import Result "mo:base/Result";
import Text "mo:base/Text";
import Buffer "mo:base/Buffer";
import Hash "mo:base/Hash";
import Order "mo:base/Order";
import Types "types";

persistent actor RonaAtma {
  type DataType = Types.DataType;
  type AnchorRecord = Types.AnchorRecord;
  type Badge = Types.Badge;
  type AnchorResult = Types.AnchorResult;
  type MintResult = Types.MintResult;

  stable var nextAnchorId : Nat = 0;
  stable var nextTokenId : Nat = 0;
  stable var stableAnchors : [(Nat, AnchorRecord)] = [];
  stable var stableBadges : [(Nat, Badge)] = [];

  func natHash(n : Nat) : Hash.Hash {
    Text.hash(Nat.toText(n));
  };

  transient var anchors = HashMap.HashMap<Nat, AnchorRecord>(16, Nat.equal, natHash);
  transient var badges = HashMap.HashMap<Nat, Badge>(16, Nat.equal, natHash);

  system func preupgrade() {
    stableAnchors := Iter.toArray(anchors.entries());
    stableBadges := Iter.toArray(badges.entries());
  };

  system func postupgrade() {
    anchors := HashMap.fromIter<Nat, AnchorRecord>(stableAnchors.vals(), stableAnchors.size(), Nat.equal, natHash);
    stableAnchors := [];
    badges := HashMap.fromIter<Nat, Badge>(stableBadges.vals(), stableBadges.size(), Nat.equal, natHash);
    stableBadges := [];
  };

  public shared func anchorRecord(hash : Text, dataType : DataType, pseudoId : Text) : async AnchorResult {
    let id = nextAnchorId;
    nextAnchorId += 1;
    let now = Time.now();

    let record : AnchorRecord = {
      id;
      hash;
      dataType;
      pseudoId;
      timestamp = now;
    };

    anchors.put(id, record);

    { anchorId = id; hash; timestamp = now };
  };

  public shared func mintSBT(pseudoId : Text, badgeType : Text) : async Result.Result<MintResult, Text> {
    let validTypes = ["resilience", "advocate", "pioneer"];
    let isValid = Array.find<Text>(validTypes, func(t) { t == badgeType });

    switch (isValid) {
      case null {
        #err("Tipe badge tidak valid");
      };
      case (?_) {
        let existing = Iter.toArray(
          Iter.filter<Badge>(
            Iter.map<(Nat, Badge), Badge>(badges.entries(), func((_, b)) { b }),
            func(b) { b.pseudoId == pseudoId and b.badgeType == badgeType },
          )
        );

        if (existing.size() > 0) {
          #err("Badge sudah dimiliki");
        } else {
          let tokenId = nextTokenId;
          nextTokenId += 1;
          let now = Time.now();

          let badge : Badge = {
            id = tokenId;
            pseudoId;
            badgeType;
            mintedAt = now;
          };

          badges.put(tokenId, badge);

          #ok({ tokenId; badgeType; mintedAt = now });
        };
      };
    };
  };

  public query func getAuditTrail(limit : Nat) : async [AnchorRecord] {
    let all = Iter.toArray(
      Iter.map<(Nat, AnchorRecord), AnchorRecord>(anchors.entries(), func((_, r)) { r })
    );

    let sorted = Array.sort<AnchorRecord>(
      all,
      func(a, b) { Int.compare(b.timestamp, a.timestamp) },
    );

    let size = Array.size(sorted);
    let take = if (limit < size) { limit } else { size };

    Array.tabulate<AnchorRecord>(take, func(i) { sorted[i] });
  };

  public query func getSBTBadges(pseudoId : Text) : async [Badge] {
    Iter.toArray(
      Iter.filter<Badge>(
        Iter.map<(Nat, Badge), Badge>(badges.entries(), func((_, b)) { b }),
        func(b) { b.pseudoId == pseudoId },
      )
    );
  };

  public query func verifyRecord(anchorId : Nat) : async ?AnchorRecord {
    anchors.get(anchorId);
  };

  public query func getStats() : async { totalAnchors : Nat; totalBadges : Nat } {
    { totalAnchors = anchors.size(); totalBadges = badges.size() };
  };
};
