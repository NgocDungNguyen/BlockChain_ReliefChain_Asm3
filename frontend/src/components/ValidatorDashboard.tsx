import { useState, useEffect, useCallback } from "react";
import { ethers } from "ethers";
import { getReadOnlyContract, getSigningContract } from "../utils/ethers";
import { safeContractCall } from "../utils/gasEstimation";
import { IPFSUpload } from "./IPFSUpload";
import type { PinataUploadResult } from "../utils/pinata";
import styles from "../styles/ValidatorDashboard.module.css";

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
  hasVoted:      boolean;
}

interface ValidatorDashboardProps {
  signer:      ethers.Signer | null;
  provider:    ethers.providers.Web3Provider | null;
  address:     string;
  connected:   boolean;
  isValidator: boolean;
  isOwner:     boolean;
}

export function ValidatorDashboard({
  signer, provider, address, connected, isValidator, isOwner,
}: ValidatorDashboardProps) {
  // ── Requests state ────────────────────────────────────────────────────────
  const [requests,     setRequests]     = useState<RequestData[]>([]);
  const [fetching,     setFetching]     = useState(false);
  const [voteLoadIds,  setVoteLoadIds]  = useState<Set<number>>(new Set());
  const [voteErrors,   setVoteErrors]   = useState<Record<number, string>>({});
  const [voteSuccess,  setVoteSuccess]  = useState<Record<number, string>>({});

  // ── New request form (owner only) ─────────────────────────────────────────
  const [reqDescription, setReqDescription] = useState("");
  const [reqBeneficiary, setReqBeneficiary] = useState("");
  const [reqAmountEth,   setReqAmountEth]   = useState("");
  const [uploadedCID,    setUploadedCID]    = useState<string>("");
  const [formLoading,    setFormLoading]    = useState(false);
  const [formError,      setFormError]      = useState("");
  const [formSuccess,    setFormSuccess]    = useState("");

  const loadRequests = useCallback(async () => {
    if (!address) return;
    setFetching(true);
    try {
      const contract = getReadOnlyContract();
      const count    = (await contract.getRequestsCount() as ethers.BigNumber).toNumber();
      const list: RequestData[] = [];

      for (let i = 0; i < count; i++) {
        const [desc, ben, amount, cid, approvals, rejects, executed, rejected] =
          await contract.getRequestInfo(i) as [
            string, string, ethers.BigNumber, string,
            ethers.BigNumber, ethers.BigNumber, boolean, boolean
          ];

        let hasVoted = false;
        if (isValidator && address) {
          hasVoted = await contract.hasVoted(i, address) as boolean;
        }

        list.push({
          id: i,
          description: desc,
          beneficiary: ben,
          amount,
          ipfsCID: cid,
          approvalCount: approvals.toNumber(),
          rejectCount:   rejects.toNumber(),
          executed,
          rejected,
          hasVoted,
        });
      }
      setRequests(list);
    } catch (err) {
      console.warn("ValidatorDashboard.loadRequests:", err);
    } finally {
      setFetching(false);
    }
  }, [address, isValidator]);

  useEffect(() => {
    loadRequests();
    const interval = setInterval(loadRequests, 8_000);
    return () => clearInterval(interval);
  }, [loadRequests]);

  // ── Voting ────────────────────────────────────────────────────────────────
  async function handleVote(requestId: number, approve: boolean) {
    if (!connected || !signer || !provider) return;

    setVoteLoadIds((p) => new Set([...p, requestId]));
    setVoteErrors((p)  => { const n = { ...p }; delete n[requestId]; return n; });
    setVoteSuccess((p) => { const n = { ...p }; delete n[requestId]; return n; });

    try {
      const contract = getSigningContract(signer);
      await safeContractCall(
        contract, provider, address, "vote", [requestId, approve], {}
      );
      setVoteSuccess((p) => ({
        ...p,
        [requestId]: approve ? "Vote: Approved" : "Vote: Rejected",
      }));
      await loadRequests();
    } catch (err: unknown) {
      setVoteErrors((p) => ({
        ...p,
        [requestId]: err instanceof Error ? err.message : String(err),
      }));
    } finally {
      setVoteLoadIds((p) => {
        const n = new Set(p); n.delete(requestId); return n;
      });
    }
  }

  // ── Owner: create request ─────────────────────────────────────────────────
  function handleUploadComplete(result: PinataUploadResult) {
    setUploadedCID(result.cid);
  }

  async function handleCreateRequest() {
    if (!connected || !signer || !provider) {
      setFormError("Connect wallet first.");
      return;
    }
    if (!reqDescription.trim()) { setFormError("Description required."); return; }
    if (!ethers.utils.isAddress(reqBeneficiary)) { setFormError("Invalid beneficiary address."); return; }
    if (!reqAmountEth || parseFloat(reqAmountEth) <= 0) { setFormError("Invalid amount."); return; }
    if (!uploadedCID) { setFormError("Upload evidence to IPFS first."); return; }

    setFormLoading(true);
    setFormError("");
    setFormSuccess("");

    try {
      const contract = getSigningContract(signer);
      const amount   = ethers.utils.parseEther(reqAmountEth);

      await safeContractCall(
        contract,
        provider,
        address,
        "createRequest",
        [reqDescription.trim(), reqBeneficiary, amount, uploadedCID],
        {}
      );

      setFormSuccess("Request submitted on-chain.");
      setReqDescription("");
      setReqBeneficiary("");
      setReqAmountEth("");
      setUploadedCID("");
      await loadRequests();
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : String(err));
    } finally {
      setFormLoading(false);
    }
  }

  function shortAddress(addr: string): string {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  }

  function voteStatusClass(req: RequestData): string {
    if (req.executed) return styles.stateExecuted;
    if (req.rejected) return styles.stateRejected;
    if (req.approvalCount >= 2) return styles.stateReady;
    return styles.statePending;
  }

  const pendingRequests  = requests.filter((r) => !r.executed && !r.rejected);
  const finalisedRequests = requests.filter((r) => r.executed || r.rejected);

  return (
    <div className={styles.dashboardGrid}>
      {/* ── Owner panel: submit request ─────────────────────────────────── */}
      {isOwner && (
        <section className={styles.ownerPanel}>
          <h2 className={styles.panelTitle}>Owner Panel — Submit Request</h2>

          <div className={styles.formGroup}>
            <label className={styles.label} htmlFor="req-desc">Description</label>
            <textarea
              id="req-desc"
              className={styles.textarea}
              placeholder="Emergency food supplies for flood victims..."
              value={reqDescription}
              onChange={(e) => setReqDescription(e.target.value)}
              disabled={formLoading}
              rows={3}
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label} htmlFor="req-ben">Beneficiary Address</label>
            <input
              id="req-ben"
              type="text"
              className={styles.input}
              placeholder="0x..."
              value={reqBeneficiary}
              onChange={(e) => setReqBeneficiary(e.target.value)}
              disabled={formLoading}
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label} htmlFor="req-amount">Amount (ETH)</label>
            <input
              id="req-amount"
              type="number"
              min="0.001"
              step="0.001"
              className={styles.input}
              placeholder="0.5"
              value={reqAmountEth}
              onChange={(e) => setReqAmountEth(e.target.value)}
              disabled={formLoading}
            />
          </div>

          <IPFSUpload
            onUploadComplete={handleUploadComplete}
            disabled={formLoading || !connected}
          />

          {uploadedCID && (
            <div className={styles.cidPreview}>
              Evidence CID: <code>{uploadedCID.slice(0, 20)}...</code>
            </div>
          )}

          <button
            className={styles.submitBtn}
            onClick={handleCreateRequest}
            disabled={formLoading || !connected}
            type="button"
          >
            {formLoading ? (
              <span className={styles.btnSpinner} aria-label="Submitting" />
            ) : (
              "Submit Request On-Chain"
            )}
          </button>

          {formError && <div className={styles.formError} role="alert">{formError}</div>}
          {formSuccess && <div className={styles.formSuccess}>{formSuccess}</div>}
        </section>
      )}

      {/* ── Validator panel: vote ────────────────────────────────────────── */}
      {isValidator && (
        <section className={styles.validatorPanel}>
          <h2 className={styles.panelTitle}>Validator Panel</h2>

          {!connected && (
            <div className={styles.notice}>Connect wallet to vote.</div>
          )}

          {fetching && <div className={styles.loadingHint}>Loading requests...</div>}

          {pendingRequests.length === 0 && !fetching && (
            <div className={styles.emptyHint}>No pending requests requiring votes.</div>
          )}

          {pendingRequests.map((req) => {
            const isVoting    = voteLoadIds.has(req.id);
            const canVote     = connected && isValidator && !req.hasVoted && !req.executed && !req.rejected;

            return (
              <div key={req.id} className={`${styles.voteCard} ${voteStatusClass(req)}`}>
                <div className={styles.voteCardHeader}>
                  <span className={styles.voteCardId}>Request #{req.id}</span>
                  <span className={styles.voteApprovals}>
                    ✓ {req.approvalCount} / ✗ {req.rejectCount}
                  </span>
                </div>

                <p className={styles.voteCardDesc}>{req.description}</p>

                <div className={styles.voteCardMeta}>
                  <span>Beneficiary: <code>{shortAddress(req.beneficiary)}</code></span>
                  <span>Amount: {ethers.utils.formatEther(req.amount)} ETH</span>
                </div>

                {req.hasVoted && (
                  <div className={styles.alreadyVoted}>Your vote recorded.</div>
                )}

                {!req.hasVoted && !req.executed && !req.rejected && connected && (
                  <div className={styles.voteButtons}>
                    <button
                      className={styles.approveBtn}
                      onClick={() => handleVote(req.id, true)}
                      disabled={!canVote || isVoting}
                      type="button"
                    >
                      {isVoting ? <span className={styles.btnSpinner} /> : "✓ Approve"}
                    </button>
                    <button
                      className={styles.rejectBtn}
                      onClick={() => handleVote(req.id, false)}
                      disabled={!canVote || isVoting}
                      type="button"
                    >
                      {isVoting ? <span className={styles.btnSpinner} /> : "✗ Reject"}
                    </button>
                  </div>
                )}

                {voteErrors[req.id] && (
                  <div className={styles.voteError} role="alert">{voteErrors[req.id]}</div>
                )}
                {voteSuccess[req.id] && (
                  <div className={styles.voteSuccessMsg}>{voteSuccess[req.id]}</div>
                )}
              </div>
            );
          })}

          {finalisedRequests.length > 0 && (
            <div className={styles.finalisedSection}>
              <h3 className={styles.finalisedTitle}>Finalised Requests</h3>
              {finalisedRequests.map((req) => (
                <div key={req.id} className={`${styles.voteCard} ${voteStatusClass(req)}`}>
                  <span className={styles.voteCardId}>Request #{req.id}</span>
                  <span className={styles.finalState}>
                    {req.executed ? "Executed" : "Rejected"}
                  </span>
                  <p className={styles.voteCardDesc}>{req.description}</p>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {!isOwner && !isValidator && connected && (
        <section className={styles.noticeSection}>
          <p>Connected address {shortAddress(address)} holds neither Owner nor Validator role on this campaign.</p>
        </section>
      )}
    </div>
  );
}
