module {
  public type DataType = {
    #bullyingReport;
    #crisisAlert;
    #moodEntry;
    #badgeMint;
  };

  public type AnchorRecord = {
    id : Nat;
    hash : Text;
    dataType : DataType;
    pseudoId : Text;
    timestamp : Int;
  };

  public type Badge = {
    id : Nat;
    pseudoId : Text;
    badgeType : Text;
    mintedAt : Int;
  };

  public type AnchorResult = {
    anchorId : Nat;
    hash : Text;
    timestamp : Int;
  };

  public type MintResult = {
    tokenId : Nat;
    badgeType : Text;
    mintedAt : Int;
  };
};
