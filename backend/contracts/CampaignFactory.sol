// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./Campaign.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title CampaignFactory
 * @notice Two-tier governance for disaster-relief campaigns on Polygon Amoy.
 *
 *  Tier 1 — Direct creation (backwards-compatible):
 *    createCampaign() deploys a Campaign immediately. Used for pre-seeded demo
 *    campaigns during testing and deployment scripts.
 *
 *  Tier 2 — Proposal governance (new):
 *    Any wallet submits a proposal with IPFS evidence.
 *    Global validators (GLOBAL_VALIDATOR_ROLE) vote 3-of-5 to approve or reject.
 *    Approval auto-deploys the campaign; proposer becomes owner.
 *    Validators must maintain a minimum ETH stake to vote (skin-in-the-game).
 *    Admin can slash malicious validators' stakes as economic penalty.
 */
contract CampaignFactory is AccessControl {

    // ─── Custom errors (cheaper than string literals in bytecode) ─────────────
    error TooFewValidators();
    error BadThreshold();
    error ZeroAddress();
    error InvalidProposalId();
    error AlreadyExecuted();
    error AlreadyRejected();
    error AlreadyVoted();
    error InsufficientStake();
    error EmptyName();
    error ZeroTarget();
    error EmptyIpfsCID();
    error TooFewCampaignValidators();
    error BadCampaignThreshold();
    error StakeMustBePositive();
    error WouldDropBelowMinimum();
    error NotAValidator();
    error IndexOutOfRange();

    // ─── Roles ────────────────────────────────────────────────────────────────
    bytes32 public constant GLOBAL_VALIDATOR_ROLE = keccak256("GLOBAL_VALIDATOR_ROLE");

    // ─── Global governance config ─────────────────────────────────────────────
    uint256 public globalValidatorThreshold;
    uint256 public globalValidatorCount;
    uint256 public minimumStake;

    // ─── Staking ──────────────────────────────────────────────────────────────
    mapping(address => uint256) public validatorStake;

    // ─── Campaign registry ────────────────────────────────────────────────────
    struct CampaignRecord {
        address campaignAddress;
        string  name;
        address owner;
        uint256 validatorCount;
        uint256 threshold;
        uint256 targetWei;
        uint256 createdAt;
    }

    CampaignRecord[] private _campaigns;

    // ─── Proposal registry ────────────────────────────────────────────────────
    struct Proposal {
        address   proposer;
        string    name;
        uint256   targetWei;
        address[] validators;
        uint256   threshold;
        string    ipfsCID;
        uint256   approvalCount;
        uint256   rejectionCount;
        bool      executed;
        bool      rejected;
        uint256   createdAt;
    }

    Proposal[] private _proposals;
    mapping(uint256 => mapping(address => bool)) public proposalHasVoted;

    // ─── Events ───────────────────────────────────────────────────────────────
    event CampaignCreated(
        uint256 indexed campaignId,
        address indexed campaignAddress,
        string          name,
        address indexed owner,
        uint256         validatorCount,
        uint256         threshold
    );

    event ProposalSubmitted(
        uint256 indexed proposalId,
        address indexed proposer,
        string          name,
        uint256         targetWei,
        string          ipfsCID
    );

    event ProposalVoted(
        uint256 indexed proposalId,
        address indexed voter,
        bool            approved
    );

    event ProposalApproved(
        uint256 indexed proposalId,
        uint256 indexed campaignId,
        address         campaignAddress
    );

    event ProposalRejected(uint256 indexed proposalId);

    event ValidatorStaked(
        address indexed validator,
        uint256         amount,
        uint256         newTotal
    );

    event ValidatorSlashed(
        address indexed validator,
        uint256         amount,
        address indexed by
    );

    event StakeWithdrawn(address indexed validator, uint256 amount);

    // ─── Constructor ──────────────────────────────────────────────────────────
    /**
     * @param _globalValidators  Addresses granted GLOBAL_VALIDATOR_ROLE. Min 2.
     * @param _globalThreshold   Votes required to approve or reject a proposal.
     * @param _minimumStake      Wei a validator must have staked to cast a vote.
     *                           Pass 0 to disable the requirement (useful in tests).
     */
    constructor(
        address[] memory _globalValidators,
        uint256          _globalThreshold,
        uint256          _minimumStake
    ) {
        if (_globalValidators.length < 2) revert TooFewValidators();
        if (_globalThreshold < 1 || _globalThreshold > _globalValidators.length) revert BadThreshold();

        globalValidatorThreshold = _globalThreshold;
        globalValidatorCount     = _globalValidators.length;
        minimumStake             = _minimumStake;

        _setupRole(DEFAULT_ADMIN_ROLE, msg.sender);

        for (uint256 i = 0; i < _globalValidators.length; i++) {
            if (_globalValidators[i] == address(0)) revert ZeroAddress();
            _setupRole(GLOBAL_VALIDATOR_ROLE, _globalValidators[i]);
        }
    }

    // ─── Tier 1: Direct campaign creation (backwards-compatible) ─────────────
    /**
     * @notice Deploys a Campaign immediately. Caller becomes campaign owner.
     *         Used for pre-seeded demo campaigns.
     */
    function createCampaign(
        address[] calldata _validators,
        uint256            _threshold,
        string  calldata   _name,
        uint256            _targetWei
    ) external returns (address addr) {
        addr = _deployCampaign(msg.sender, _validators, _threshold, _name, _targetWei);
    }

    // ─── Tier 2: Proposal governance ─────────────────────────────────────────
    /**
     * @notice Submit a campaign proposal. Any wallet may call this.
     *         Proposal requires IPFS evidence CID and campaign-level validator config.
     */
    function submitProposal(
        string    calldata _name,
        uint256            _targetWei,
        address[] calldata _validators,
        uint256            _threshold,
        string    calldata _ipfsCID
    ) external returns (uint256 proposalId) {
        if (bytes(_name).length == 0)    revert EmptyName();
        if (_targetWei == 0)             revert ZeroTarget();
        if (bytes(_ipfsCID).length == 0) revert EmptyIpfsCID();
        if (_validators.length < 2)      revert TooFewCampaignValidators();
        if (_threshold < 1 || _threshold > _validators.length) revert BadCampaignThreshold();

        proposalId = _proposals.length;
        _proposals.push(Proposal({
            proposer:         msg.sender,
            name:             _name,
            targetWei:        _targetWei,
            validators:       _validators,
            threshold:        _threshold,
            ipfsCID:          _ipfsCID,
            approvalCount:    0,
            rejectionCount:   0,
            executed:         false,
            rejected:         false,
            createdAt:        block.timestamp
        }));

        emit ProposalSubmitted(proposalId, msg.sender, _name, _targetWei, _ipfsCID);
    }

    /**
     * @notice Cast an approval or rejection vote on a pending proposal.
     *         Restricted to GLOBAL_VALIDATOR_ROLE holders.
     *         If minimumStake > 0, caller must have staked at least that amount.
     *         Reaching the approval threshold auto-deploys the campaign.
     *         Reaching the rejection threshold closes the proposal without deploying.
     */
    function voteOnProposal(
        uint256 _proposalId,
        bool    _approve
    ) external onlyRole(GLOBAL_VALIDATOR_ROLE) {
        if (_proposalId >= _proposals.length) revert InvalidProposalId();

        Proposal storage p = _proposals[_proposalId];
        if (p.executed)                                       revert AlreadyExecuted();
        if (p.rejected)                                       revert AlreadyRejected();
        if (proposalHasVoted[_proposalId][msg.sender])        revert AlreadyVoted();

        if (minimumStake > 0) {
            if (validatorStake[msg.sender] < minimumStake)    revert InsufficientStake();
        }

        proposalHasVoted[_proposalId][msg.sender] = true;
        emit ProposalVoted(_proposalId, msg.sender, _approve);

        if (_approve) {
            p.approvalCount++;
            if (p.approvalCount >= globalValidatorThreshold) {
                p.executed = true;
                address addr = _deployFromProposal(p);
                uint256 campaignId = _campaigns.length - 1;
                emit ProposalApproved(_proposalId, campaignId, addr);
            }
        } else {
            p.rejectionCount++;
            if (p.rejectionCount >= globalValidatorThreshold) {
                p.rejected = true;
                emit ProposalRejected(_proposalId);
            }
        }
    }

    // ─── Staking ──────────────────────────────────────────────────────────────
    /**
     * @notice Stake ETH as collateral. Only global validators may stake.
     *         Increases voting eligibility when minimumStake > 0.
     */
    function stake() external payable onlyRole(GLOBAL_VALIDATOR_ROLE) {
        if (msg.value == 0) revert StakeMustBePositive();
        validatorStake[msg.sender] += msg.value;
        emit ValidatorStaked(msg.sender, msg.value, validatorStake[msg.sender]);
    }

    /**
     * @notice Withdraw part or all of staked ETH.
     *         Partial withdrawal that would drop stake below minimumStake is blocked.
     */
    function withdrawStake(uint256 amount) external onlyRole(GLOBAL_VALIDATOR_ROLE) {
        if (validatorStake[msg.sender] < amount) revert InsufficientStake();
        uint256 remaining = validatorStake[msg.sender] - amount;
        if (remaining != 0 && remaining < minimumStake) revert WouldDropBelowMinimum();
        validatorStake[msg.sender] = remaining;
        payable(msg.sender).transfer(amount);
        emit StakeWithdrawn(msg.sender, amount);
    }

    /**
     * @notice Slash a validator's stake as economic penalty for malicious approvals.
     *         Admin-only. Slashed ETH is transferred to the admin (treasury).
     */
    function slashValidator(
        address validator,
        uint256 amount
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (!hasRole(GLOBAL_VALIDATOR_ROLE, validator)) revert NotAValidator();
        if (validatorStake[validator] < amount)         revert InsufficientStake();
        validatorStake[validator] -= amount;
        payable(msg.sender).transfer(amount);
        emit ValidatorSlashed(validator, amount, msg.sender);
    }

    // ─── Internal helpers ─────────────────────────────────────────────────────
    function _deployCampaign(
        address            owner,
        address[] memory   validators,
        uint256            threshold,
        string memory      name,
        uint256            targetWei
    ) internal returns (address addr) {
        Campaign campaign = new Campaign(owner, validators, threshold, name, targetWei);
        addr = address(campaign);
        uint256 campaignId = _campaigns.length;
        _campaigns.push(CampaignRecord({
            campaignAddress: addr,
            name:            name,
            owner:           owner,
            validatorCount:  validators.length,
            threshold:       threshold,
            targetWei:       targetWei,
            createdAt:       block.timestamp
        }));
        emit CampaignCreated(campaignId, addr, name, owner, validators.length, threshold);
    }

    function _deployFromProposal(Proposal storage p) internal returns (address) {
        return _deployCampaign(p.proposer, p.validators, p.threshold, p.name, p.targetWei);
    }

    // ─── View helpers ─────────────────────────────────────────────────────────
    function getCampaigns() external view returns (CampaignRecord[] memory) {
        return _campaigns;
    }

    function getCampaignsCount() external view returns (uint256) {
        return _campaigns.length;
    }

    function getCampaign(uint256 _index) external view returns (CampaignRecord memory) {
        if (_index >= _campaigns.length) revert IndexOutOfRange();
        return _campaigns[_index];
    }

    function getProposals() external view returns (Proposal[] memory) {
        return _proposals;
    }

    function getProposalsCount() external view returns (uint256) {
        return _proposals.length;
    }

    function getProposal(uint256 _index) external view returns (Proposal memory) {
        if (_index >= _proposals.length) revert IndexOutOfRange();
        return _proposals[_index];
    }

    function isGlobalValidator(address addr) external view returns (bool) {
        return hasRole(GLOBAL_VALIDATOR_ROLE, addr);
    }

    function getGlobalThreshold() external view returns (uint256) {
        return globalValidatorThreshold;
    }

    function getGlobalValidatorCount() external view returns (uint256) {
        return globalValidatorCount;
    }
}
