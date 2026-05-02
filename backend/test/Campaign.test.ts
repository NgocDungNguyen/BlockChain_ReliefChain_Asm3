import { expect } from "chai";
import { ethers } from "hardhat";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { Campaign, CampaignFactory } from "../typechain-types";

// ─── Shared helpers ────────────────────────────────────────────────────────────
const ONE_ETH  = ethers.utils.parseEther("1");
const TWO_ETH  = ethers.utils.parseEther("2");
const FIVE_ETH = ethers.utils.parseEther("5");
const MOCK_CID = "QmTestCID1234567890abcdefghijk";
const CAMPAIGN_NAME   = "Test Relief Campaign";
const CAMPAIGN_TARGET = ethers.utils.parseEther("100");

/**
 * Deploys a Campaign directly with the standard 3-validator, threshold-2 config.
 * All tests that do not need to vary the constructor parameters use this helper.
 */
async function deployCampaign(
  owner:      SignerWithAddress,
  validator1: SignerWithAddress,
  validator2: SignerWithAddress,
  validator3: SignerWithAddress,
  threshold   = 2,
  name        = CAMPAIGN_NAME,
  target      = CAMPAIGN_TARGET
): Promise<Campaign> {
  const Factory = await ethers.getContractFactory("Campaign");
  const c = await Factory.deploy(
    owner.address,
    [validator1.address, validator2.address, validator3.address],
    threshold,
    name,
    target
  );
  await c.deployed();
  return c as Campaign;
}

