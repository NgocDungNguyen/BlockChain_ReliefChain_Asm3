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
    factory = (await Factory.deploy(
      [validator1.address, validator2.address, validator3.address],
      2,
      0   // minimumStake = 0 so existing tests need no staking
    )) as CampaignFactory;
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
    await expect(factory.getCampaign(0)).to.be.revertedWithCustomError(factory, "IndexOutOfRange");
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

// ─── CampaignFactory — Proposal System ─────────────────────────────────────────
describe("CampaignFactory — Proposal System", function () {
  let factory:    CampaignFactory;
  let admin:      SignerWithAddress;
  let gv1:        SignerWithAddress;
  let gv2:        SignerWithAddress;
  let gv3:        SignerWithAddress;
  let proposer:   SignerWithAddress;
  let donor1:     SignerWithAddress;
  let beneficiary:SignerWithAddress;
  let stranger:   SignerWithAddress;

  const MOCK_CID    = "QmProposalCID1234567890abcdefghijk";
  const PROP_NAME   = "Typhoon Emergency Fund";
  const PROP_TARGET = ethers.utils.parseEther("75");

  // Deploy factory with 3-of-3 global validators, no minimum stake
  async function deployFactory(threshold = 2, minStake: number | ethers.BigNumber = 0) {
    const F = await ethers.getContractFactory("CampaignFactory");
    const f = (await F.connect(admin).deploy(
      [gv1.address, gv2.address, gv3.address],
      threshold,
      minStake
    )) as CampaignFactory;
    await f.deployed();
    return f;
  }

  async function submitProposal(f: CampaignFactory, sender = proposer) {
    return f.connect(sender).submitProposal(
      PROP_NAME,
      PROP_TARGET,
      [gv1.address, gv2.address, gv3.address],
      2,
      MOCK_CID
    );
  }

  beforeEach(async function () {
    [admin, gv1, gv2, gv3, proposer, donor1, beneficiary, stranger] =
      await ethers.getSigners();
    factory = await deployFactory();
  });

  // ── Constructor ──────────────────────────────────────────────────────────────
  describe("Constructor", function () {
    it("stores globalValidatorThreshold and globalValidatorCount", async function () {
      expect(await factory.globalValidatorThreshold()).to.equal(2);
      expect(await factory.globalValidatorCount()).to.equal(3);
    });

    it("stores minimumStake", async function () {
      const minStake = ethers.utils.parseEther("0.01");
      const f = await deployFactory(2, minStake);
      expect(await f.minimumStake()).to.equal(minStake);
    });

    it("assigns GLOBAL_VALIDATOR_ROLE to all supplied validators", async function () {
      expect(await factory.isGlobalValidator(gv1.address)).to.be.true;
      expect(await factory.isGlobalValidator(gv2.address)).to.be.true;
      expect(await factory.isGlobalValidator(gv3.address)).to.be.true;
      expect(await factory.isGlobalValidator(stranger.address)).to.be.false;
    });

    it("reverts with fewer than 2 global validators", async function () {
      const F = await ethers.getContractFactory("CampaignFactory");
      await expect(
        F.deploy([gv1.address], 1, 0)
      ).to.be.revertedWithCustomError(factory, "TooFewValidators");
    });

    it("reverts when threshold exceeds validator count", async function () {
      const F = await ethers.getContractFactory("CampaignFactory");
      await expect(
        F.deploy([gv1.address, gv2.address], 3, 0)
      ).to.be.revertedWithCustomError(factory, "BadThreshold");
    });

    it("reverts when threshold is zero", async function () {
      const F = await ethers.getContractFactory("CampaignFactory");
      await expect(
        F.deploy([gv1.address, gv2.address], 0, 0)
      ).to.be.revertedWithCustomError(factory, "BadThreshold");
    });
  });

  // ── submitProposal ────────────────────────────────────────────────────────────
  describe("submitProposal", function () {
    it("any wallet can submit a proposal", async function () {
      await expect(submitProposal(factory, stranger)).to.not.be.reverted;
    });

    it("stores all proposal fields correctly", async function () {
      await submitProposal(factory);
      const p = await factory.getProposal(0);
      expect(p.proposer).to.equal(proposer.address);
      expect(p.name).to.equal(PROP_NAME);
      expect(p.targetWei).to.equal(PROP_TARGET);
      expect(p.ipfsCID).to.equal(MOCK_CID);
      expect(p.threshold).to.equal(2);
      expect(p.approvalCount).to.equal(0);
      expect(p.rejectionCount).to.equal(0);
      expect(p.executed).to.be.false;
      expect(p.rejected).to.be.false;
    });

    it("emits ProposalSubmitted with correct args", async function () {
      await expect(submitProposal(factory))
        .to.emit(factory, "ProposalSubmitted")
        .withArgs(0, proposer.address, PROP_NAME, PROP_TARGET, MOCK_CID);
    });

    it("increments getProposalsCount", async function () {
      expect(await factory.getProposalsCount()).to.equal(0);
      await submitProposal(factory);
      expect(await factory.getProposalsCount()).to.equal(1);
    });

    it("reverts on empty name", async function () {
      await expect(
        factory.connect(proposer).submitProposal("", PROP_TARGET, [gv1.address, gv2.address], 1, MOCK_CID)
      ).to.be.revertedWithCustomError(factory, "EmptyName");
    });

    it("reverts on zero targetWei", async function () {
      await expect(
        factory.connect(proposer).submitProposal(PROP_NAME, 0, [gv1.address, gv2.address], 1, MOCK_CID)
      ).to.be.revertedWithCustomError(factory, "ZeroTarget");
    });

    it("reverts on empty IPFS CID", async function () {
      await expect(
        factory.connect(proposer).submitProposal(PROP_NAME, PROP_TARGET, [gv1.address, gv2.address], 1, "")
      ).to.be.revertedWithCustomError(factory, "EmptyIpfsCID");
    });

    it("reverts when campaign validators fewer than 2", async function () {
      await expect(
        factory.connect(proposer).submitProposal(PROP_NAME, PROP_TARGET, [gv1.address], 1, MOCK_CID)
      ).to.be.revertedWithCustomError(factory, "TooFewCampaignValidators");
    });

    it("reverts when campaign threshold exceeds campaign validator count", async function () {
      await expect(
        factory.connect(proposer).submitProposal(PROP_NAME, PROP_TARGET, [gv1.address, gv2.address], 3, MOCK_CID)
      ).to.be.revertedWithCustomError(factory, "BadCampaignThreshold");
    });
  });

  // ── voteOnProposal — access & stake ──────────────────────────────────────────
  describe("voteOnProposal — access & stake", function () {
    beforeEach(async function () {
      await submitProposal(factory);
    });

    it("non-global-validator cannot vote", async function () {
      await expect(
        factory.connect(stranger).voteOnProposal(0, true)
      ).to.be.reverted;
    });

    it("global validator casts approval vote and emits ProposalVoted", async function () {
      await expect(factory.connect(gv1).voteOnProposal(0, true))
        .to.emit(factory, "ProposalVoted")
        .withArgs(0, gv1.address, true);
    });

    it("global validator casts rejection vote and emits ProposalVoted", async function () {
      await expect(factory.connect(gv1).voteOnProposal(0, false))
        .to.emit(factory, "ProposalVoted")
        .withArgs(0, gv1.address, false);
    });

    it("double-vote reverts", async function () {
      await factory.connect(gv1).voteOnProposal(0, true);
      await expect(
        factory.connect(gv1).voteOnProposal(0, true)
      ).to.be.revertedWithCustomError(factory, "AlreadyVoted");
    });

    it("invalid proposal ID reverts", async function () {
      await expect(
        factory.connect(gv1).voteOnProposal(99, true)
      ).to.be.revertedWithCustomError(factory, "InvalidProposalId");
    });

    it("with minimumStake > 0: voting without stake reverts", async function () {
      const stakeAmount = ethers.utils.parseEther("0.01");
      const f = await deployFactory(2, stakeAmount);
      await f.connect(proposer).submitProposal(
        PROP_NAME, PROP_TARGET, [gv1.address, gv2.address], 1, MOCK_CID
      );
      // gv1 has no stake yet
      await expect(
        f.connect(gv1).voteOnProposal(0, true)
      ).to.be.revertedWithCustomError(f, "InsufficientStake");
    });
  });

  // ── voteOnProposal — approval path ───────────────────────────────────────────
  describe("voteOnProposal — approval path", function () {
    beforeEach(async function () {
      await submitProposal(factory);
    });

    it("1 approval below threshold does not deploy campaign", async function () {
      await factory.connect(gv1).voteOnProposal(0, true);
      expect(await factory.getCampaignsCount()).to.equal(0);
    });

    it("reaching approval threshold auto-deploys campaign", async function () {
      await factory.connect(gv1).voteOnProposal(0, true);
      await factory.connect(gv2).voteOnProposal(0, true);
      expect(await factory.getCampaignsCount()).to.equal(1);
    });

    it("emits ProposalApproved with correct proposalId and campaignId", async function () {
      await factory.connect(gv1).voteOnProposal(0, true);
      const tx = await factory.connect(gv2).voteOnProposal(0, true);
      const receipt = await tx.wait();
      const event = receipt.events?.find((e) => e.event === "ProposalApproved");
      expect(event).to.not.be.undefined;
      expect(event!.args!.proposalId).to.equal(0);
      expect(event!.args!.campaignId).to.equal(0);
      expect(event!.args!.campaignAddress).to.not.equal(ethers.constants.AddressZero);
    });

    it("also emits CampaignCreated on approval", async function () {
      await factory.connect(gv1).voteOnProposal(0, true);
      await expect(factory.connect(gv2).voteOnProposal(0, true))
        .to.emit(factory, "CampaignCreated");
    });

    it("deployed campaign has correct name and target", async function () {
      await factory.connect(gv1).voteOnProposal(0, true);
      await factory.connect(gv2).voteOnProposal(0, true);
      const record = await factory.getCampaign(0);
      expect(record.name).to.equal(PROP_NAME);
      expect(record.targetWei).to.equal(PROP_TARGET);
      expect(record.threshold).to.equal(2);
    });

    it("deployed campaign owner is the proposer", async function () {
      await factory.connect(gv1).voteOnProposal(0, true);
      await factory.connect(gv2).voteOnProposal(0, true);
      const record = await factory.getCampaign(0);
      expect(record.owner).to.equal(proposer.address);

      const CampaignF = await ethers.getContractFactory("Campaign");
      const campaign = CampaignF.attach(record.campaignAddress) as Campaign;
      const OWNER_ROLE = await campaign.OWNER_ROLE();
      expect(await campaign.hasRole(OWNER_ROLE, proposer.address)).to.be.true;
    });

    it("approved campaign appears in getCampaigns()", async function () {
      await factory.connect(gv1).voteOnProposal(0, true);
      await factory.connect(gv2).voteOnProposal(0, true);
      const all = await factory.getCampaigns();
      expect(all.length).to.equal(1);
      expect(all[0].name).to.equal(PROP_NAME);
    });

    it("vote on already-executed proposal reverts", async function () {
      await factory.connect(gv1).voteOnProposal(0, true);
      await factory.connect(gv2).voteOnProposal(0, true);
      await expect(
        factory.connect(gv3).voteOnProposal(0, true)
      ).to.be.revertedWithCustomError(factory, "AlreadyExecuted");
    });

    it("approved campaign is fully functional end-to-end", async function () {
      await factory.connect(gv1).voteOnProposal(0, true);
      await factory.connect(gv2).voteOnProposal(0, true);

      const record = await factory.getCampaign(0);
      const CampaignF = await ethers.getContractFactory("Campaign");
      const campaign = CampaignF.attach(record.campaignAddress) as Campaign;

      // Proposer is owner — donate then create request
      await campaign.connect(donor1).donate({ value: ethers.utils.parseEther("5") });
      await campaign.connect(proposer).createRequest(
        "Emergency supplies", beneficiary.address,
        ethers.utils.parseEther("1"), MOCK_CID
      );
      await campaign.connect(gv1).vote(0, true);
      await campaign.connect(gv2).vote(0, true);

      const before = await beneficiary.getBalance();
      await campaign.releaseFunds(0);
      const after = await beneficiary.getBalance();
      expect(after.sub(before)).to.equal(ethers.utils.parseEther("1"));
    });
  });

  // ── voteOnProposal — rejection path ──────────────────────────────────────────
  describe("voteOnProposal — rejection path", function () {
    beforeEach(async function () {
      await submitProposal(factory);
    });

    it("reaching rejection threshold marks proposal as rejected", async function () {
      await factory.connect(gv1).voteOnProposal(0, false);
      await factory.connect(gv2).voteOnProposal(0, false);
      const p = await factory.getProposal(0);
      expect(p.rejected).to.be.true;
    });

    it("emits ProposalRejected", async function () {
      await factory.connect(gv1).voteOnProposal(0, false);
      await expect(factory.connect(gv2).voteOnProposal(0, false))
        .to.emit(factory, "ProposalRejected")
        .withArgs(0);
    });

    it("rejected proposal does not deploy a campaign", async function () {
      await factory.connect(gv1).voteOnProposal(0, false);
      await factory.connect(gv2).voteOnProposal(0, false);
      expect(await factory.getCampaignsCount()).to.equal(0);
    });

    it("vote on already-rejected proposal reverts", async function () {
      await factory.connect(gv1).voteOnProposal(0, false);
      await factory.connect(gv2).voteOnProposal(0, false);
      await expect(
        factory.connect(gv3).voteOnProposal(0, false)
      ).to.be.revertedWithCustomError(factory, "AlreadyRejected");
    });
  });

  // ── proposalHasVoted ──────────────────────────────────────────────────────────
  describe("proposalHasVoted", function () {
    beforeEach(async function () {
      await submitProposal(factory);
    });

    it("returns false before voting", async function () {
      expect(await factory.proposalHasVoted(0, gv1.address)).to.be.false;
    });

    it("returns true after voting", async function () {
      await factory.connect(gv1).voteOnProposal(0, true);
      expect(await factory.proposalHasVoted(0, gv1.address)).to.be.true;
    });

    it("is independent per validator per proposal", async function () {
      await factory.connect(gv1).voteOnProposal(0, true);
      expect(await factory.proposalHasVoted(0, gv2.address)).to.be.false;
    });
  });

  // ── Multiple proposals ────────────────────────────────────────────────────────
  describe("Multiple proposals", function () {
    it("two concurrent proposals have independent vote tallies", async function () {
      await submitProposal(factory);
      await factory.connect(proposer).submitProposal(
        "Second Campaign", PROP_TARGET, [gv1.address, gv2.address], 1, MOCK_CID
      );
      expect(await factory.getProposalsCount()).to.equal(2);

      await factory.connect(gv1).voteOnProposal(0, true);
      // proposal 1 still has 0 approvals
      const p1 = await factory.getProposal(1);
      expect(p1.approvalCount).to.equal(0);
    });

    it("approving proposal 1 does not affect proposal 0", async function () {
      await submitProposal(factory);
      await submitProposal(factory);
      await factory.connect(gv1).voteOnProposal(1, true);
      await factory.connect(gv2).voteOnProposal(1, true);
      // proposal 0 still pending
      const p0 = await factory.getProposal(0);
      expect(p0.executed).to.be.false;
      expect(await factory.getCampaignsCount()).to.equal(1);
    });
  });

  // ── Backwards compatibility ───────────────────────────────────────────────────
  describe("Backwards compatibility", function () {
    it("createCampaign still works after factory upgrade", async function () {
      await factory.connect(admin).createCampaign(
        [gv1.address, gv2.address, gv3.address],
        2,
        "Direct Campaign",
        ethers.utils.parseEther("100")
      );
      expect(await factory.getCampaignsCount()).to.equal(1);
      const record = await factory.getCampaign(0);
      expect(record.owner).to.equal(admin.address);
    });
  });
});

