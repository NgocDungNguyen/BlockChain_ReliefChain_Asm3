import { useState, useEffect, useCallback } from "react";
import { ethers } from "ethers";
import {
  connectWallet,
  subscribeToWalletEvents,
  unsubscribeWalletEvents,
  switchToLocalNetwork,
  getReadOnlyContract,
  setActiveContractAddress,
  getActiveContractAddress,
  fetchAllCampaigns,
  checkIsGlobalValidator,
  getValidatorStake,
  CHAIN_ID,
  FACTORY_ADDRESS,
  type CampaignRecord,
} from "./utils/ethers";
import {
  checkNetwork,
  chainLabel,
  expectedChainLabel,
  LOCAL_NETWORK_CONFIG,
} from "./utils/networkHelper";
import { Donation }           from "./components/Donation";
import { Requests }           from "./components/Requests";
import { ValidatorDashboard } from "./components/ValidatorDashboard";
import { ProposalDashboard }  from "./components/ProposalDashboard";
import styles                  from "./styles/App.module.css";

type Tab = "donate" | "requests" | "dashboard" | "proposals";

export default function App() {
  const [provider,     setProvider]     = useState<ethers.providers.Web3Provider | null>(null);
  const [signer,       setSigner]       = useState<ethers.Signer | null>(null);
  const [address,      setAddress]      = useState<string>("");
  const [chainId,      setChainId]      = useState<number | null>(null);
  const [connected,    setConnected]    = useState(false);
  const [connecting,   setConnecting]   = useState(false);
  const [networkError, setNetworkError] = useState<string>("");
  const [isValidator,        setIsValidator]        = useState(false);
  const [isOwner,            setIsOwner]            = useState(false);
  const [isGlobalValidator,  setIsGlobalValidator]  = useState(false);
  const [myValidatorStake,   setMyValidatorStake]   = useState<ethers.BigNumber>(ethers.BigNumber.from(0));
  const [activeTab,          setActiveTab]          = useState<Tab>("donate");

  // ─── Multi-campaign state ────────────────────────────────────────────────
  const [campaigns,         setCampaigns]         = useState<CampaignRecord[]>([]);
  const [selectedCampaign,  setSelectedCampaign]  = useState<string>(getActiveContractAddress());
  const [campaignInfo,      setCampaignInfo]       = useState<{ name: string; threshold: number; validatorCount: number } | null>(null);
  const [loadingCampaigns,  setLoadingCampaigns]  = useState(false);

  // React key: when this changes, all child components remount and
  // pick up the new _activeContractAddress from ethers.ts.
  const [mountKey, setMountKey] = useState(0);

  // ─── Load campaigns from factory ─────────────────────────────────────────
  const loadCampaigns = useCallback(async () => {
    if (!FACTORY_ADDRESS) return;
    setLoadingCampaigns(true);
    try {
      const all = await fetchAllCampaigns();
      setCampaigns(all);
    } finally {
      setLoadingCampaigns(false);
    }
  }, []);

  useEffect(() => {
    loadCampaigns();
  }, [loadCampaigns]);

  // ─── Load current campaign metadata ──────────────────────────────────────
  const loadCampaignInfo = useCallback(async () => {
    if (!selectedCampaign) return;
    try {
      const contract = getReadOnlyContract();
      const [name, threshold, validatorCount] = await Promise.all([
        contract.campaignName()   as Promise<string>,
        contract.threshold()      as Promise<ethers.BigNumber>,
        contract.validatorCount() as Promise<ethers.BigNumber>,
      ]);
      setCampaignInfo({
        name,
        threshold:      threshold.toNumber(),
        validatorCount: validatorCount.toNumber(),
      });
    } catch {
      setCampaignInfo(null);
    }
  }, [selectedCampaign]);

  useEffect(() => {
    loadCampaignInfo();
  }, [loadCampaignInfo]);

  // ─── Role detection ───────────────────────────────────────────────────────
  const checkRoles = useCallback(async (addr: string) => {
    try {
      const contract = getReadOnlyContract();
      const [val, own] = await Promise.all([
        contract.isValidator(addr) as Promise<boolean>,
        contract.isOwner(addr)     as Promise<boolean>,
      ]);
      setIsValidator(val);
      setIsOwner(own);
    } catch {
      setIsValidator(false);
      setIsOwner(false);
    }
  }, []);

  const checkGlobalRole = useCallback(async (addr: string) => {
    try {
      const [isGV, stake] = await Promise.all([
        checkIsGlobalValidator(addr),
        getValidatorStake(addr),
      ]);
      setIsGlobalValidator(isGV);
      setMyValidatorStake(stake);
    } catch {
      setIsGlobalValidator(false);
      setMyValidatorStake(ethers.BigNumber.from(0));
    }
  }, []);

  // ─── Campaign switching ───────────────────────────────────────────────────
  function handleSelectCampaign(addr: string) {
    if (addr === selectedCampaign) return;
    setActiveContractAddress(addr);
    setSelectedCampaign(addr);
    setMountKey((k) => k + 1); // force child remount
    setCampaignInfo(null);
    if (address) checkRoles(address);
  }

  // ─── Wallet connection ────────────────────────────────────────────────────
  async function handleConnect() {
    setConnecting(true);
    setNetworkError("");

    const wallet = await connectWallet();
    if (!wallet) {
      setConnecting(false);
      return;
    }

    const netStatus = await checkNetwork();
    if (netStatus === "wrong_network") {
      setNetworkError(
        `Wrong network. MetaMask is on ${chainLabel(wallet.chainId)}. Switch to ${expectedChainLabel()}.`
      );
      setChainId(wallet.chainId);
      setConnecting(false);
      return;
    }

    setProvider(wallet.provider);
    setSigner(wallet.signer);
    setAddress(wallet.address);
    setChainId(wallet.chainId);
    setConnected(true);
    setNetworkError("");
    await Promise.all([checkRoles(wallet.address), checkGlobalRole(wallet.address)]);
    setConnecting(false);
  }

  async function handleSwitchNetwork() {
    try {
      await switchToLocalNetwork();
      setNetworkError("");
      await handleConnect();
    } catch (err: unknown) {
      setNetworkError(
        `Network switch failed: ${err instanceof Error ? err.message : String(err)}`
      );
    }
  }

  function handleDisconnect() {
    setProvider(null);
    setSigner(null);
    setAddress("");
    setChainId(null);
    setConnected(false);
    setIsValidator(false);
    setIsOwner(false);
    setIsGlobalValidator(false);
    setMyValidatorStake(ethers.BigNumber.from(0));
    setNetworkError("");
  }

  // ─── Wallet event subscriptions ───────────────────────────────────────────
  useEffect(() => {
    function onAccountChange(accounts: string[]) {
      if (accounts.length === 0) {
        handleDisconnect();
      } else {
        setAddress(accounts[0]);
        checkRoles(accounts[0]);
        checkGlobalRole(accounts[0]);
      }
    }

    function onChainChange(hexChainId: string) {
      const newId = parseInt(hexChainId, 16);
      setChainId(newId);
      if (newId !== CHAIN_ID) {
        setNetworkError(
          `Network changed to ${chainLabel(newId)}. Switch back to ${expectedChainLabel()}.`
        );
        setConnected(false);
      } else {
        setNetworkError("");
        setConnected(true);
      }
    }

    subscribeToWalletEvents(onAccountChange, onChainChange);
    return () => unsubscribeWalletEvents(onAccountChange, onChainChange);
  }, [checkRoles, checkGlobalRole]);

  function shortAddress(addr: string): string {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  }

  return (
    <div className={styles.app}>
      {/* ── Header ───────────────────────────────────────────────────────── */}
      <header className={styles.header}>
        <div className={styles.bannerOverlay}>
          <div className={styles.bannerContent}>
            <div className={styles.logoRow}>
              <span className={styles.logo} aria-hidden="true">⛑</span>
              <span className={styles.logoText}>ReliefChain</span>
            </div>
            <h1 className={styles.bannerTitle}>
              Transparent Disaster Relief Funding
            </h1>
            <p className={styles.bannerSubtitle}>
              On-chain donation tracking · Configurable validator governance ·
              Immutable audit trail · Multiple independent campaigns
            </p>
          </div>
        </div>
      </header>

      {/* ── Campaign selector ─────────────────────────────────────────────── */}
      {campaigns.length > 0 && (
        <div className={styles.campaignBar}>
          <div className={styles.campaignBarInner}>
            <span className={styles.campaignLabel}>Active Campaign:</span>
            <select
              className={styles.campaignSelect}
              value={selectedCampaign}
              onChange={(e) => handleSelectCampaign(e.target.value)}
            >
              {campaigns.map((c) => (
                <option key={c.campaignAddress} value={c.campaignAddress}>
                  {c.name} — {c.threshold}/{c.validatorCount} multisig
                </option>
              ))}
            </select>
            {campaignInfo && (
              <span className={styles.campaignMeta}>
                Threshold: {campaignInfo.threshold} of {campaignInfo.validatorCount} validators
              </span>
            )}
            <button
              className={styles.refreshBtn}
              onClick={loadCampaigns}
              disabled={loadingCampaigns}
              type="button"
            >
              {loadingCampaigns ? "Loading..." : "Refresh"}
            </button>
          </div>
        </div>
      )}

      {/* ── Wallet bar ────────────────────────────────────────────────────── */}
      <div className={styles.walletBar}>
        <div className={styles.walletBarInner}>
          {connected ? (
            <div className={styles.connectedRow}>
              <span className={styles.connectedDot} aria-hidden="true" />
              <span className={styles.connectedAddr}>{shortAddress(address)}</span>
              {isOwner            && <span className={styles.roleBadge + " " + styles.ownerBadge}>Owner</span>}
              {isValidator        && <span className={styles.roleBadge + " " + styles.validatorBadge}>Validator</span>}
              {isGlobalValidator  && <span className={styles.roleBadge + " " + styles.globalValidatorBadge}>Global Validator</span>}
              <span className={styles.chainBadge}>{chainLabel(chainId ?? CHAIN_ID)}</span>
              <button className={styles.disconnectBtn} onClick={handleDisconnect} type="button">
                Disconnect
              </button>
            </div>
          ) : (
            <button
              className={styles.connectBtn}
              onClick={handleConnect}
              disabled={connecting}
              type="button"
            >
              {connecting ? "Connecting..." : "Connect MetaMask"}
            </button>
          )}
        </div>
      </div>

      {/* ── Network error banner ──────────────────────────────────────────── */}
      {networkError && (
        <div className={styles.networkError} role="alert">
          <span className={styles.networkErrorIcon}>⚠</span>
          <div className={styles.networkErrorBody}>
            <strong>{networkError}</strong>
            <div className={styles.networkHelp}>
              <button
                className={styles.switchNetBtn}
                onClick={handleSwitchNetwork}
                type="button"
              >
                Switch Network Automatically
              </button>
              <span className={styles.orText}>or add manually in MetaMask:</span>
              <div className={styles.networkConfig}>
                <div>Network name: <code>{LOCAL_NETWORK_CONFIG.networkName}</code></div>
                <div>RPC URL: <code>{LOCAL_NETWORK_CONFIG.rpcUrl}</code></div>
                <div>Chain ID: <code>{LOCAL_NETWORK_CONFIG.chainId}</code></div>
                <div>Currency: <code>{LOCAL_NETWORK_CONFIG.currencySymbol}</code></div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Tab navigation ────────────────────────────────────────────────── */}
      <nav className={styles.tabNav} aria-label="Main navigation">
        <button
          className={`${styles.tab} ${activeTab === "donate"    ? styles.tabActive : ""}`}
          onClick={() => setActiveTab("donate")}
          type="button"
        >
          Donate
        </button>
        <button
          className={`${styles.tab} ${activeTab === "requests"  ? styles.tabActive : ""}`}
          onClick={() => setActiveTab("requests")}
          type="button"
        >
          Requests
        </button>
        {(isOwner || isValidator) && (
          <button
            className={`${styles.tab} ${activeTab === "dashboard" ? styles.tabActive : ""}`}
            onClick={() => setActiveTab("dashboard")}
            type="button"
          >
            {isOwner && isValidator
              ? "Owner / Validator"
              : isOwner
              ? "Owner Panel"
              : "Validator Panel"}
          </button>
        )}
        {connected && (
          <button
            className={`${styles.tab} ${activeTab === "proposals" ? styles.tabActive : ""}`}
            onClick={() => setActiveTab("proposals")}
            type="button"
          >
            {isGlobalValidator ? "Proposals (Vote)" : "Proposals"}
          </button>
        )}
      </nav>

      {/* ── Content ───────────────────────────────────────────────────────── */}
      <main className={styles.main}>
        {/*
          mountKey changes when the user switches campaigns.
          React unmounts and remounts these components, causing them to
          call getReadOnlyContract() fresh with the updated active address.
        */}
        {activeTab === "donate" && (
          <Donation
            key={`donate-${mountKey}`}
            signer={signer}
            provider={provider}
            address={address}
            connected={connected}
          />
        )}
        {activeTab === "requests" && (
          <Requests
            key={`requests-${mountKey}`}
            signer={signer}
            provider={provider}
            address={address}
            connected={connected}
            isOwner={isOwner}
          />
        )}
        {activeTab === "dashboard" && (
          <ValidatorDashboard
            key={`dashboard-${mountKey}`}
            signer={signer}
            provider={provider}
            address={address}
            connected={connected}
            isValidator={isValidator}
            isOwner={isOwner}
          />
        )}
        {activeTab === "proposals" && (
          <ProposalDashboard
            signer={signer}
            provider={provider}
            address={address}
            connected={connected}
            isGlobalValidator={isGlobalValidator}
            myValidatorStake={myValidatorStake}
            onStakeChanged={() => address && checkGlobalRole(address)}
          />
        )}
      </main>

      {/* ── Footer ────────────────────────────────────────────────────────── */}
      <footer className={styles.footer}>
        <p>ReliefChain — INTE2641 Assignment 3 — HN Group 4</p>
        <p>
          {campaignInfo
            ? `Campaign: "${campaignInfo.name}" · ${campaignInfo.threshold}-of-${campaignInfo.validatorCount} multisig`
            : `Chain ${CHAIN_ID} · No real funds`}
        </p>
      </footer>
    </div>
  );
}