export const CAMPAIGN_ABI = [
  // ─── State variable getters ──────────────────────────────────────────────
  {
    inputs: [],
    name: "campaignName",
    outputs: [{ internalType: "string", name: "", type: "string" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "campaignTarget",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "threshold",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "validatorCount",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "totalDonated",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    name: "validators",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    name: "donations",
    outputs: [
      { internalType: "address", name: "donor",     type: "address" },
      { internalType: "uint256", name: "amount",    type: "uint256" },
      { internalType: "uint256", name: "timestamp", type: "uint256" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint256", name: "",  type: "uint256" },
      { internalType: "address", name: "",  type: "address" },
    ],
    name: "hasVoted",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    stateMutability: "view",
    type: "function",
  },

  // ─── Role constants ───────────────────────────────────────────────────────
  {
    inputs: [],
    name: "VALIDATOR_ROLE",
    outputs: [{ internalType: "bytes32", name: "", type: "bytes32" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "OWNER_ROLE",
    outputs: [{ internalType: "bytes32", name: "", type: "bytes32" }],
    stateMutability: "view",
    type: "function",
  },

  // ─── Write functions ──────────────────────────────────────────────────────
  {
    inputs: [],
    name: "donate",
    outputs: [],
    stateMutability: "payable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "string",          name: "_description", type: "string"  },
      { internalType: "address payable", name: "_beneficiary", type: "address" },
      { internalType: "uint256",         name: "_amount",      type: "uint256" },
      { internalType: "string",          name: "_ipfsCID",     type: "string"  },
    ],
    name: "createRequest",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint256", name: "_requestId", type: "uint256" },
      { internalType: "bool",    name: "_approve",   type: "bool"    },
    ],
    name: "vote",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "_requestId", type: "uint256" }],
    name: "releaseFunds",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },

  // ─── View functions ───────────────────────────────────────────────────────
  {
    inputs: [],
    name: "getValidators",
    outputs: [{ internalType: "address[]", name: "", type: "address[]" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "getDonationsCount",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "getRequestsCount",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "_requestId", type: "uint256" }],
    name: "getRequestInfo",
    outputs: [
      { internalType: "string",  name: "description",   type: "string"  },
      { internalType: "address", name: "beneficiary",   type: "address" },
      { internalType: "uint256", name: "amount",        type: "uint256" },
      { internalType: "string",  name: "ipfsCID",       type: "string"  },
      { internalType: "uint256", name: "approvalCount", type: "uint256" },
      { internalType: "uint256", name: "rejectCount",   type: "uint256" },
      { internalType: "bool",    name: "executed",      type: "bool"    },
      { internalType: "bool",    name: "rejected",      type: "bool"    },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "getAllDonations",
    outputs: [
      {
        components: [
          { internalType: "address", name: "donor",     type: "address" },
          { internalType: "uint256", name: "amount",    type: "uint256" },
          { internalType: "uint256", name: "timestamp", type: "uint256" },
        ],
        internalType: "struct Campaign.Donation[]",
        name: "",
        type: "tuple[]",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "getContractBalance",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "_addr", type: "address" }],
    name: "isValidator",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "_addr", type: "address" }],
    name: "isOwner",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "bytes32", name: "role",    type: "bytes32" },
      { internalType: "address", name: "account", type: "address" },
    ],
    name: "hasRole",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    stateMutability: "view",
    type: "function",
  },

  // ─── Events ───────────────────────────────────────────────────────────────
  {
    anonymous: false,
    inputs: [
      { indexed: true,  internalType: "address", name: "donor",    type: "address" },
      { indexed: false, internalType: "uint256", name: "amount",   type: "uint256" },
      { indexed: false, internalType: "uint256", name: "newTotal", type: "uint256" },
    ],
    name: "Donated",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true,  internalType: "uint256", name: "requestId",  type: "uint256" },
      { indexed: true,  internalType: "address", name: "owner",      type: "address" },
      { indexed: false, internalType: "address", name: "beneficiary",type: "address" },
      { indexed: false, internalType: "uint256", name: "amount",     type: "uint256" },
      { indexed: false, internalType: "string",  name: "ipfsCID",    type: "string"  },
    ],
    name: "RequestCreated",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true,  internalType: "uint256", name: "requestId", type: "uint256" },
      { indexed: true,  internalType: "address", name: "validator", type: "address" },
      { indexed: false, internalType: "bool",    name: "approved",  type: "bool"    },
    ],
    name: "Voted",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true,  internalType: "uint256", name: "requestId",  type: "uint256" },
      { indexed: true,  internalType: "address", name: "beneficiary",type: "address" },
      { indexed: false, internalType: "uint256", name: "amount",     type: "uint256" },
    ],
    name: "FundsReleased",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: "uint256", name: "requestId", type: "uint256" },
    ],
    name: "RequestRejected",
    type: "event",
  },

  // ─── Receive ──────────────────────────────────────────────────────────────
  { stateMutability: "payable", type: "receive" },
] as const;