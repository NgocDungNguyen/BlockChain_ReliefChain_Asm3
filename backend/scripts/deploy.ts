import { ethers } from "hardhat";

/**
 * V3 Deployment script — CampaignFactory with proposal governance + staking.
 *
 * Account layout:
 *   accounts[0]  = deployer / admin
 *   accounts[1]  = globalValidator1 (gv1)
 *   accounts[2]  = globalValidator2 (gv2)
 *   accounts[3]  = globalValidator3 (gv3)
 *   accounts[4]  = globalValidator4 (gv4)
 *   accounts[5]  = globalValidator5 (gv5)
 *   accounts[6]  = donor1
 *   accounts[7]  = donor2
 *   accounts[8]  = donor3
 *   accounts[9]  = proposer (stranger / any organizer wallet)
 *   accounts[10] = beneficiary
 *
 * Factory: 3-of-5 global validator threshold, 0.01 ETH minimum stake.
 * Pre-seeded demo campaigns (via direct createCampaign — available immediately).
 * Proposal governance demo: proposer submits, 3 validators approve → auto-deploy.
 * Slash demo: admin slashes a validator as economic penalty illustration.
 */
async function main() {
  const signers = await ethers.getSigners();

  const deployer = signers[0];
  const gv1      = signers[1];
  const gv2      = signers[2];
  const gv3      = signers[3];
  const gv4      = signers[4];
  const gv5      = signers[5];
  const donor1   = signers[6];
  const donor2   = signers[7];
  const donor3   = signers[8];
  const proposer = signers[9];
  const beneficiary = signers[10];

  const globalValidators = [gv1.address, gv2.address, gv3.address, gv4.address, gv5.address];
  const minimumStake     = ethers.utils.parseEther("0.01");

  console.log("=".repeat(60));
  console.log("ReliefChain V3 — CampaignFactory + Proposal Governance");
  console.log("=".repeat(60));
  console.log("Deployer          :", deployer.address);
  console.log("Global Validator 1:", gv1.address);
  console.log("Global Validator 2:", gv2.address);
  console.log("Global Validator 3:", gv3.address);
  console.log("Global Validator 4:", gv4.address);
  console.log("Global Validator 5:", gv5.address);
  console.log("Proposer (stranger):", proposer.address);
  console.log("Beneficiary       :", beneficiary.address);

  // ── Deploy factory: 3-of-5 global threshold, 0.01 ETH minimum stake ─────────
  const Factory = await ethers.getContractFactory("CampaignFactory");
  const factory = await Factory.connect(deployer).deploy(
    globalValidators,
    3,            // 3-of-5 approval threshold
    minimumStake, // validators must stake ≥ 0.01 ETH to vote
    { gasLimit: 5_000_000 }
  );
  await factory.deployed();
  console.log("\nCampaignFactory deployed at:", factory.address);
  console.log("  Global validators : 5 (3-of-5 threshold)");
  console.log("  Minimum stake     : 0.01 ETH per validator");

  // ── Validators stake ETH (skin-in-the-game for proposal voting) ──────────────
  console.log("\nValidators staking ETH...");
  const stakePerValidator = ethers.utils.parseEther("0.05");
  for (const [i, gv] of [gv1, gv2, gv3, gv4, gv5].entries()) {
    await (await factory.connect(gv).stake({ value: stakePerValidator, gasLimit: 100_000 })).wait();
    console.log(`  gv${i + 1} staked 0.05 ETH (stake: ${ethers.utils.formatEther(await factory.validatorStake(gv.address))} ETH)`);
  }

  // ── Pre-seeded demo Campaign 1: Vietnam Flood Relief 2026 ────────────────────
  // Direct creation — immediately available in campaign selector on frontend launch.
  console.log("\nCreating demo Campaign 1: Vietnam Flood Relief 2026...");
  const tx1 = await factory.connect(deployer).createCampaign(
    globalValidators,
    3,
    "Vietnam Flood Relief 2026",
    ethers.utils.parseEther("100"),
    { gasLimit: 3_000_000 }
  );
  const r1 = await tx1.wait();
  const ev1 = r1.events?.find((e) => e.event === "CampaignCreated");
  const campaign1Address: string = ev1?.args?.campaignAddress ?? "";
  console.log("Campaign 1 address:", campaign1Address);
  console.log("  Threshold: 3-of-5 validators");

  // ── Pre-seeded demo Campaign 2: Earthquake Emergency Fund ────────────────────
  console.log("\nCreating demo Campaign 2: Earthquake Emergency Fund...");
  const tx2 = await factory.connect(deployer).createCampaign(
    globalValidators,
    5,
    "Earthquake Emergency Fund",
    ethers.utils.parseEther("50"),
    { gasLimit: 3_000_000 }
  );
  const r2 = await tx2.wait();
  const ev2 = r2.events?.find((e) => e.event === "CampaignCreated");
  const campaign2Address: string = ev2?.args?.campaignAddress ?? "";
  console.log("Campaign 2 address:", campaign2Address);
  console.log("  Threshold: 5-of-5 validators (unanimous)");

  // ── Simulate donations to Campaign 1 ─────────────────────────────────────────
  const Campaign = await ethers.getContractFactory("Campaign");
  const campaign1 = Campaign.attach(campaign1Address);

  console.log("\nSimulating donations to Campaign 1...");
  const donationData = [
    { signer: donor1, amount: "5"  },
    { signer: donor2, amount: "10" },
    { signer: donor3, amount: "7.5"},
  ];
  for (const { signer, amount } of donationData) {
    const value = ethers.utils.parseEther(amount);
    const gasEst = await campaign1.connect(signer).estimateGas.donate({ value });
    await (await campaign1.connect(signer).donate({ value, gasLimit: gasEst.mul(120).div(100) })).wait();
    console.log(`  Donor donated ${amount} ETH`);
  }
  console.log("Total donated:", ethers.utils.formatEther(await campaign1.totalDonated()), "ETH");

  // Simulate spending request and approval on Campaign 1
  const reqAmount = ethers.utils.parseEther("2");
  const mockCID   = "QmReliefChainMockEvidenceCID1234567890abcdef";
  console.log("\nCreating spending request on Campaign 1...");
  await (await campaign1.connect(deployer).createRequest(
    "Emergency food and water supplies — Hoa Binh Province",
    beneficiary.address, reqAmount, mockCID, { gasLimit: 300_000 }
  )).wait();

  console.log("gv1 approving...");
  await (await campaign1.connect(gv1).vote(0, true, { gasLimit: 150_000 })).wait();
  console.log("gv2 approving...");
  await (await campaign1.connect(gv2).vote(0, true, { gasLimit: 150_000 })).wait();
  console.log("gv3 approving (threshold met)...");
  await (await campaign1.connect(gv3).vote(0, true, { gasLimit: 150_000 })).wait();
  console.log("Releasing funds...");
  await (await campaign1.releaseFunds(0, { gasLimit: 150_000 })).wait();
  console.log("Funds released to:", beneficiary.address);

  // ── Proposal governance demo ──────────────────────────────────────────────────
  console.log("\n" + "-".repeat(60));
  console.log("DEMO: Proposal Governance Pipeline");
  console.log("-".repeat(60));

  const proposalCID = "QmProposalEvidenceCID_TyphoonFund_2026abcdef1234";
  console.log("Proposer submitting campaign proposal with IPFS evidence...");
  const propTx = await factory.connect(proposer).submitProposal(
    "Typhoon Emergency Fund 2026",
    ethers.utils.parseEther("75"),
    globalValidators,
    3,
    proposalCID,
    { gasLimit: 500_000 }
  );
  await propTx.wait();
  console.log("Proposal 0 submitted by:", proposer.address);
  console.log("Evidence CID:", proposalCID);

  console.log("\ngv1 approving proposal 0...");
  await (await factory.connect(gv1).voteOnProposal(0, true, { gasLimit: 5_000_000 })).wait();
  console.log("gv2 approving proposal 0...");
  await (await factory.connect(gv2).voteOnProposal(0, true, { gasLimit: 5_000_000 })).wait();
  console.log("gv3 approving proposal 0 — threshold reached, campaign auto-deployed...");
  const approveTx = await factory.connect(gv3).voteOnProposal(0, true, { gasLimit: 5_000_000 });
  const approveReceipt = await approveTx.wait();
  const approvedEv = approveReceipt.events?.find((e) => e.event === "ProposalApproved");
  const campaign3Address: string = approvedEv?.args?.campaignAddress ?? "";
  console.log("Campaign 3 (via proposal) deployed at:", campaign3Address);
  console.log("  Owner (proposer):", proposer.address);

  const totalCampaigns = await factory.getCampaignsCount();
  console.log("\nFactory registry total:", totalCampaigns.toString(), "campaigns");

  // ── Slash demo ────────────────────────────────────────────────────────────────
  console.log("\n" + "-".repeat(60));
  console.log("DEMO: Validator Stake Slashing (anti-fraud penalty)");
  console.log("-".repeat(60));
  const slashAmount = minimumStake;
  const stakeBefore = await factory.validatorStake(gv5.address);
  await (await factory.connect(deployer).slashValidator(gv5.address, slashAmount, { gasLimit: 100_000 })).wait();
  const stakeAfter = await factory.validatorStake(gv5.address);
  console.log(`gv5 stake before slash: ${ethers.utils.formatEther(stakeBefore)} ETH`);
  console.log(`gv5 stake after slash : ${ethers.utils.formatEther(stakeAfter)} ETH`);
  console.log("Slashed amount returned to admin treasury.");

  // ── Frontend .env output ──────────────────────────────────────────────────────
  console.log("\n" + "=".repeat(60));
  console.log("FRONTEND .env VALUES — copy into frontend/.env");
  console.log("=".repeat(60));
  console.log(`VITE_FACTORY_ADDRESS=${factory.address}`);
  console.log(`VITE_CONTRACT_ADDRESS=${campaign1Address}`);
  console.log(`VITE_GLOBAL_VALIDATOR_1=${gv1.address}`);
  console.log(`VITE_GLOBAL_VALIDATOR_2=${gv2.address}`);
  console.log(`VITE_GLOBAL_VALIDATOR_3=${gv3.address}`);
  console.log(`VITE_GLOBAL_VALIDATOR_4=${gv4.address}`);
  console.log(`VITE_GLOBAL_VALIDATOR_5=${gv5.address}`);
  console.log(`VITE_GLOBAL_THRESHOLD=3`);
  console.log(`VITE_MINIMUM_STAKE=${minimumStake.toString()}`);
  console.log(`VITE_CHAIN_ID=31337`);
  console.log(`VITE_RPC_URL=http://127.0.0.1:8545`);
  console.log("=".repeat(60));
  console.log("Campaign 1 (Flood Relief — direct)   :", campaign1Address);
  console.log("Campaign 2 (Earthquake — direct)     :", campaign2Address);
  console.log("Campaign 3 (Typhoon — via proposal)  :", campaign3Address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