// ─── CampaignFactory — Staking ──────────────────────────────────────────────────
describe("CampaignFactory — Staking", function () {
  let factory:    CampaignFactory;
  let admin:      SignerWithAddress;
  let gv1:        SignerWithAddress;
  let gv2:        SignerWithAddress;
  let gv3:        SignerWithAddress;
  let stranger:   SignerWithAddress;

  const MIN_STAKE  = ethers.utils.parseEther("0.01");
  const STAKE_AMOUNT = ethers.utils.parseEther("0.05");

  beforeEach(async function () {
    [admin, gv1, gv2, gv3, stranger] = await ethers.getSigners();
    const F = await ethers.getContractFactory("CampaignFactory");
    factory = (await F.connect(admin).deploy(
      [gv1.address, gv2.address, gv3.address],
      2,
      MIN_STAKE
    )) as CampaignFactory;
    await factory.deployed();
  });

  // ── stake() ───────────────────────────────────────────────────────────────────
  describe("stake()", function () {
    it("global validator can stake ETH", async function () {
      await factory.connect(gv1).stake({ value: STAKE_AMOUNT });
      expect(await factory.validatorStake(gv1.address)).to.equal(STAKE_AMOUNT);
    });

    it("validatorStake accumulates across multiple calls", async function () {
      await factory.connect(gv1).stake({ value: STAKE_AMOUNT });
      await factory.connect(gv1).stake({ value: STAKE_AMOUNT });
      expect(await factory.validatorStake(gv1.address)).to.equal(STAKE_AMOUNT.mul(2));
    });

    it("emits ValidatorStaked with correct args", async function () {
      await expect(factory.connect(gv1).stake({ value: STAKE_AMOUNT }))
        .to.emit(factory, "ValidatorStaked")
        .withArgs(gv1.address, STAKE_AMOUNT, STAKE_AMOUNT);
    });

    it("non-validator cannot stake", async function () {
      await expect(
        factory.connect(stranger).stake({ value: STAKE_AMOUNT })
      ).to.be.reverted;
    });

    it("zero-value stake reverts", async function () {
      await expect(
        factory.connect(gv1).stake({ value: 0 })
      ).to.be.revertedWithCustomError(factory, "StakeMustBePositive");
    });
  });

  // ── withdrawStake() ───────────────────────────────────────────────────────────
  describe("withdrawStake()", function () {
    beforeEach(async function () {
      await factory.connect(gv1).stake({ value: STAKE_AMOUNT });
    });

    it("can withdraw full stake", async function () {
      await factory.connect(gv1).withdrawStake(STAKE_AMOUNT);
      expect(await factory.validatorStake(gv1.address)).to.equal(0);
    });

    it("partial withdraw leaves correct remainder", async function () {
      const withdraw = ethers.utils.parseEther("0.02");
      await factory.connect(gv1).withdrawStake(withdraw);
      expect(await factory.validatorStake(gv1.address)).to.equal(STAKE_AMOUNT.sub(withdraw));
    });

    it("partial withdraw that drops below minimumStake reverts", async function () {
      // Leave 0.005 ETH which is below MIN_STAKE (0.01)
      const withdraw = ethers.utils.parseEther("0.045");
      await expect(
        factory.connect(gv1).withdrawStake(withdraw)
      ).to.be.revertedWithCustomError(factory, "WouldDropBelowMinimum");
    });

    it("reverts when amount exceeds stake", async function () {
      await expect(
        factory.connect(gv1).withdrawStake(ethers.utils.parseEther("1"))
      ).to.be.revertedWithCustomError(factory, "InsufficientStake");
    });
  });

  // ── slashValidator() ──────────────────────────────────────────────────────────
  describe("slashValidator()", function () {
    beforeEach(async function () {
      await factory.connect(gv1).stake({ value: STAKE_AMOUNT });
    });

    it("admin can slash a validator's stake", async function () {
      await factory.connect(admin).slashValidator(gv1.address, MIN_STAKE);
      expect(await factory.validatorStake(gv1.address)).to.equal(STAKE_AMOUNT.sub(MIN_STAKE));
    });

    it("emits ValidatorSlashed", async function () {
      await expect(factory.connect(admin).slashValidator(gv1.address, MIN_STAKE))
        .to.emit(factory, "ValidatorSlashed")
        .withArgs(gv1.address, MIN_STAKE, admin.address);
    });

    it("non-admin cannot slash", async function () {
      await expect(
        factory.connect(gv2).slashValidator(gv1.address, MIN_STAKE)
      ).to.be.reverted;
    });

    it("reverts when slash amount exceeds stake", async function () {
      await expect(
        factory.connect(admin).slashValidator(gv1.address, ethers.utils.parseEther("1"))
      ).to.be.revertedWithCustomError(factory, "InsufficientStake");
    });

    it("reverts when target is not a validator", async function () {
      await expect(
        factory.connect(admin).slashValidator(stranger.address, MIN_STAKE)
      ).to.be.revertedWithCustomError(factory, "NotAValidator");
    });

    it("slashed ETH transfers to admin", async function () {
      const before = await admin.getBalance();
      const slashTx = await factory.connect(admin).slashValidator(gv1.address, MIN_STAKE);
      const receipt = await slashTx.wait();
      const gasCost = receipt.gasUsed.mul(slashTx.gasPrice ?? 0);
      const after = await admin.getBalance();
      expect(after.sub(before).add(gasCost)).to.equal(MIN_STAKE);
    });
  });

  // ── stake + vote integration ──────────────────────────────────────────────────
  describe("stake + vote integration", function () {
    it("validator with sufficient stake can vote on proposals", async function () {
      await factory.connect(gv1).stake({ value: STAKE_AMOUNT });
      await factory.connect(gv2).stake({ value: STAKE_AMOUNT });

      await factory.connect(stranger).submitProposal(
        "Flood Fund", ethers.utils.parseEther("50"),
        [gv1.address, gv2.address], 1,
        "QmStakeTestCID"
      );
      await expect(factory.connect(gv1).voteOnProposal(0, true)).to.not.be.reverted;
      await expect(factory.connect(gv2).voteOnProposal(0, true)).to.not.be.reverted;
      expect(await factory.getCampaignsCount()).to.equal(1);
    });
  });
});