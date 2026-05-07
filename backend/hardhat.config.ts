import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "hardhat-gas-reporter";
import * as dotenv from "dotenv";

dotenv.config();

const POLYGON_AMOY_RPC = process.env.POLYGON_AMOY_RPC ?? "";
const DEPLOYER_PRIVATE_KEY = process.env.DEPLOYER_PRIVATE_KEY ?? "";

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
      viaIR: true,
    },
  },

  networks: {
    // Primary: local Hardhat node. No faucet required.
    hardhat: {
      chainId: 31337,
      gas: 12_000_000,
      blockGasLimit: 12_000_000,
      allowUnlimitedContractSize: true,
      // Deterministic accounts for reproducible frontend .env values.
      accounts: {
        count: 20,
        initialBalance: "10000000000000000000000", // 10,000 ETH per account
      },
    },

    localhost: {
      url: "http://127.0.0.1:8545",
      chainId: 31337,
      gas: 12_000_000,
    },

    // Optional: Polygon Amoy testnet. Only use if reliable faucet available.
    amoy: {
      url: POLYGON_AMOY_RPC || "https://rpc-amoy.polygon.technology",
      chainId: 80002,
      accounts: DEPLOYER_PRIVATE_KEY ? [DEPLOYER_PRIVATE_KEY] : [],
      gas: 5_000_000,
      gasPrice: 35_000_000_000, // 35 gwei
    },
  },

  gasReporter: {
    enabled: process.env.REPORT_GAS === "true",
    currency: "USD",
    outputFile: "gas-report.txt",
    noColors: true,
    coinmarketcap: process.env.COINMARKETCAP_API_KEY ?? "",
  },

  typechain: {
    outDir: "typechain-types",
    target: "ethers-v5",
  },

  paths: {
    sources: "./contracts",
    tests:   "./test",
    cache:   "./cache",
    artifacts: "./artifacts",
  },
};

export default config;
