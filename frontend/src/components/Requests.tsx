import { useState, useEffect, useCallback } from "react";
import { ethers } from "ethers";
import { getReadOnlyContract, getSigningContract } from "../utils/ethers";
import { safeContractCall } from "../utils/gasEstimation";
import { cidToGatewayUrl } from "../utils/pinata";
import styles from "../styles/Requests.module.css";

interface RequestData {
  id:            number;
  description:   string;
  beneficiary:   string;
  amount:        ethers.BigNumber;
  ipfsCID:       string;
  approvalCount: number;
  rejectCount:   number;
  executed:      boolean;
  rejected:      boolean;
}

interface RequestsProps {
  signer:    ethers.Signer | null;
  provider:  ethers.providers.Web3Provider | null;
  address:   string;
  connected: boolean;
  isOwner:   boolean;
}

export function Requests({ signer, provider, address, connected, isOwner }: RequestsProps) {
  const [requests,     setRequests]     = useState<RequestData[]>([]);
  const [loadingIds,   setLoadingIds]   = useState<Set<number>>(new Set());
  const [errorMap,     setErrorMap]     = useState<Record<number, string>>({});
  const [successMap,   setSuccessMap]   = useState<Record<number, string>>({});
  const [fetching,     setFetching]     = useState(false);

  const loadRequests = useCallback(async () => {
    setFetching(true);
    try {
      const contract = getReadOnlyContract();
      const count    = (await contract.getRequestsCount() as ethers.BigNumber).toNumber();
      const list: RequestData[] = [];

      for (let i = 0; i < count; i++) {
        const [desc, ben, amount, cid, approvals, rejects, executed, rejected] =
          await contract.getRequestInfo(i) as [string, string, ethers.BigNumber, string,
            ethers.BigNumber, ethers.BigNumber, boolean, boolean];
        list.push({
          id:            i,
          description:   desc,
          beneficiary:   ben,
          amount,
          ipfsCID:       cid,
          approvalCount: approvals.toNumber(),
          rejectCount:   rejects.toNumber(),
          executed,
          rejected,
        });
      }
      setRequests(list);
    } catch (err) {
      console.warn("loadRequests failed:", err);
    } finally {
      setFetching(false);
    }
  }, []);

  useEffect(() => {
    loadRequests();
    const interval = setInterval(loadRequests, 10_000);
    return () => clearInterval(interval);
  }, [loadRequests]);

  async function handleRelease(requestId: number) {
    if (!connected || !signer || !provider) {
      setErrorMap((prev) => ({ ...prev, [requestId]: "Connect wallet first." }));
      return;
    }

    setLoadingIds((prev) => new Set([...prev, requestId]));
    setErrorMap((prev) => { const n = { ...prev }; delete n[requestId]; return n; });
    setSuccessMap((prev) => { const n = { ...prev }; delete n[requestId]; return n; });

    try {
      const contract = getSigningContract(signer);
      const receipt  = await safeContractCall(
        contract, provider, address, "releaseFunds", [requestId], {}
      );
      setSuccessMap((prev) => ({
        ...prev,
        [requestId]: `Released. TX: ${receipt.transactionHash.slice(0, 10)}...`,
      }));
      await loadRequests();
    } catch (err: unknown) {
      setErrorMap((prev) => ({
        ...prev,
        [requestId]: err instanceof Error ? err.message : String(err),
      }));
    } finally {
      setLoadingIds((prev) => {
        const n = new Set(prev); n.delete(requestId); return n;
      });
    }
  }

  function statusLabel(req: RequestData): { text: string; cls: string } {
    if (req.executed) return { text: "Executed",                cls: styles.statusExecuted };
    if (req.rejected) return { text: "Rejected",                cls: styles.statusRejected };
    if (req.approvalCount >= 2) return { text: "Ready to Release", cls: styles.statusReady   };
    return { text: "Pending Votes",                             cls: styles.statusPending };
  }

  function shortAddress(addr: string): string {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  }

  return (
    <section className={styles.section}>
      <div className={styles.header}>
        <h2 className={styles.title}>Spending Requests</h2>
        {fetching && <span className={styles.fetchingBadge}>Refreshing...</span>}
      </div>

      {requests.length === 0 && !fetching && (
        <div className={styles.emptyState}>
          <p>No spending requests submitted yet.</p>
          {isOwner && <p>Submit a request via the Owner Panel below.</p>}
        </div>
      )}

      <div className={styles.requestList}>
        {requests.map((req) => {
          const { text: statusText, cls: statusCls } = statusLabel(req);
          const isLoading = loadingIds.has(req.id);
          const canRelease = !req.executed && !req.rejected && req.approvalCount >= 2 && connected;

          return (
            <div key={req.id} className={styles.requestCard}>
              <div className={styles.cardHeader}>
                <span className={styles.requestId}>Request #{req.id}</span>
                <span className={`${styles.statusBadge} ${statusCls}`}>{statusText}</span>
              </div>

              <p className={styles.description}>{req.description}</p>

              <div className={styles.cardMeta}>
                <div className={styles.metaRow}>
                  <span className={styles.metaLabel}>Beneficiary:</span>
                  <code className={styles.metaValue}>{shortAddress(req.beneficiary)}</code>
                </div>
                <div className={styles.metaRow}>
                  <span className={styles.metaLabel}>Amount:</span>
                  <span className={styles.metaValue}>
                    {ethers.utils.formatEther(req.amount)} ETH
                  </span>
                </div>
                <div className={styles.metaRow}>
                  <span className={styles.metaLabel}>Evidence (IPFS):</span>
                  {req.ipfsCID ? (
                    <a
                      href={cidToGatewayUrl(req.ipfsCID)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={styles.cidLink}
                    >
                      {req.ipfsCID.slice(0, 20)}... ↗
                    </a>
                  ) : (
                    <span className={styles.noCid}>No CID</span>
                  )}
                </div>
              </div>

              {/* Approval progress */}
              <div className={styles.voteBar}>
                <div className={styles.voteLabel}>
                  Approvals: {req.approvalCount}/3
                  {req.rejectCount > 0 && ` — Rejections: ${req.rejectCount}/3`}
                </div>
                <div className={styles.voteTrack}>
                  <div
                    className={styles.voteFillApprove}
                    style={{ width: `${(req.approvalCount / 3) * 100}%` }}
                  />
                </div>
              </div>

              {canRelease && (
                <button
                  className={styles.releaseBtn}
                  onClick={() => handleRelease(req.id)}
                  disabled={isLoading}
                  type="button"
                >
                  {isLoading ? (
                    <span className={styles.btnSpinner} aria-label="Processing" />
                  ) : (
                    "Release Funds"
                  )}
                </button>
              )}

              {errorMap[req.id] && (
                <div className={styles.cardError} role="alert">
                  {errorMap[req.id]}
                </div>
              )}
              {successMap[req.id] && (
                <div className={styles.cardSuccess}>
                  {successMap[req.id]}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
