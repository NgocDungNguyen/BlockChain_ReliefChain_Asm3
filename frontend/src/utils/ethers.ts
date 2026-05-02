import { ethers } from "ethers";
import { CAMPAIGN_ABI }         from "../contracts/Campaign.abi";
import { CAMPAIGN_FACTORY_ABI } from "../contracts/CampaignFactory.abi";

export const FACTORY_ADDRESS = (import.meta.env.VITE_FACTORY_ADDRESS  as string) ?? "";
export const CHAIN_ID        = parseInt(import.meta.env.VITE_CHAIN_ID ?? "31337", 10);
export const RPC_URL         = (import.meta.env.VITE_RPC_URL as string) ?? "http://127.0.0.1:8545";

// ─── Module-level active campaign address ─────────────────────────────────────
// App.tsx calls setActiveContractAddress() when the user switches campaigns.
// Child components call getReadOnlyContract() / getSigningContract() without
// knowing the address — they always get the currently selected campaign.
// Changing this + remounting child components via React key prop is sufficient.

let _activeAddress: string = (import.meta.env.VITE_CONTRACT_ADDRESS as string) ?? "";

export function setActiveContractAddress(address: string): void {
  _activeAddress = address;
}

export function getActiveContractAddress(): string {
  return _activeAddress;
}

// Kept for any component that imported CONTRACT_ADDRESS directly
export const CONTRACT_ADDRESS = _activeAddress;

// ─── Wallet types ─────────────────────────────────────────────────────────────
export type WalletState = {
  provider: ethers.providers.Web3Provider;
  signer:   ethers.Signer;
  address:  string;
  chainId:  number;
};

// ─── Wallet connection ────────────────────────────────────────────────────────
export async function connectWallet(): Promise<WalletState | null> {
  if (!window.ethereum) {
    alert("MetaMask not detected. Install MetaMask and reload.");
    return null;
  }
  try {
    const provider = new ethers.providers.Web3Provider(window.ethereum, "any");
    await provider.send("eth_requestAccounts", []);
    const signer  = provider.getSigner();
    const address = await signer.getAddress();
    const network = await provider.getNetwork();
    return { provider, signer, address, chainId: network.chainId };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("4001") || msg.toLowerCase().includes("user rejected")) {
      alert("Connection rejected in MetaMask.");
    } else {
      alert(`Wallet connection failed: ${msg}`);
    }
    return null;
  }
}

// ─── Campaign contract instances ──────────────────────────────────────────────
export function getReadOnlyContract(): ethers.Contract {
  const provider = new ethers.providers.JsonRpcProvider(RPC_URL);
  return new ethers.Contract(_activeAddress, CAMPAIGN_ABI, provider);
}

export function getSigningContract(signer: ethers.Signer): ethers.Contract {
  return new ethers.Contract(_activeAddress, CAMPAIGN_ABI, signer);
}

// ─── Factory contract instances ───────────────────────────────────────────────
export function getReadOnlyFactory(): ethers.Contract {
  const provider = new ethers.providers.JsonRpcProvider(RPC_URL);
  return new ethers.Contract(FACTORY_ADDRESS, CAMPAIGN_FACTORY_ABI, provider);
}

export function getSigningFactory(signer: ethers.Signer): ethers.Contract {
  return new ethers.Contract(FACTORY_ADDRESS, CAMPAIGN_FACTORY_ABI, signer);
}

// ─── Campaign record type ─────────────────────────────────────────────────────
export type CampaignRecord = {
  campaignAddress: string;
  name:            string;
  owner:           string;
  validatorCount:  number;
  threshold:       number;
  targetWei:       ethers.BigNumber;
  createdAt:       ethers.BigNumber;
};

// ─── Fetch all campaigns from factory ────────────────────────────────────────
export async function fetchAllCampaigns(): Promise<CampaignRecord[]> {
  if (!FACTORY_ADDRESS) return [];
  try {
    const factory = getReadOnlyFactory();
    const raw     = await factory.getCampaigns() as CampaignRecord[];
    return raw.map((r) => ({
      campaignAddress: r.campaignAddress,
      name:            r.name,
      owner:           r.owner,
      validatorCount:  Number(r.validatorCount),
      threshold:       Number(r.threshold),
      targetWei:       r.targetWei,
      createdAt:       r.createdAt,
    }));
  } catch {
    return [];
  }
}

// ─── Wallet event subscriptions ───────────────────────────────────────────────
export function subscribeToWalletEvents(
  onAccountChange: (accounts: string[]) => void,
  onChainChange:   (chainId: string)    => void
): void {
  if (!window.ethereum) return;
  window.ethereum.on("accountsChanged", onAccountChange);
  window.ethereum.on("chainChanged",    onChainChange);
}

export function unsubscribeWalletEvents(
  onAccountChange: (accounts: string[]) => void,
  onChainChange:   (chainId: string)    => void
): void {
  if (!window.ethereum) return;
  window.ethereum.removeListener("accountsChanged", onAccountChange);
  window.ethereum.removeListener("chainChanged",    onChainChange);
}

// ─── Network switching ────────────────────────────────────────────────────────
export async function switchToLocalNetwork(): Promise<void> {
  if (!window.ethereum) return;
  const chainHex = "0x" + CHAIN_ID.toString(16);
  try {
    await window.ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: chainHex }],
    });
  } catch (switchErr: unknown) {
    const code = (switchErr as { code?: number }).code;
    if (code === 4902) {
      await window.ethereum.request({
        method: "wallet_addEthereumChain",
        params: [{
          chainId:        chainHex,
          chainName:      "Hardhat Local",
          rpcUrls:        [RPC_URL],
          nativeCurrency: { name: "ETH", symbol: "ETH", decimals: 18 },
        }],
      });
    } else {
      throw switchErr;
    }
  }
}