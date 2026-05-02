import { useState, useEffect, useCallback, useRef } from "react";
import { ethers } from "ethers";
import { getReadOnlyContract, getSigningContract } from "../utils/ethers";
import { safeContractCall } from "../utils/gasEstimation";
import styles from "../styles/Donation.module.css";

interface DonationEntry {
  donor:     string;
  amount:    ethers.BigNumber;
  timestamp: ethers.BigNumber;
}

interface DonationProps {
  signer:     ethers.Signer | null;
  provider:   ethers.providers.Web3Provider | null;
  address:    string;
  connected:  boolean;
  onDonated?: () => void;
}

const TARGET_ETH = 100;
const POLL_MS    = 3_000;

export function Donation({ signer, provider, address, connected, onDonated }: DonationProps) {
  const [amountInput,     setAmountInput]     = useState("");
  const [totalDonated,    setTotalDonated]     = useState(ethers.constants.Zero);
  const [contractBalance, setContractBalance]  = useState(ethers.constants.Zero);
  const [donations,       setDonations]        = useState<DonationEntry[]>([]);
  const [loading,         setLoading]          = useState(false);
  const [refreshing,      setRefreshing]       = useState(false);
  const [error,           setError]            = useState("");
  const [txHash,          setTxHash]           = useState("");
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const loadState = useCallback(async (silent = true) => {
    if (!silent) setRefreshing(true);
    try {
      const contract     = getReadOnlyContract();
      const [total, balance, allDonations] = await Promise.all([
        contract.totalDonated()      as Promise<ethers.BigNumber>,
        contract.getContractBalance() as Promise<ethers.BigNumber>,
        contract.getAllDonations()    as Promise<DonationEntry[]>,
      ]);
      if (!mountedRef.current) return;
      setTotalDonated(total);
      setContractBalance(balance);
      setDonations([...allDonations].reverse());
    } catch (err) {
      console.warn("loadState failed:", err);
    } finally {
      if (!mountedRef.current) return;
      if (!silent) setRefreshing(false);
    }
  }, []);

  // Initial load + poll every 3 seconds
  useEffect(() => {
    loadState(false);
    const id = setInterval(() => loadState(true), POLL_MS);
    return () => clearInterval(id);
  }, [loadState]);

  const progressPct = Math.min(
    100,
    Math.floor(
      (parseFloat(ethers.utils.formatEther(totalDonated)) / TARGET_ETH) * 100
    )
  );

  async function handleDonate() {
    if (!connected || !signer || !provider) {
      setError("Connect wallet first.");
      return;
    }
    const parsed = parseFloat(amountInput);
    if (isNaN(parsed) || parsed <= 0) {
      setError("Enter a valid amount greater than 0.");
      return;
    }
    setError("");
    setTxHash("");
    setLoading(true);
    try {
      const value    = ethers.utils.parseEther(amountInput);
      const contract = getSigningContract(signer);
      const receipt  = await safeContractCall(
        contract, provider, address, "donate", [], { value }
      );
      setTxHash(receipt.transactionHash);
      setAmountInput("");
      // Wait one block then reload so the node has indexed the tx
      await new Promise((r) => setTimeout(r, 1000));
      await loadState(false);
      onDonated?.();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  const shortAddr = (addr: string) => `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  const fmtDate   = (ts: ethers.BigNumber) =>
    new Date(ts.toNumber() * 1000).toLocaleString();

  return (
    <section className={styles.section}>
      {/* ── Progress bar ─────────────────────────────────────────────── */}
      <div className={styles.progressBlock}>
        <div className={styles.progressHeader}>
          <h2 className={styles.campaignTitle}>Vietnam Disaster Relief Fund</h2>
          <div className={styles.progressHeaderRight}>
            <span className={styles.progressLabel}>
              {parseFloat(ethers.utils.formatEther(totalDonated)).toFixed(4)} ETH raised of {TARGET_ETH} ETH
            </span>
            <button
              className={styles.refreshSmall}
              onClick={() => loadState(false)}
              disabled={refreshing}
              type="button"
              title="Refresh donation data"
            >
              {refreshing ? "↻" : "↻ Refresh"}
            </button>
          </div>
        </div>
        <div className={styles.progressBar}
             role="progressbar"
             aria-valuenow={progressPct}
             aria-valuemin={0}
             aria-valuemax={100}>
          <div className={styles.progressFill} style={{ width: `${progressPct}%` }} />
        </div>
        <div className={styles.progressStats}>
          <span>{progressPct}% funded</span>
          <span>Contract holds: {parseFloat(ethers.utils.formatEther(contractBalance)).toFixed(4)} ETH</span>
          <span>{donations.length} donation{donations.length !== 1 ? "s" : ""}</span>
        </div>
      </div>

      {/* ── Donation form ─────────────────────────────────────────────── */}
      <div className={styles.formBlock}>
        <h3 className={styles.formTitle}>Donate ETH</h3>
        <div className={styles.inputRow}>
          <input
            type="number"
            min="0.001"
            step="0.001"
            placeholder="0.5"
            value={amountInput}
            onChange={(e) => setAmountInput(e.target.value)}
            disabled={loading || !connected}
            className={styles.amountInput}
            aria-label="Donation amount in ETH"
          />
          <span className={styles.currencyLabel}>ETH</span>
        </div>
        <div className={styles.quickFill}>
          {["0.5", "1", "5", "10"].map((v) => (
            <button
              key={v}
              className={styles.quickBtn}
              onClick={() => setAmountInput(v)}
              disabled={loading || !connected}
              type="button"
            >
              {v} ETH
            </button>
          ))}
        </div>
        <button
          className={styles.donateBtn}
          onClick={handleDonate}
          disabled={loading || !connected || !amountInput}
          type="button"
        >
          {loading
            ? <span className={styles.btnSpinner} aria-label="Processing" />
            : "Donate Now"}
        </button>
        {!connected && (
          <p className={styles.connectHint}>Connect wallet above to donate.</p>
        )}
        {error && (
          <div className={styles.errorMsg} role="alert">
            <strong>Error:</strong> {error}
          </div>
        )}
        {txHash && (
          <div className={styles.successMsg}>
            Transaction confirmed.{" "}
            <span className={styles.txHash}>TX: {shortAddr(txHash)}</span>
          </div>
        )}
      </div>

      {/* ── Donation history ──────────────────────────────────────────── */}
      <div className={styles.historyBlock}>
        <h3 className={styles.historyTitle}>
          Donation History
          {donations.length > 0 && (
            <span className={styles.historyCount}> ({donations.length})</span>
          )}
        </h3>
        {donations.length === 0 ? (
          <p className={styles.emptyMsg}>No donations yet. Be the first to contribute.</p>
        ) : (
          <div className={styles.tableWrapper}>
            <table className={styles.donationTable}>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Donor</th>
                  <th>Amount (ETH)</th>
                  <th>Time</th>
                </tr>
              </thead>
              <tbody>
                {donations.map((d, i) => (
                  <tr
                    key={i}
                    className={
                      address && d.donor.toLowerCase() === address.toLowerCase()
                        ? styles.ownRow
                        : ""
                    }
                  >
                    <td>{donations.length - i}</td>
                    <td>
                      <code>{shortAddr(d.donor)}</code>
                      {address && d.donor.toLowerCase() === address.toLowerCase() && (
                        <span className={styles.youBadge}> (you)</span>
                      )}
                    </td>
                    <td>{parseFloat(ethers.utils.formatEther(d.amount)).toFixed(4)}</td>
                    <td>{fmtDate(d.timestamp)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}