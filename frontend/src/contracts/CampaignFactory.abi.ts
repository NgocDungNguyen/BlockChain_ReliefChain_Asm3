export const CAMPAIGN_FACTORY_ABI = [
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
] as const;