// ─── Campaign tests ─────────────────────────────────────────────────────────────
describe("Campaign", function () {
  let campaign:   Campaign;
  let owner:      SignerWithAddress;
  let validator1: SignerWithAddress;
  let validator2: SignerWithAddress;
  let validator3: SignerWithAddress;
  let donor1:     SignerWithAddress;
  let donor2:     SignerWithAddress;
  let beneficiary:SignerWithAddress;
  let stranger:   SignerWithAddress;

  beforeEach(async function () {
    [owner, validator1, validator2, validator3, donor1, donor2, beneficiary, stranger] =
      await ethers.getSigners();

    campaign = await deployCampaign(owner, validator1, validator2, validator3);
  });

  // ── Deployment ────────────────────────────────────────────────────────────
  describe("Deployment", function () {
    it("stores campaign name", async function () {
      expect(await campaign.campaignName()).to.equal(CAMPAIGN_NAME);
    });

    it("stores campaign target", async function () {
      expect(await campaign.campaignTarget()).to.equal(CAMPAIGN_TARGET);
    });

    it("stores configured threshold", async function () {
      expect(await campaign.threshold()).to.equal(2);
    });

    it("stores validator count", async function () {
      expect(await campaign.validatorCount()).to.equal(3);
    });

    it("assigns OWNER_ROLE to supplied owner address", async function () {
      const OWNER_ROLE = await campaign.OWNER_ROLE();
      expect(await campaign.hasRole(OWNER_ROLE, owner.address)).to.be.true;
    });

    it("does not assign OWNER_ROLE to factory/deployer when owner differs", async function () {
      // Simulate factory scenario: owner param != msg.sender (deployer is the test runner)
      const Factory = await ethers.getContractFactory("Campaign");
      const c = await Factory.connect(stranger).deploy(
        owner.address,                     // explicit owner
        [validator1.address, validator2.address, validator3.address],
        2,
        CAMPAIGN_NAME,
        CAMPAIGN_TARGET
      );
      await c.deployed();
      const OWNER_ROLE = await c.OWNER_ROLE();
      // owner.address should have role, stranger (the deployer) should not
      expect(await c.hasRole(OWNER_ROLE, owner.address)).to.be.true;
      expect(await c.hasRole(OWNER_ROLE, stranger.address)).to.be.false;
    });

    it("assigns VALIDATOR_ROLE to all three validators", async function () {
      const VALIDATOR_ROLE = await campaign.VALIDATOR_ROLE();
      expect(await campaign.hasRole(VALIDATOR_ROLE, validator1.address)).to.be.true;
      expect(await campaign.hasRole(VALIDATOR_ROLE, validator2.address)).to.be.true;
      expect(await campaign.hasRole(VALIDATOR_ROLE, validator3.address)).to.be.true;
    });

    it("getValidators returns full array", async function () {
      const vals = await campaign.getValidators();
      expect(vals.length).to.equal(3);
      expect(vals[0]).to.equal(validator1.address);
      expect(vals[1]).to.equal(validator2.address);
      expect(vals[2]).to.equal(validator3.address);
    });

    it("reverts when fewer than 2 validators supplied", async function () {
      const F = await ethers.getContractFactory("Campaign");
      await expect(
        F.deploy(owner.address, [validator1.address], 1, CAMPAIGN_NAME, CAMPAIGN_TARGET)
      ).to.be.revertedWith("Campaign: need >= 2 validators");
    });

    it("reverts when threshold exceeds validator count", async function () {
      const F = await ethers.getContractFactory("Campaign");
      await expect(
        F.deploy(
          owner.address,
          [validator1.address, validator2.address, validator3.address],
          4,  // > 3
          CAMPAIGN_NAME,
          CAMPAIGN_TARGET
        )
      ).to.be.revertedWith("Campaign: threshold > validator count");
    });

    it("reverts when threshold is zero", async function () {
      const F = await ethers.getContractFactory("Campaign");
      await expect(
        F.deploy(
          owner.address,
          [validator1.address, validator2.address, validator3.address],
          0,
          CAMPAIGN_NAME,
          CAMPAIGN_TARGET
        )
      ).to.be.revertedWith("Campaign: threshold must be >= 1");
    });

    it("reverts on zero validator address", async function () {
      const F = await ethers.getContractFactory("Campaign");
      await expect(
        F.deploy(
          owner.address,
          [ethers.constants.AddressZero, validator2.address, validator3.address],
          2,
          CAMPAIGN_NAME,
          CAMPAIGN_TARGET
        )
      ).to.be.revertedWith("Campaign: zero validator address");
    });

    it("reverts on duplicate validator addresses", async function () {
      const F = await ethers.getContractFactory("Campaign");
      await expect(
        F.deploy(
          owner.address,
          [validator1.address, validator1.address, validator3.address],
          2,
          CAMPAIGN_NAME,
          CAMPAIGN_TARGET
        )
      ).to.be.revertedWith("Campaign: duplicate validator");
    });

    it("reverts on empty campaign name", async function () {
      const F = await ethers.getContractFactory("Campaign");
      await expect(
        F.deploy(
          owner.address,
          [validator1.address, validator2.address, validator3.address],
          2,
          "",
          CAMPAIGN_TARGET
        )
      ).to.be.revertedWith("Campaign: empty name");
    });

    it("supports configurable threshold: 3-of-3 unanimous", async function () {
      const F = await ethers.getContractFactory("Campaign");
      const unanimous = await F.deploy(
        owner.address,
        [validator1.address, validator2.address, validator3.address],
        3,  // unanimous threshold
        "High-Stakes Fund",
        CAMPAIGN_TARGET
      );
      await unanimous.deployed();
      expect(await unanimous.threshold()).to.equal(3);
    });
  });

  // ── Donations ──────────────────────────────────────────────────────────────
  describe("Donations", function () {
    it("accepts ETH via donate()", async function () {
      await expect(campaign.connect(donor1).donate({ value: ONE_ETH }))
        .to.emit(campaign, "Donated")
        .withArgs(donor1.address, ONE_ETH, ONE_ETH);

      expect(await campaign.totalDonated()).to.equal(ONE_ETH);
      expect(await campaign.getContractBalance()).to.equal(ONE_ETH);
    });

    it("accepts ETH via receive() fallback", async function () {
      await donor1.sendTransaction({ to: campaign.address, value: ONE_ETH });
      expect(await campaign.totalDonated()).to.equal(ONE_ETH);
    });

    it("reverts on zero-value donation", async function () {
      await expect(
        campaign.connect(donor1).donate({ value: 0 })
      ).to.be.revertedWith("Campaign: donation must be > 0");
    });

    it("records multiple donations correctly", async function () {
      await campaign.connect(donor1).donate({ value: ONE_ETH });
      await campaign.connect(donor2).donate({ value: TWO_ETH });

      expect(await campaign.totalDonated()).to.equal(ONE_ETH.add(TWO_ETH));
      expect(await campaign.getDonationsCount()).to.equal(2);

      const d0 = await campaign.donations(0);
      expect(d0.donor).to.equal(donor1.address);
      expect(d0.amount).to.equal(ONE_ETH);
    });

    it("accumulates totalDonated across multiple donations", async function () {
      for (let i = 0; i < 5; i++) {
        await campaign.connect(donor1).donate({ value: ONE_ETH });
      }
      expect(await campaign.totalDonated()).to.equal(ONE_ETH.mul(5));
    });
  });

  // ── createRequest ──────────────────────────────────────────────────────────
  describe("createRequest", function () {
    beforeEach(async function () {
      await campaign.connect(donor1).donate({ value: FIVE_ETH });
    });

    it("owner creates a request successfully", async function () {
      await expect(
        campaign.createRequest("Food supplies", beneficiary.address, ONE_ETH, MOCK_CID)
      )
        .to.emit(campaign, "RequestCreated")
        .withArgs(0, owner.address, beneficiary.address, ONE_ETH, MOCK_CID);

      expect(await campaign.getRequestsCount()).to.equal(1);
    });

    it("stores request fields correctly", async function () {
      await campaign.createRequest("Food supplies", beneficiary.address, ONE_ETH, MOCK_CID);
      const [desc, ben, amount, cid, approvals, rejects, executed, rejected] =
        await campaign.getRequestInfo(0);

      expect(desc).to.equal("Food supplies");
      expect(ben).to.equal(beneficiary.address);
      expect(amount).to.equal(ONE_ETH);
      expect(cid).to.equal(MOCK_CID);
      expect(approvals).to.equal(0);
      expect(rejects).to.equal(0);
      expect(executed).to.be.false;
      expect(rejected).to.be.false;
    });

    it("reverts when called by non-owner", async function () {
      await expect(
        campaign
          .connect(stranger)
          .createRequest("Food supplies", beneficiary.address, ONE_ETH, MOCK_CID)
      ).to.be.reverted;
    });

    it("reverts on zero beneficiary address", async function () {
      await expect(
        campaign.createRequest(
          "Food supplies",
          ethers.constants.AddressZero,
          ONE_ETH,
          MOCK_CID
        )
      ).to.be.revertedWith("Campaign: zero beneficiary");
    });

    it("reverts on zero amount", async function () {
      await expect(
        campaign.createRequest("Food supplies", beneficiary.address, 0, MOCK_CID)
      ).to.be.revertedWith("Campaign: amount must be > 0");
    });

    it("reverts when amount exceeds contract balance", async function () {
      await expect(
        campaign.createRequest(
          "Food supplies",
          beneficiary.address,
          ethers.utils.parseEther("100"),
          MOCK_CID
        )
      ).to.be.revertedWith("Campaign: insufficient balance");
    });

    it("reverts on empty IPFS CID", async function () {
      await expect(
        campaign.createRequest("Food supplies", beneficiary.address, ONE_ETH, "")
      ).to.be.revertedWith("Campaign: IPFS CID required");
    });

    it("reverts on empty description", async function () {
      await expect(
        campaign.createRequest("", beneficiary.address, ONE_ETH, MOCK_CID)
      ).to.be.revertedWith("Campaign: empty description");
    });
  });

  // ── vote ───────────────────────────────────────────────────────────────────
  describe("vote", function () {
    beforeEach(async function () {
      await campaign.connect(donor1).donate({ value: FIVE_ETH });
      await campaign.createRequest("Shelter materials", beneficiary.address, ONE_ETH, MOCK_CID);
    });

    it("validator casts approval vote", async function () {
      await expect(campaign.connect(validator1).vote(0, true))
        .to.emit(campaign, "Voted")
        .withArgs(0, validator1.address, true);

      const [, , , , approvals] = await campaign.getRequestInfo(0);
      expect(approvals).to.equal(1);
    });

    it("validator casts rejection vote", async function () {
      await campaign.connect(validator1).vote(0, false);
      const [, , , , , rejects] = await campaign.getRequestInfo(0);
      expect(rejects).to.equal(1);
    });

    it("auto-rejects when rejection count reaches threshold", async function () {
      await campaign.connect(validator1).vote(0, false);
      await expect(campaign.connect(validator2).vote(0, false))
        .to.emit(campaign, "RequestRejected")
        .withArgs(0);

      const [, , , , , , , rejected] = await campaign.getRequestInfo(0);
      expect(rejected).to.be.true;
    });

    it("reverts when non-validator votes", async function () {
      await expect(campaign.connect(stranger).vote(0, true)).to.be.reverted;
    });

    it("reverts when validator votes twice", async function () {
      await campaign.connect(validator1).vote(0, true);
      await expect(campaign.connect(validator1).vote(0, true)).to.be.revertedWith(
        "Campaign: already voted"
      );
    });

    it("reverts on invalid request ID", async function () {
      await expect(campaign.connect(validator1).vote(99, true)).to.be.revertedWith(
        "Campaign: invalid request ID"
      );
    });

    it("reverts vote on already-rejected request", async function () {
      await campaign.connect(validator1).vote(0, false);
      await campaign.connect(validator2).vote(0, false);
      await expect(campaign.connect(validator3).vote(0, true)).to.be.revertedWith(
        "Campaign: already rejected"
      );
    });

    it("tracks hasVoted mapping correctly", async function () {
      expect(await campaign.hasVoted(0, validator1.address)).to.be.false;
      await campaign.connect(validator1).vote(0, true);
      expect(await campaign.hasVoted(0, validator1.address)).to.be.true;
      expect(await campaign.hasVoted(0, validator2.address)).to.be.false;
    });

    it("unanimous threshold (3-of-3): requires all three approvals", async function () {
      const unanimous = await deployCampaign(
        owner, validator1, validator2, validator3,
        3, // threshold = 3
        "Unanimous Fund",
        CAMPAIGN_TARGET
      );
      await donor1.sendTransaction({ to: unanimous.address, value: FIVE_ETH });
      await unanimous.createRequest("Supplies", beneficiary.address, ONE_ETH, MOCK_CID);

      // Two approvals — not enough
      await unanimous.connect(validator1).vote(0, true);
      await unanimous.connect(validator2).vote(0, true);
      await expect(unanimous.releaseFunds(0)).to.be.revertedWith(
        "Campaign: insufficient approvals"
      );

      // Third approval — now threshold met
      await unanimous.connect(validator3).vote(0, true);
      await expect(unanimous.releaseFunds(0)).to.not.be.reverted;
    });
  });

  // ── releaseFunds ────────────────────────────────────────────────────────────
  describe("releaseFunds", function () {
    beforeEach(async function () {
      await campaign.connect(donor1).donate({ value: FIVE_ETH });
      await campaign.createRequest("Medical supplies", beneficiary.address, ONE_ETH, MOCK_CID);
    });

    it("releases funds after threshold approvals", async function () {
      await campaign.connect(validator1).vote(0, true);
      await campaign.connect(validator2).vote(0, true);

      const before = await beneficiary.getBalance();
      await campaign.releaseFunds(0);
      const after = await beneficiary.getBalance();

      expect(after.sub(before)).to.equal(ONE_ETH);

      const [, , , , , , executed] = await campaign.getRequestInfo(0);
      expect(executed).to.be.true;
    });

    it("emits FundsReleased event", async function () {
      await campaign.connect(validator1).vote(0, true);
      await campaign.connect(validator2).vote(0, true);

      await expect(campaign.releaseFunds(0))
        .to.emit(campaign, "FundsReleased")
        .withArgs(0, beneficiary.address, ONE_ETH);
    });

    it("reverts with insufficient approvals", async function () {
      await campaign.connect(validator1).vote(0, true);
      await expect(campaign.releaseFunds(0)).to.be.revertedWith(
        "Campaign: insufficient approvals"
      );
    });

    it("reverts on double-release", async function () {
      await campaign.connect(validator1).vote(0, true);
      await campaign.connect(validator2).vote(0, true);
      await campaign.releaseFunds(0);
      await expect(campaign.releaseFunds(0)).to.be.revertedWith(
        "Campaign: already executed"
      );
    });

    it("reverts on rejected request", async function () {
      await campaign.connect(validator1).vote(0, false);
      await campaign.connect(validator2).vote(0, false);
      await expect(campaign.releaseFunds(0)).to.be.revertedWith(
        "Campaign: request rejected"
      );
    });

    it("reduces contract balance after release", async function () {
      await campaign.connect(validator1).vote(0, true);
      await campaign.connect(validator2).vote(0, true);

      const before = await campaign.getContractBalance();
      await campaign.releaseFunds(0);
      const after  = await campaign.getContractBalance();

      expect(before.sub(after)).to.equal(ONE_ETH);
    });

    it("stranger can trigger releaseFunds after approval", async function () {
      await campaign.connect(validator1).vote(0, true);
      await campaign.connect(validator2).vote(0, true);
      await expect(campaign.connect(stranger).releaseFunds(0)).to.not.be.reverted;
    });
  });

  // ── View helpers ────────────────────────────────────────────────────────────
  describe("View helpers", function () {
    it("isValidator returns correct booleans", async function () {
      expect(await campaign.isValidator(validator1.address)).to.be.true;
      expect(await campaign.isValidator(stranger.address)).to.be.false;
    });

    it("isOwner returns correct boolean", async function () {
      expect(await campaign.isOwner(owner.address)).to.be.true;
      expect(await campaign.isOwner(stranger.address)).to.be.false;
    });

    it("getAllDonations returns full array", async function () {
      await campaign.connect(donor1).donate({ value: ONE_ETH });
      await campaign.connect(donor2).donate({ value: TWO_ETH });

      const all = await campaign.getAllDonations();
      expect(all.length).to.equal(2);
      expect(all[0].donor).to.equal(donor1.address);
      expect(all[1].donor).to.equal(donor2.address);
    });
  });

  // ── Access control ──────────────────────────────────────────────────────────
  describe("Access control", function () {
    it("validator cannot create requests", async function () {
      await campaign.connect(donor1).donate({ value: FIVE_ETH });
      await expect(
        campaign
          .connect(validator1)
          .createRequest("Supplies", beneficiary.address, ONE_ETH, MOCK_CID)
      ).to.be.reverted;
    });

    it("owner cannot vote", async function () {
      await campaign.connect(donor1).donate({ value: FIVE_ETH });
      await campaign.createRequest("Supplies", beneficiary.address, ONE_ETH, MOCK_CID);
      await expect(campaign.connect(owner).vote(0, true)).to.be.reverted;
    });
  });
});

