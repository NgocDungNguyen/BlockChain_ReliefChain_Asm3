export const CAMPAIGN_FACTORY_ABI = [
  // ─── Constructor ─────────────────────────────────────────────────────────────
  {
    inputs: [
      { internalType: "address[]", name: "_globalValidators", type: "address[]" },
      { internalType: "uint256",   name: "_globalThreshold",  type: "uint256"   },
      { internalType: "uint256",   name: "_minimumStake",     type: "uint256"   },
    ],
    stateMutability: "nonpayable",
    type: "constructor",
  },

  // ─── Public state getters ─────────────────────────────────────────────────────
  {
    inputs: [],
    name: "globalValidatorThreshold",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "globalValidatorCount",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "minimumStake",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "", type: "address" }],
    name: "validatorStake",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint256", name: "", type: "uint256" },
      { internalType: "address", name: "", type: "address" },
    ],
    name: "proposalHasVoted",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    stateMutability: "view",
    type: "function",
  },

  // ─── Tier 1: Direct campaign creation ────────────────────────────────────────
  {
    inputs: [
      { internalType: "address[]", name: "_validators", type: "address[]" },
      { internalType: "uint256",   name: "_threshold",  type: "uint256"   },
      { internalType: "string",    name: "_name",       type: "string"    },
      { internalType: "uint256",   name: "_targetWei",  type: "uint256"   },
    ],
    name: "createCampaign",
    outputs: [{ internalType: "address", name: "addr", type: "address" }],
    stateMutability: "nonpayable",
    type: "function",
  },

  // ─── Tier 2: Proposal governance ─────────────────────────────────────────────
  {
    inputs: [
      { internalType: "string",    name: "_name",       type: "string"    },
      { internalType: "uint256",   name: "_targetWei",  type: "uint256"   },
      { internalType: "address[]", name: "_validators", type: "address[]" },
      { internalType: "uint256",   name: "_threshold",  type: "uint256"   },
      { internalType: "string",    name: "_ipfsCID",    type: "string"    },
    ],
    name: "submitProposal",
    outputs: [{ internalType: "uint256", name: "proposalId", type: "uint256" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint256", name: "_proposalId", type: "uint256" },
      { internalType: "bool",    name: "_approve",    type: "bool"    },
    ],
    name: "voteOnProposal",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },

  // ─── Staking ──────────────────────────────────────────────────────────────────
  {
    inputs: [],
    name: "stake",
    outputs: [],
    stateMutability: "payable",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "amount", type: "uint256" }],
    name: "withdrawStake",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "validator", type: "address" },
      { internalType: "uint256", name: "amount",    type: "uint256" },
    ],
    name: "slashValidator",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },

  // ─── View helpers — campaigns ─────────────────────────────────────────────────
  {
    inputs: [],
    name: "getCampaigns",
    outputs: [
      {
        components: [
          { internalType: "address", name: "campaignAddress", type: "address" },
          { internalType: "string",  name: "name",            type: "string"  },
          { internalType: "address", name: "owner",           type: "address" },
          { internalType: "uint256", name: "validatorCount",  type: "uint256" },
          { internalType: "uint256", name: "threshold",       type: "uint256" },
          { internalType: "uint256", name: "targetWei",       type: "uint256" },
          { internalType: "uint256", name: "createdAt",       type: "uint256" },
        ],
        internalType: "struct CampaignFactory.CampaignRecord[]",
        name: "",
        type: "tuple[]",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "getCampaignsCount",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "_index", type: "uint256" }],
    name: "getCampaign",
    outputs: [
      {
        components: [
          { internalType: "address", name: "campaignAddress", type: "address" },
          { internalType: "string",  name: "name",            type: "string"  },
          { internalType: "address", name: "owner",           type: "address" },
          { internalType: "uint256", name: "validatorCount",  type: "uint256" },
          { internalType: "uint256", name: "threshold",       type: "uint256" },
          { internalType: "uint256", name: "targetWei",       type: "uint256" },
          { internalType: "uint256", name: "createdAt",       type: "uint256" },
        ],
        internalType: "struct CampaignFactory.CampaignRecord",
        name: "",
        type: "tuple",
      },
    ],
    stateMutability: "view",
    type: "function",
  },

  // ─── View helpers — proposals ─────────────────────────────────────────────────
  {
    inputs: [],
    name: "getProposals",
    outputs: [
      {
        components: [
          { internalType: "address",   name: "proposer",       type: "address"   },
          { internalType: "string",    name: "name",           type: "string"    },
          { internalType: "uint256",   name: "targetWei",      type: "uint256"   },
          { internalType: "address[]", name: "validators",     type: "address[]" },
          { internalType: "uint256",   name: "threshold",      type: "uint256"   },
          { internalType: "string",    name: "ipfsCID",        type: "string"    },
          { internalType: "uint256",   name: "approvalCount",  type: "uint256"   },
          { internalType: "uint256",   name: "rejectionCount", type: "uint256"   },
          { internalType: "bool",      name: "executed",       type: "bool"      },
          { internalType: "bool",      name: "rejected",       type: "bool"      },
          { internalType: "uint256",   name: "createdAt",      type: "uint256"   },
        ],
        internalType: "struct CampaignFactory.Proposal[]",
        name: "",
        type: "tuple[]",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "getProposalsCount",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "_index", type: "uint256" }],
    name: "getProposal",
    outputs: [
      {
        components: [
          { internalType: "address",   name: "proposer",       type: "address"   },
          { internalType: "string",    name: "name",           type: "string"    },
          { internalType: "uint256",   name: "targetWei",      type: "uint256"   },
          { internalType: "address[]", name: "validators",     type: "address[]" },
          { internalType: "uint256",   name: "threshold",      type: "uint256"   },
          { internalType: "string",    name: "ipfsCID",        type: "string"    },
          { internalType: "uint256",   name: "approvalCount",  type: "uint256"   },
          { internalType: "uint256",   name: "rejectionCount", type: "uint256"   },
          { internalType: "bool",      name: "executed",       type: "bool"      },
          { internalType: "bool",      name: "rejected",       type: "bool"      },
          { internalType: "uint256",   name: "createdAt",      type: "uint256"   },
        ],
        internalType: "struct CampaignFactory.Proposal",
        name: "",
        type: "tuple",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "addr", type: "address" }],
    name: "isGlobalValidator",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "getGlobalThreshold",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "getGlobalValidatorCount",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },

  // ─── Events ───────────────────────────────────────────────────────────────────
  {
    anonymous: false,
    inputs: [
      { indexed: true,  internalType: "uint256", name: "campaignId",      type: "uint256" },
      { indexed: true,  internalType: "address", name: "campaignAddress", type: "address" },
      { indexed: false, internalType: "string",  name: "name",            type: "string"  },
      { indexed: true,  internalType: "address", name: "owner",           type: "address" },
      { indexed: false, internalType: "uint256", name: "validatorCount",  type: "uint256" },
      { indexed: false, internalType: "uint256", name: "threshold",       type: "uint256" },
    ],
    name: "CampaignCreated",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true,  internalType: "uint256", name: "proposalId", type: "uint256" },
      { indexed: true,  internalType: "address", name: "proposer",   type: "address" },
      { indexed: false, internalType: "string",  name: "name",       type: "string"  },
      { indexed: false, internalType: "uint256", name: "targetWei",  type: "uint256" },
      { indexed: false, internalType: "string",  name: "ipfsCID",    type: "string"  },
    ],
    name: "ProposalSubmitted",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true,  internalType: "uint256", name: "proposalId", type: "uint256" },
      { indexed: true,  internalType: "address", name: "voter",      type: "address" },
      { indexed: false, internalType: "bool",    name: "approved",   type: "bool"    },
    ],
    name: "ProposalVoted",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true,  internalType: "uint256", name: "proposalId",      type: "uint256" },
      { indexed: true,  internalType: "uint256", name: "campaignId",      type: "uint256" },
      { indexed: false, internalType: "address", name: "campaignAddress", type: "address" },
    ],
    name: "ProposalApproved",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: "uint256", name: "proposalId", type: "uint256" },
    ],
    name: "ProposalRejected",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true,  internalType: "address", name: "validator", type: "address" },
      { indexed: false, internalType: "uint256", name: "amount",    type: "uint256" },
      { indexed: false, internalType: "uint256", name: "newTotal",  type: "uint256" },
    ],
    name: "ValidatorStaked",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true,  internalType: "address", name: "validator", type: "address" },
      { indexed: false, internalType: "uint256", name: "amount",    type: "uint256" },
      { indexed: true,  internalType: "address", name: "by",        type: "address" },
    ],
    name: "ValidatorSlashed",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true,  internalType: "address", name: "validator", type: "address" },
      { indexed: false, internalType: "uint256", name: "amount",    type: "uint256" },
    ],
    name: "StakeWithdrawn",
    type: "event",
  },
] as const;
