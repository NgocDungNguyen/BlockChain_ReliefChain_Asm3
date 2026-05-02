// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./Campaign.sol";

/**
 * @title CampaignFactory
 * @notice Deploys and tracks independent Campaign instances.
 *         Each call to createCampaign produces a new Campaign contract
 *         with its own validator set, approval threshold, name, and
 *         fundraising target. The caller becomes the campaign owner.
 *
 * @dev Addresses the "single hardcoded campaign" limitation. The factory
 *      itself holds no funds and has no privileged role in any Campaign.
 *      Governance over individual campaigns rests entirely with each
 *      campaign's designated owner and validator set.
 */
contract CampaignFactory {

    // ─── Storage ──────────────────────────────────────────────────────────────
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

    // ─── Events ──────────────────────────────────────────────────────────────
    event CampaignCreated(
        uint256 indexed campaignId,
        address indexed campaignAddress,
        string          name,
        address indexed owner,
        uint256         validatorCount,
        uint256         threshold
    );

    // ─── Factory function ─────────────────────────────────────────────────────
    /**
     * @notice Deploys a new Campaign contract. The caller (msg.sender) becomes
     *         the campaign owner and receives OWNER_ROLE in the new contract.
     *
     * @param _validators  Array of validator addresses. Minimum 2, no duplicates,
     *                     no zero addresses.
     * @param _threshold   Votes required to approve or auto-reject a request.
     *                     Must be >= 1 and <= _validators.length.
     * @param _name        Human-readable campaign name (e.g. "Vietnam Flood 2026").
     * @param _targetWei   Fundraising target in wei.
     * @return addr        Address of the newly deployed Campaign contract.
     */
    function createCampaign(
        address[] calldata _validators,
        uint256            _threshold,
        string  calldata   _name,
        uint256            _targetWei
    ) external returns (address addr) {
        // Campaign constructor validates all parameters and reverts on bad input.
        // msg.sender is passed as the owner so the factory caller controls the campaign.
        Campaign campaign = new Campaign(
            msg.sender,
            _validators,
            _threshold,
            _name,
            _targetWei
        );

        addr = address(campaign);

        uint256 campaignId = _campaigns.length;

        _campaigns.push(CampaignRecord({
            campaignAddress: addr,
            name:            _name,
            owner:           msg.sender,
            validatorCount:  _validators.length,
            threshold:       _threshold,
            targetWei:       _targetWei,
            createdAt:       block.timestamp
        }));

        emit CampaignCreated(
            campaignId,
            addr,
            _name,
            msg.sender,
            _validators.length,
            _threshold
        );
    }

    // ─── View helpers ─────────────────────────────────────────────────────────
    /**
     * @notice Returns all campaign records ever created through this factory.
     */
    function getCampaigns() external view returns (CampaignRecord[] memory) {
        return _campaigns;
    }

    /**
     * @notice Returns the number of campaigns created.
     */
    function getCampaignsCount() external view returns (uint256) {
        return _campaigns.length;
    }

    /**
     * @notice Returns a single campaign record by index.
     */
    function getCampaign(uint256 _index) external view returns (CampaignRecord memory) {
        require(_index < _campaigns.length, "CampaignFactory: index out of range");
        return _campaigns[_index];
    }
}