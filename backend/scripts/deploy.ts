import { ethers } from "hardhat";

/**
 * Deployment script for CampaignFactory + two Campaign instances.
 *
 * Account layout:
 *   accounts[0]  = deployer / factory owner / campaign owner
 *   accounts[1]  = validator 1
 *   accounts[2]  = validator 2
 *   accounts[3]  = validator 3
 *   accounts[4]  = donor 1
 *   accounts[5]  = donor 2
 *   accounts[6]  = donor 3
 *   accounts[7]  = donor 4
 *   accounts[8]  = beneficiary
 *
 * Campaign 1: "Vietnam Flood Relief 2026"
 *   validators [1,2,3], threshold 2 (2-of-3 — standard multisig)
 *
 * Campaign 2: "Earthquake Emergency Fund"
 *   validators [1,2,3], threshold 3 (3-of-3 — unanimous approval required)
 *   Demonstrates configurable threshold; stricter governance for higher-risk funds.
 */
async function main() {
  const signers = await ethers.getSigners();

  const deployer    = signers[0];
  const validator1  = signers[1];
  const validator2  = signers[2];
  const validator3  = signers[3];
  const donor1      = signers[4];
  const donor2      = signers[5];
  const donor3      = signers[6];
  const donor4      = signers[7];
  const beneficiary = signers[8];

  console.log("=".repeat(60));
  console.log("ReliefChain — CampaignFactory Deployment");
  console.log("=".repeat(60));
  console.log("Deployer   :", deployer.address);
  console.log("Validator1 :", validator1.address);
  console.log("Validator2 :", validator2.address);
  console.log("Validator3 :", validator3.address);
  console.log("Beneficiary:", beneficiary.address);

  // ── Deploy factory ────────────────────────────────────────────────────────
  const Factory = await ethers.getContractFactory("CampaignFactory");
  const factory = await Factory.deploy();
  await factory.deployed();
  console.log("\nCampaignFactory deployed at:", factory.address);

  // ── Create Campaign 1: Vietnam Flood Relief 2026 ──────────────────────────
  // Validators: [1, 2, 3], threshold: 2  (2-of-3 multisig)
  console.log("\nCreating Campaign 1: Vietnam Flood Relief 2026...");
  const tx1 = await factory.connect(deployer).createCampaign(
    [validator1.address, validator2.address, validator3.address],
    2,
    "Vietnam Flood Relief 2026",
    ethers.utils.parseEther("100"),
    { gasLimit: 3_000_000 }
  );
  const receipt1 = await tx1.wait();

  // Parse CampaignCreated event to extract the deployed address
  const iface  = factory.interface;
  const event1 = receipt1.events?.find((e) => e.event === "CampaignCreated");
  const campaign1Address: string = event1?.args?.campaignAddress ?? "";

  console.log("Campaign 1 address:", campaign1Address);
  console.log("  Threshold : 2 of 3 validators (standard multisig)");
  console.log("  Target    : 100 ETH");

  // ── Create Campaign 2: Earthquake Emergency Fund ──────────────────────────
  // Same validator set, threshold 3 (unanimous — stricter governance)
  console.log("\nCreating Campaign 2: Earthquake Emergency Fund...");
  const tx2 = await factory.connect(deployer).createCampaign(
    [validator1.address, validator2.address, validator3.address],
    3,
    "Earthquake Emergency Fund",
    ethers.utils.parseEther("50"),
    { gasLimit: 3_000_000 }
  );
  const receipt2 = await tx2.wait();

  const event2 = receipt2.events?.find((e) => e.event === "CampaignCreated");
  const campaign2Address: string = event2?.args?.campaignAddress ?? "";

  console.log("Campaign 2 address:", campaign2Address);
  console.log("  Threshold : 3 of 3 validators (unanimous — stricter governance)");
  console.log("  Target    : 50 ETH");

  // ── Attach to Campaign 1 and simulate activity ────────────────────────────
  const Campaign = await ethers.getContractFactory("Campaign");
  const campaign1 = Campaign.attach(campaign1Address);

  // Simulate donations to Campaign 1
  const donationAmounts = [
    ethers.utils.parseEther("5"),
    ethers.utils.parseEther("10"),
    ethers.utils.parseEther("7.5"),
    ethers.utils.parseEther("3"),
  ];
  const donors = [donor1, donor2, donor3, donor4];

  console.log("\nSimulating donations to Campaign 1...");
  for (let i = 0; i < donors.length; i++) {
    const gasEstimate = await campaign1
      .connect(donors[i])
      .estimateGas.donate({ value: donationAmounts[i] });
    const gasLimit = gasEstimate.mul(120).div(100);

    const tx = await campaign1.connect(donors[i]).donate({
      value: donationAmounts[i],
      gasLimit,
    });
    await tx.wait();
    console.log(
      `  Donor${i + 1} donated ${ethers.utils.formatEther(donationAmounts[i])} ETH`
    );
  }

  const totalDonated = await campaign1.totalDonated();
  console.log("Total donated:", ethers.utils.formatEther(totalDonated), "ETH");

  // Simulate spending request on Campaign 1
  const requestAmount = ethers.utils.parseEther("2");
  const mockCID       = "QmReliefChainMockEvidenceCID1234567890abcdef";

  console.log("\nCreating spending request on Campaign 1...");
  const createTx = await campaign1.connect(deployer).createRequest(
    "Emergency food and water supplies for flood victims — Hoa Binh Province",
    beneficiary.address,
    requestAmount,
    mockCID,
    { gasLimit: 300_000 }
  );
  await createTx.wait();
  console.log("Request 0 created. CID:", mockCID);

  // Two validators approve
  console.log("\nValidator1 approving request 0...");
  await (await campaign1.connect(validator1).vote(0, true, { gasLimit: 150_000 })).wait();

  console.log("Validator2 approving request 0...");
  await (await campaign1.connect(validator2).vote(0, true, { gasLimit: 150_000 })).wait();

  // Release funds
  console.log("\nReleasing funds for request 0...");
  await (await campaign1.releaseFunds(0, { gasLimit: 150_000 })).wait();
  console.log("Funds released to:", beneficiary.address);

  // ── Verify factory registry ───────────────────────────────────────────────
  const count = await factory.getCampaignsCount();
  console.log("\nFactory registry: " + count.toString() + " campaigns registered");

  // ── Output for frontend .env ───────────────────────────────────────────────
  console.log("\n" + "=".repeat(60));
  console.log("FRONTEND .env VALUES — copy these into frontend/.env");
  console.log("=".repeat(60));
  console.log(`VITE_FACTORY_ADDRESS=${factory.address}`);
  console.log(`VITE_CONTRACT_ADDRESS=${campaign1Address}`);
  console.log(`VITE_VALIDATOR_1=${validator1.address}`);
  console.log(`VITE_VALIDATOR_2=${validator2.address}`);
  console.log(`VITE_VALIDATOR_3=${validator3.address}`);
  console.log(`VITE_CHAIN_ID=31337`);
  console.log(`VITE_RPC_URL=http://127.0.0.1:8545`);
  console.log("=".repeat(60));
  console.log("\nCampaign 1 (Flood Relief)     :", campaign1Address);
  console.log("Campaign 2 (Earthquake Fund)  :", campaign2Address);
  console.log("Switch between them in the frontend campaign selector.");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });