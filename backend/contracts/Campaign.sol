// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title Campaign
 * @notice Disaster relief funding contract with configurable validator set
 *         and configurable approval threshold. Deployed by CampaignFactory
 *         or directly. Each instance represents one independent relief campaign.
 *
 * @dev Constructor accepts the intended owner explicitly so that when deployed
 *      through CampaignFactory, the factory caller (not the factory contract)
 *      receives OWNER_ROLE. Validators and threshold are fully configurable at
 *      deploy time — no hardcoded values remain in this contract.
 *
 *      OpenZeppelin v4.9. Checks-Effects-Interactions on all fund transfers.
 *      ReentrancyGuard on releaseFunds.
 */
contract Campaign is ReentrancyGuard, AccessControl {

    // ─── Roles ───────────────────────────────────────────────────────────────
    bytes32 public constant VALIDATOR_ROLE = keccak256("VALIDATOR_ROLE");
    bytes32 public constant OWNER_ROLE     = keccak256("OWNER_ROLE");

    // ─── Campaign metadata (set at deploy time, immutable after) ─────────────
    string  public campaignName;
    uint256 public campaignTarget;   // fundraising target in wei
    uint256 public threshold;        // votes required to approve OR auto-reject
    uint256 public validatorCount;   // number of validators in this campaign

    // ─── State ───────────────────────────────────────────────────────────────
    uint256 public totalDonated;

    struct Donation {
        address donor;
        uint256 amount;
        uint256 timestamp;
    }

    struct Request {
        string          description;
        address payable beneficiary;
        uint256         amount;
        string          ipfsCID;
        uint256         approvalCount;
        uint256         rejectCount;
        bool            executed;
        bool            rejected;
    }

    Donation[]  public donations;
    Request[]   public requests;
    address[]   public validators;   // dynamic, not fixed to 3

    // requestId → validator address → voted
    mapping(uint256 => mapping(address => bool)) public hasVoted;

    // ─── Events ──────────────────────────────────────────────────────────────
    event Donated(
        address indexed donor,
        uint256         amount,
        uint256         newTotal
    );
    event RequestCreated(
        uint256 indexed requestId,
        address indexed owner,
        address         beneficiary,
        uint256         amount,
        string          ipfsCID
    );
    event Voted(
        uint256 indexed requestId,
        address indexed validator,
        bool            approved
    );
    event FundsReleased(
        uint256 indexed requestId,
        address indexed beneficiary,
        uint256         amount
    );
    event RequestRejected(
        uint256 indexed requestId
    );

    // ─── Constructor ──────────────────────────────────────────────────────────
    /**
     * @param _owner      Address that receives OWNER_ROLE. Pass msg.sender when
     *                    deploying directly; pass the caller when deploying via
     *                    CampaignFactory so ownership lands with the creator.
     * @param _validators Variable-length validator array. Minimum 2 addresses.
     *                    All must be non-zero and distinct.
     * @param _threshold  Votes required to approve or auto-reject a request.
     *                    Must be >= 1 and <= _validators.length.
     * @param _name       Human-readable campaign name.
     * @param _targetWei  Fundraising target in wei (informational, not enforced).
     */
    constructor(
        address          _owner,
        address[] memory _validators,
        uint256          _threshold,
        string  memory   _name,
        uint256          _targetWei
    ) {
        require(_validators.length >= 2,           "Campaign: need >= 2 validators");
        require(_threshold >= 1,                   "Campaign: threshold must be >= 1");
        require(_threshold <= _validators.length,  "Campaign: threshold > validator count");
        require(bytes(_name).length > 0,           "Campaign: empty name");
        require(_targetWei > 0,                    "Campaign: target must be > 0");
        require(_owner != address(0),              "Campaign: zero owner address");

        // Validate: no zero addresses, no duplicates
        for (uint256 i = 0; i < _validators.length; i++) {
            require(_validators[i] != address(0), "Campaign: zero validator address");
            for (uint256 j = i + 1; j < _validators.length; j++) {
                require(_validators[i] != _validators[j], "Campaign: duplicate validator");
            }
        }

        campaignName   = _name;
        campaignTarget = _targetWei;
        threshold      = _threshold;
        validatorCount = _validators.length;
        validators     = _validators;

        _setupRole(DEFAULT_ADMIN_ROLE, _owner);
        _setupRole(OWNER_ROLE,         _owner);

        for (uint256 i = 0; i < _validators.length; i++) {
            _setupRole(VALIDATOR_ROLE, _validators[i]);
        }
    }

    // ─── Donation ─────────────────────────────────────────────────────────────
    /**
     * @notice Send ETH to donate. Emits Donated event.
     */
    function donate() external payable {
        require(msg.value > 0, "Campaign: donation must be > 0");
        _recordDonation(msg.sender, msg.value);
    }

    /**
     * @notice Fallback: plain ETH transfers also counted as donations.
     */
    receive() external payable {
        require(msg.value > 0, "Campaign: donation must be > 0");
        _recordDonation(msg.sender, msg.value);
    }

    function _recordDonation(address _donor, uint256 _amount) internal {
        totalDonated += _amount;
        donations.push(Donation({
            donor:     _donor,
            amount:    _amount,
            timestamp: block.timestamp
        }));
        emit Donated(_donor, _amount, totalDonated);
    }

    // ─── Request submission ───────────────────────────────────────────────────
    /**
     * @notice Campaign owner submits a spending request.
     * @param _description Human-readable purpose of the funds.
     * @param _beneficiary Address to receive funds upon approval.
     * @param _amount      ETH amount in wei.
     * @param _ipfsCID     IPFS content identifier of uploaded evidence.
     */
    function createRequest(
        string  calldata _description,
        address payable  _beneficiary,
        uint256          _amount,
        string  calldata _ipfsCID
    ) external onlyRole(OWNER_ROLE) {
        require(_beneficiary != address(0),       "Campaign: zero beneficiary");
        require(_amount > 0,                      "Campaign: amount must be > 0");
        require(_amount <= address(this).balance, "Campaign: insufficient balance");
        require(bytes(_description).length > 0,   "Campaign: empty description");
        require(bytes(_ipfsCID).length > 0,       "Campaign: IPFS CID required");

        uint256 requestId = requests.length;
        requests.push(Request({
            description:   _description,
            beneficiary:   _beneficiary,
            amount:        _amount,
            ipfsCID:       _ipfsCID,
            approvalCount: 0,
            rejectCount:   0,
            executed:      false,
            rejected:      false
        }));

        emit RequestCreated(requestId, msg.sender, _beneficiary, _amount, _ipfsCID);
    }

    // ─── Voting ───────────────────────────────────────────────────────────────
    /**
     * @notice Validator casts approval or rejection vote on a spending request.
     *         Auto-rejects when rejectCount reaches threshold.
     * @param _requestId Index into requests array.
     * @param _approve   True for approval, false for rejection.
     */
    function vote(uint256 _requestId, bool _approve) external onlyRole(VALIDATOR_ROLE) {
        require(_requestId < requests.length,          "Campaign: invalid request ID");

        Request storage req = requests[_requestId];
        require(!req.executed,                         "Campaign: already executed");
        require(!req.rejected,                         "Campaign: already rejected");
        require(!hasVoted[_requestId][msg.sender],     "Campaign: already voted");

        hasVoted[_requestId][msg.sender] = true;

        if (_approve) {
            req.approvalCount++;
        } else {
            req.rejectCount++;
            if (req.rejectCount >= threshold) {
                req.rejected = true;
                emit RequestRejected(_requestId);
            }
        }

        emit Voted(_requestId, msg.sender, _approve);
    }

    // ─── Fund release ─────────────────────────────────────────────────────────
    /**
     * @notice Anyone may call this once enough validators have approved.
     *         Checks-Effects-Interactions: state updated before ETH transfer.
     * @param _requestId Index into requests array.
     */
    function releaseFunds(uint256 _requestId) external nonReentrant {
        require(_requestId < requests.length,           "Campaign: invalid request ID");

        Request storage req = requests[_requestId];
        require(!req.executed,                          "Campaign: already executed");
        require(!req.rejected,                          "Campaign: request rejected");
        require(req.approvalCount >= threshold,         "Campaign: insufficient approvals");
        require(req.amount <= address(this).balance,    "Campaign: insufficient contract balance");

        // Effects before interaction
        req.executed = true;

        (bool success, ) = req.beneficiary.call{value: req.amount}("");
        require(success, "Campaign: ETH transfer failed");

        emit FundsReleased(_requestId, req.beneficiary, req.amount);
    }

    // ─── View helpers ─────────────────────────────────────────────────────────
    /**
     * @notice Returns the full validators array.
     */
    function getValidators() external view returns (address[] memory) {
        return validators;
    }

    function getDonationsCount() external view returns (uint256) {
        return donations.length;
    }

    function getRequestsCount() external view returns (uint256) {
        return requests.length;
    }

    /**
     * @notice Returns all fields of a request by ID.
     */
    function getRequestInfo(uint256 _requestId) external view returns (
        string  memory description,
        address        beneficiary,
        uint256        amount,
        string  memory ipfsCID,
        uint256        approvalCount,
        uint256        rejectCount,
        bool           executed,
        bool           rejected
    ) {
        require(_requestId < requests.length, "Campaign: invalid request ID");
        Request storage req = requests[_requestId];
        return (
            req.description,
            req.beneficiary,
            req.amount,
            req.ipfsCID,
            req.approvalCount,
            req.rejectCount,
            req.executed,
            req.rejected
        );
    }

    /**
     * @notice Returns all donations for frontend display.
     */
    function getAllDonations() external view returns (Donation[] memory) {
        return donations;
    }

    function getContractBalance() external view returns (uint256) {
        return address(this).balance;
    }

    function isValidator(address _addr) external view returns (bool) {
        return hasRole(VALIDATOR_ROLE, _addr);
    }

    function isOwner(address _addr) external view returns (bool) {
        return hasRole(OWNER_ROLE, _addr);
    }
}