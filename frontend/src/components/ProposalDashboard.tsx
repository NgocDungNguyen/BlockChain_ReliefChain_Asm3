import { useState, useEffect, useCallback } from "react";
import { ethers } from "ethers";
import {
  getReadOnlyFactory,
  getSigningFactory,
  fetchAllProposals,
  getProposalHasVoted,
  getMinimumStake,
  type ProposalRecord,
} from "../utils/ethers";
import { safeContractCall } from "../utils/gasEstimation";
import { IPFSUpload } from "./IPFSUpload";
import type { PinataUploadResult } from "../utils/pinata";
import styles from "../styles/ProposalDashboard.module.css";

const IPFS_GATEWAY = "https://gateway.pinata.cloud/ipfs/";

interface ProposalDashboardProps {
  signer:            ethers.Signer | null;
  provider:          ethers.providers.Web3Provider | null;
  address:           string;
  connected:         boolean;
  isGlobalValidator: boolean;
  myValidatorStake:  ethers.BigNumber;
  onStakeChanged:    () => void;
}

function shortAddr(addr: string): string {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

function proposalStateClass(p: ProposalRecord): string {
  if (p.executed) return styles.stateApproved;
  if (p.rejected) return styles.stateRejected;
  return styles.statePending;
}

export function ProposalDashboard({
  signer, provider, address, connected, isGlobalValidator, myValidatorStake, onStakeChanged,
}: ProposalDashboardProps) {

  // ── Proposal list ──────────────────────────────────────────────────────────
  const [proposals,   setProposals]   = useState<ProposalRecord[]>([]);
  const [fetching,    setFetching]    = useState(false);
  const [globalThreshold, setGlobalThreshold] = useState(0);
  const [voteLoadIds, setVoteLoadIds] = useState<Set<number>>(new Set());
  const [voteErrors,  setVoteErrors]  = useState<Record<number, string>>({});
  const [voteSuccess, setVoteSuccess] = useState<Record<number, string>>({});
  const [votedMap,    setVotedMap]    = useState<Record<number, boolean>>({});

  // ── Submit form ────────────────────────────────────────────────────────────
  const [formName,       setFormName]       = useState("");
  const [formTargetEth,  setFormTargetEth]  = useState("");
  const [formThreshold,  setFormThreshold]  = useState("2");
  const [formValidators, setFormValidators] = useState("");
  const [formCID,        setFormCID]        = useState("");
  const [formLoading,    setFormLoading]    = useState(false);
  const [formError,      setFormError]      = useState("");
  const [formSuccess,    setFormSuccess]    = useState("");

  // ── Stake management ───────────────────────────────────────────────────────
  const [stakeInput,    setStakeInput]    = useState("");
  const [withdrawInput, setWithdrawInput] = useState("");
  const [stakeLoading,  setStakeLoading]  = useState(false);
  const [stakeError,    setStakeError]    = useState("");
  const [stakeSuccess,  setStakeSuccess]  = useState("");
  const [minimumStake,  setMinimumStake]  = useState<ethers.BigNumber>(ethers.BigNumber.from(0));

  // ── Load proposals and global threshold ───────────────────────────────────
  const loadProposals = useCallback(async () => {
    setFetching(true);
    try {
      const factory = getReadOnlyFactory();
      const [list, threshold] = await Promise.all([
        fetchAllProposals(),
        factory.getGlobalThreshold() as Promise<ethers.BigNumber>,
      ]);
      setProposals(list);
      setGlobalThreshold(threshold.toNumber());

      if (address && isGlobalValidator) {
        const map: Record<number, boolean> = {};
        await Promise.all(
          list.map(async (_, i) => {
            map[i] = await getProposalHasVoted(i, address);
          })
        );
        setVotedMap(map);
      }
    } catch {
      // silent — network may not be up yet
    } finally {
      setFetching(false);
    }
  }, [address, isGlobalValidator]);

  useEffect(() => {
    loadProposals();
    const interval = setInterval(loadProposals, 8_000);
    return () => clearInterval(interval);
  }, [loadProposals]);

  useEffect(() => {
    getMinimumStake().then(setMinimumStake).catch(() => {});
  }, []);

  // ── Vote handler ───────────────────────────────────────────────────────────
  async function handleVote(proposalId: number, approve: boolean) {
    if (!connected || !signer || !provider) return;
    setVoteLoadIds((prev) => new Set([...prev, proposalId]));
    setVoteErrors((prev)  => { const n = { ...prev }; delete n[proposalId]; return n; });
    setVoteSuccess((prev) => { const n = { ...prev }; delete n[proposalId]; return n; });
    try {
      const factory = getSigningFactory(signer);
      await safeContractCall(factory, provider, address, "voteOnProposal", [proposalId, approve], {});
      setVoteSuccess((prev) => ({ ...prev, [proposalId]: approve ? "Approved." : "Rejected." }));
      await loadProposals();
    } catch (err: unknown) {
      setVoteErrors((prev) => ({ ...prev, [proposalId]: err instanceof Error ? err.message : String(err) }));
    } finally {
      setVoteLoadIds((prev) => { const n = new Set(prev); n.delete(proposalId); return n; });
    }
  }

  // ── Submit proposal handler ────────────────────────────────────────────────
  async function handleSubmitProposal() {
    if (!connected || !signer || !provider) { setFormError("Connect wallet first."); return; }
    const validatorAddresses = formValidators.split("\n").map((a) => a.trim()).filter(Boolean);
    if (!formName.trim())                               { setFormError("Campaign name required.");          return; }
    if (!formTargetEth || parseFloat(formTargetEth) <= 0) { setFormError("Invalid target amount.");        return; }
    if (validatorAddresses.length < 2)                  { setFormError("Need at least 2 campaign validators."); return; }
    const badAddr = validatorAddresses.find((a) => !ethers.utils.isAddress(a));
    if (badAddr)                                        { setFormError(`Invalid address: ${badAddr}`);     return; }
    const parsedThreshold = parseInt(formThreshold, 10);
    if (isNaN(parsedThreshold) || parsedThreshold < 1 || parsedThreshold > validatorAddresses.length) {
      setFormError("Threshold must be ≥ 1 and ≤ number of validators.");
      return;
    }
    if (!formCID) { setFormError("Upload evidence to IPFS first."); return; }

    setFormLoading(true);
    setFormError("");
    setFormSuccess("");
    try {
      const factory   = getSigningFactory(signer);
      const targetWei = ethers.utils.parseEther(formTargetEth);
      await safeContractCall(
        factory, provider, address, "submitProposal",
        [formName.trim(), targetWei, validatorAddresses, parsedThreshold, formCID],
        {}
      );
      setFormSuccess("Proposal submitted on-chain.");
      setFormName(""); setFormTargetEth(""); setFormThreshold("2");
      setFormValidators(""); setFormCID("");
      await loadProposals();
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : String(err));
    } finally {
      setFormLoading(false);
    }
  }

  // ── Stake handler ──────────────────────────────────────────────────────────
  async function handleStake() {
    if (!connected || !signer || !provider) return;
    setStakeLoading(true); setStakeError(""); setStakeSuccess("");
    try {
      const factory   = getSigningFactory(signer);
      const amountWei = ethers.utils.parseEther(stakeInput || "0");
      if (amountWei.lte(0)) { setStakeError("Amount must be > 0."); return; }
      const gasEst = await factory.estimateGas.stake({ value: amountWei });
      const tx = await factory.stake({ value: amountWei, gasLimit: gasEst.mul(120).div(100) }) as ethers.ContractTransaction;
      await tx.wait();
      setStakeSuccess(`Staked ${stakeInput} ETH.`);
      setStakeInput("");
      onStakeChanged();
    } catch (err: unknown) {
      setStakeError(err instanceof Error ? err.message : String(err));
    } finally {
      setStakeLoading(false);
    }
  }

  async function handleWithdraw() {
    if (!connected || !signer || !provider) return;
    setStakeLoading(true); setStakeError(""); setStakeSuccess("");
    try {
      const factory   = getSigningFactory(signer);
      const amountWei = ethers.utils.parseEther(withdrawInput || "0");
      if (amountWei.lte(0)) { setStakeError("Amount must be > 0."); return; }
      const gasEst = await factory.estimateGas.withdrawStake(amountWei);
      const tx = await factory.withdrawStake(amountWei, { gasLimit: gasEst.mul(120).div(100) }) as ethers.ContractTransaction;
      await tx.wait();
      setStakeSuccess(`Withdrew ${withdrawInput} ETH.`);
      setWithdrawInput("");
      onStakeChanged();
    } catch (err: unknown) {
      setStakeError(err instanceof Error ? err.message : String(err));
    } finally {
      setStakeLoading(false);
    }
  }

  const pendingProposals   = proposals.filter((p) => !p.executed && !p.rejected);
  const finalisedProposals = proposals.filter((p) =>  p.executed ||  p.rejected);

  return (
    <div>
      <div className={styles.grid}>
        {/* ── A. Stake Management (global validators only) ───────────────────── */}
        {isGlobalValidator && (
          <div className={`${styles.panel} ${styles.stakePanel}`}>
            <h2 className={styles.panelTitle}>My Validator Stake</h2>
            <div className={styles.stakeRow}>
              <span className={styles.stakeAmount}>
                {ethers.utils.formatEther(myValidatorStake)} ETH
              </span>
              <span className={styles.stakeLabel}>staked</span>
            </div>
            {minimumStake.gt(0) && (
              <p className={styles.minimumNote}>
                Minimum to vote: {ethers.utils.formatEther(minimumStake)} ETH
              </p>
            )}
            <div className={styles.stakeInputRow}>
              <input
                className={styles.stakeInput}
                type="number"
                min="0"
                step="0.01"
                placeholder="ETH to stake"
                value={stakeInput}
                onChange={(e) => setStakeInput(e.target.value)}
                disabled={stakeLoading}
              />
              <button
                className={styles.stakeBtn}
                onClick={handleStake}
                disabled={stakeLoading || !connected}
                type="button"
              >
                {stakeLoading ? <span className={styles.btnSpinner} /> : "Stake"}
              </button>
            </div>
            <div className={styles.stakeInputRow}>
              <input
                className={styles.stakeInput}
                type="number"
                min="0"
                step="0.01"
                placeholder="ETH to withdraw"
                value={withdrawInput}
                onChange={(e) => setWithdrawInput(e.target.value)}
                disabled={stakeLoading}
              />
              <button
                className={styles.withdrawBtn}
                onClick={handleWithdraw}
                disabled={stakeLoading || !connected || myValidatorStake.lte(0)}
                type="button"
              >
                Withdraw
              </button>
            </div>
            {stakeError   && <p className={styles.stakeError}>{stakeError}</p>}
            {stakeSuccess && <p className={styles.stakeSuccess}>{stakeSuccess}</p>}
          </div>
        )}

        {/* ── B. Submit Proposal (any connected wallet) ──────────────────────── */}
        <div className={`${styles.panel} ${styles.submitPanel}`}>
          <h2 className={styles.panelTitle}>Propose a Campaign</h2>

          <div className={styles.formGroup}>
            <label className={styles.label}>Campaign Name</label>
            <input
              className={styles.input}
              type="text"
              placeholder="e.g. Typhoon Emergency Fund 2026"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              disabled={formLoading}
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>Fundraising Target (ETH)</label>
            <input
              className={styles.input}
              type="number"
              min="0"
              step="0.01"
              placeholder="e.g. 75"
              value={formTargetEth}
              onChange={(e) => setFormTargetEth(e.target.value)}
              disabled={formLoading}
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>Campaign Validators (one address per line)</label>
            <textarea
              className={styles.textarea}
              rows={4}
              placeholder={"0xAbc...\n0xDef..."}
              value={formValidators}
              onChange={(e) => setFormValidators(e.target.value)}
              disabled={formLoading}
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>Campaign Approval Threshold</label>
            <input
              className={styles.input}
              type="number"
              min="1"
              step="1"
              placeholder="e.g. 2"
              value={formThreshold}
              onChange={(e) => setFormThreshold(e.target.value)}
              disabled={formLoading}
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>IPFS Evidence</label>
            <IPFSUpload
              onUploadComplete={(result: PinataUploadResult) => setFormCID(result.cid)}
            />
          </div>

          {formCID && (
            <div className={styles.cidPreview}>
              Evidence CID: <code>{formCID}</code>
            </div>
          )}

          <button
            className={styles.submitBtn}
            onClick={handleSubmitProposal}
            disabled={formLoading || !connected}
            type="button"
          >
            {formLoading ? <span className={styles.btnSpinner} /> : "Submit Proposal"}
          </button>
          {formError   && <div className={styles.formError}>{formError}</div>}
          {formSuccess && <div className={styles.formSuccess}>{formSuccess}</div>}
        </div>
      </div>

      {/* ── C. Pending Proposals ──────────────────────────────────────────────── */}
      <div className={`${styles.panel} ${styles.listPanel}`} style={{ marginTop: 28 }}>
        <h2 className={styles.panelTitle}>
          Pending Proposals ({fetching ? "…" : pendingProposals.length})
        </h2>
        {fetching && proposals.length === 0 && (
          <p className={styles.loadingHint}>Loading proposals…</p>
        )}
        {!fetching && pendingProposals.length === 0 && (
          <p className={styles.emptyHint}>No pending proposals. Submit one above.</p>
        )}
        {pendingProposals.map((p, idx) => {
          const id = proposals.indexOf(p);
          return (
            <div key={id} className={`${styles.proposalCard} ${proposalStateClass(p)}`}>
              <div className={styles.cardHeader}>
                <span className={styles.cardId}>Proposal #{id}</span>
                <span className={`${styles.statusBadge} ${styles.badgePending}`}>Pending</span>
              </div>
              <p className={styles.cardName}>{p.name}</p>
              <div className={styles.cardMeta}>
                <span>Proposer: <code>{shortAddr(p.proposer)}</code></span>
                <span>Target: {ethers.utils.formatEther(p.targetWei)} ETH</span>
                <span>Campaign threshold: {p.threshold}/{p.validators.length}</span>
              </div>
              <a
                href={`${IPFS_GATEWAY}${p.ipfsCID}`}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.cidLink}
              >
                Evidence: {p.ipfsCID.slice(0, 20)}…
              </a>
              <div className={styles.tallyRow}>
                <div className={styles.tallyLabel}>
                  <span>Approvals: {p.approvalCount}/{globalThreshold}</span>
                  <span>Rejections: {p.rejectionCount}/{globalThreshold}</span>
                </div>
                <div className={styles.tallyTrack}>
                  <div
                    className={styles.tallyApprove}
                    style={{ width: `${globalThreshold > 0 ? (p.approvalCount / globalThreshold) * 50 : 0}%` }}
                  />
                  <div
                    className={styles.tallyReject}
                    style={{ width: `${globalThreshold > 0 ? (p.rejectionCount / globalThreshold) * 50 : 0}%` }}
                  />
                </div>
              </div>
              {isGlobalValidator && connected && !votedMap[id] && (
                <div className={styles.voteButtons}>
                  <button
                    className={styles.approveBtn}
                    onClick={() => handleVote(id, true)}
                    disabled={voteLoadIds.has(id)}
                    type="button"
                  >
                    {voteLoadIds.has(id) ? <span className={styles.btnSpinner} /> : "Approve"}
                  </button>
                  <button
                    className={styles.rejectBtn}
                    onClick={() => handleVote(id, false)}
                    disabled={voteLoadIds.has(id)}
                    type="button"
                  >
                    {voteLoadIds.has(id) ? <span className={styles.btnSpinner} /> : "Reject"}
                  </button>
                </div>
              )}
              {isGlobalValidator && connected && votedMap[id] && (
                <p className={styles.alreadyVoted}>Your vote recorded.</p>
              )}
              {voteErrors[id]  && <div className={styles.voteError}>{voteErrors[id]}</div>}
              {voteSuccess[id] && <div className={styles.voteSuccessMsg}>{voteSuccess[id]}</div>}
            </div>
          );
        })}

        {/* ── D. Finalised Proposals ──────────────────────────────────────────── */}
        {finalisedProposals.length > 0 && (
          <div className={styles.finalisedSection}>
            <p className={styles.sectionTitle}>Finalised Proposals ({finalisedProposals.length})</p>
            {finalisedProposals.map((p) => {
              const id = proposals.indexOf(p);
              return (
                <div key={id} className={`${styles.proposalCard} ${proposalStateClass(p)}`}>
                  <div className={styles.cardHeader}>
                    <span className={styles.cardId}>Proposal #{id}</span>
                    {p.executed ? (
                      <span className={`${styles.statusBadge} ${styles.badgeApproved}`}>Approved</span>
                    ) : (
                      <span className={`${styles.statusBadge} ${styles.badgeRejected}`}>Rejected</span>
                    )}
                  </div>
                  <p className={styles.cardName}>{p.name}</p>
                  <div className={styles.cardMeta}>
                    <span>Proposer: <code>{shortAddr(p.proposer)}</code></span>
                    <span>Target: {ethers.utils.formatEther(p.targetWei)} ETH</span>
                    <span>Approvals: {p.approvalCount} · Rejections: {p.rejectionCount}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
