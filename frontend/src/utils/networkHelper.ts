import { CHAIN_ID, RPC_URL } from "./ethers";

export type NetworkStatus =
  | "correct"
  | "wrong_network"
  | "no_wallet"
  | "unknown";

/**
 * Returns the current chainId from window.ethereum.
 * Returns null if no provider present.
 */
export async function getCurrentChainId(): Promise<number | null> {
  if (!window.ethereum) return null;
  try {
    const hex = (await window.ethereum.request({
      method: "eth_chainId",
    })) as string;
    return parseInt(hex, 16);
  } catch {
    return null;
  }
}

/**
 * Checks whether the connected wallet is on the expected chain.
 */
export async function checkNetwork(): Promise<NetworkStatus> {
  if (!window.ethereum) return "no_wallet";
  const current = await getCurrentChainId();
  if (current === null) return "unknown";
  return current === CHAIN_ID ? "correct" : "wrong_network";
}

/**
 * Returns a human-readable label for common chain IDs.
 */
export function chainLabel(chainId: number): string {
  const known: Record<number, string> = {
    1:     "Ethereum Mainnet",
    5:     "Goerli Testnet",
    11155111: "Sepolia Testnet",
    31337: "Hardhat Local (31337)",
    80002: "Polygon Amoy Testnet",
    137:   "Polygon Mainnet",
  };
  return known[chainId] ?? `Chain ${chainId}`;
}

/**
 * Returns the expected chain's human-readable label based on VITE_CHAIN_ID.
 */
export function expectedChainLabel(): string {
  return chainLabel(CHAIN_ID);
}

/**
 * MetaMask manual network configuration instructions for local Hardhat.
 * Displayed to the user when they need to add the network manually.
 */
export const LOCAL_NETWORK_CONFIG = {
  networkName:    "Hardhat Local",
  rpcUrl:         RPC_URL,
  chainId:        CHAIN_ID,
  currencySymbol: "ETH",
  blockExplorer:  "",
} as const;