// ─── CampaignFactory tests ──────────────────────────────────────────────────────
describe("CampaignFactory", function () {
  let factory:    CampaignFactory;
  let owner:      SignerWithAddress;
  let validator1: SignerWithAddress;
  let validator2: SignerWithAddress;
  let validator3: SignerWithAddress;
  let stranger:   SignerWithAddress;
  let donor1:     SignerWithAddress;
  let beneficiary:SignerWithAddress;

  beforeEach(async function () {
    [owner, validator1, validator2, validator3, donor1, beneficiary, stranger] =
      await ethers.getSigners();

    const Factory = await ethers.getContractFactory("CampaignFactory");
    factory = (await Factory.deploy()) as CampaignFactory;
    await factory.deployed();
  });

  it("deploys with zero campaigns registered", async function () {
    expect(await factory.getCampaignsCount()).to.equal(0);
  });

  it("createCampaign deploys a new Campaign and registers it", async function () {
    const tx = await factory.connect(owner).createCampaign(
      [validator1.address, validator2.address, validator3.address],
      2,
      "Flood Relief",
      ethers.utils.parseEther("100")
    );
    const receipt = await tx.wait();

    expect(await factory.getCampaignsCount()).to.equal(1);

    const record = await factory.getCampaign(0);
    expect(record.name).to.equal("Flood Relief");
    expect(record.owner).to.equal(owner.address);
    expect(record.validatorCount).to.equal(3);
    expect(record.threshold).to.equal(2);
    expect(record.targetWei).to.equal(ethers.utils.parseEther("100"));
    expect(record.campaignAddress).to.not.equal(ethers.constants.AddressZero);
  });

  it("emits CampaignCreated event with correct args", async function () {
    await expect(
      factory.connect(owner).createCampaign(
        [validator1.address, validator2.address, validator3.address],
        2,
        "Flood Relief",
        ethers.utils.parseEther("100")
      )
    ).to.emit(factory, "CampaignCreated");
  });

  it("caller becomes OWNER_ROLE holder in deployed Campaign", async function () {
    const tx = await factory.connect(owner).createCampaign(
      [validator1.address, validator2.address, validator3.address],
      2,
      "Flood Relief",
      ethers.utils.parseEther("100")
    );
    await tx.wait();

    const record = await factory.getCampaign(0);
    const Campaign = await ethers.getContractFactory("Campaign");
    const campaign = Campaign.attach(record.campaignAddress) as Campaign;

    const OWNER_ROLE = await campaign.OWNER_ROLE();
    expect(await campaign.hasRole(OWNER_ROLE, owner.address)).to.be.true;
    expect(await campaign.hasRole(OWNER_ROLE, factory.address)).to.be.false;
  });

  it("deploys multiple independent campaigns with different configs", async function () {
    // Campaign 1: 2-of-3
    await factory.connect(owner).createCampaign(
      [validator1.address, validator2.address, validator3.address],
      2,
      "Campaign A",
      ethers.utils.parseEther("100")
    );

    // Campaign 2: 3-of-3 unanimous
    await factory.connect(stranger).createCampaign(
      [validator1.address, validator2.address, validator3.address],
      3,
      "Campaign B",
      ethers.utils.parseEther("50")
    );

    expect(await factory.getCampaignsCount()).to.equal(2);

    const recordA = await factory.getCampaign(0);
    const recordB = await factory.getCampaign(1);

    expect(recordA.threshold).to.equal(2);
    expect(recordB.threshold).to.equal(3);
    expect(recordA.owner).to.equal(owner.address);
    expect(recordB.owner).to.equal(stranger.address);

    // Campaign addresses must be distinct
    expect(recordA.campaignAddress).to.not.equal(recordB.campaignAddress);
  });

  it("getCampaigns returns all records", async function () {
    await factory.connect(owner).createCampaign(
      [validator1.address, validator2.address, validator3.address],
      2,
      "Campaign A",
      ethers.utils.parseEther("100")
    );
    await factory.connect(owner).createCampaign(
      [validator1.address, validator2.address, validator3.address],
      2,
      "Campaign B",
      ethers.utils.parseEther("50")
    );

    const all = await factory.getCampaigns();
    expect(all.length).to.equal(2);
    expect(all[0].name).to.equal("Campaign A");
    expect(all[1].name).to.equal("Campaign B");
  });

  it("factory-deployed campaign is fully functional end-to-end", async function () {
    // Deploy via factory
    const tx = await factory.connect(owner).createCampaign(
      [validator1.address, validator2.address, validator3.address],
      2,
      "E2E Test Campaign",
      ethers.utils.parseEther("100")
    );
    await tx.wait();

    const record = await factory.getCampaign(0);
    const Campaign = await ethers.getContractFactory("Campaign");
    const campaign = Campaign.attach(record.campaignAddress) as Campaign;

    // Donate
    await campaign.connect(donor1).donate({ value: FIVE_ETH });
    expect(await campaign.totalDonated()).to.equal(FIVE_ETH);

    // Create request (owner)
    await campaign
      .connect(owner)
      .createRequest("Emergency supplies", beneficiary.address, ONE_ETH, MOCK_CID);

    // Two validators approve
    await campaign.connect(validator1).vote(0, true);
    await campaign.connect(validator2).vote(0, true);

    // Release funds
    const before = await beneficiary.getBalance();
    await campaign.releaseFunds(0);
    const after = await beneficiary.getBalance();

    expect(after.sub(before)).to.equal(ONE_ETH);
  });

  it("getCampaign reverts on out-of-range index", async function () {
    await expect(factory.getCampaign(0)).to.be.revertedWith(
      "CampaignFactory: index out of range"
    );
  });

  it("factory propagates Campaign constructor validation (bad threshold)", async function () {
    await expect(
      factory.createCampaign(
        [validator1.address, validator2.address, validator3.address],
        5,  // threshold > validator count
        "Bad Campaign",
        ethers.utils.parseEther("100")
      )
    ).to.be.revertedWith("Campaign: threshold > validator count");
  });
});