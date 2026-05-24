# ReliefChain

> **Blockchain-Based Humanitarian Relief Fund Platform**  
> Complete Setup, Usage & Full Lifecycle Demo Guide

**INTE2641 Blockchain Technology Fundamentals — Assignment 3**  
**HN Group 4** | May 2026

| Member | Student ID |
|---|---|
| Luong Thi Tra My | s3987023 |
| Nguyen Hoang Gia Khanh | s4035894 |
| Nguyen Ngoc Dung | s3978535 |

---

## Table of Contents

1. [Prerequisites](#1-prerequisites)
2. [Project Structure](#2-project-structure)
3. [Environment Configuration](#3-environment-configuration)
4. [Backend Installation](#4-backend-installation)
5. [Frontend Installation](#5-frontend-installation)
6. [Running the System](#6-running-the-system)
7. [MetaMask Configuration](#7-metamask-configuration)
8. [Full Lifecycle Demo Walkthrough](#8-full-lifecycle-demo-walkthrough)
9. [Feature and Role Summary](#9-feature-and-role-summary)
10. [Account Reference](#10-account-reference)
11. [Running Tests](#11-running-tests)
12. [Troubleshooting](#12-troubleshooting)

---

## 1. Prerequisites

Install **all** tools below before proceeding. Missing any will cause install or compile errors.

| Tool | Required Version | Download |
|---|---|---|
| Node.js | 18.20.4 LTS | https://nodejs.org/en/download |
| MetaMask | Any current | Chrome Web Store |
| VS Code | Any current | https://code.visualstudio.com |
| Google Chrome | Any current | https://www.google.com/chrome |

Verify Node.js after install:

```bash
node -v
```

Expected output: `v18.x.x`

> Node.js v24 works with warnings. v18 is strongly recommended.

---

## 2. Project Structure

After extracting `reliefchain_HNGroup4.zip`, the folder layout is:

```
reliefchain/
├── backend/
│   ├── .env                         ← create manually (see Section 3)
│   ├── contracts/
│   │   ├── Campaign.sol             ← per-campaign spending + voting logic
│   │   └── CampaignFactory.sol      ← factory + proposal governance + staking
│   ├── scripts/
│   │   └── deploy.ts                ← deploys factory, 2 direct campaigns, 1 via proposal
│   ├── test/
│   │   └── Campaign.test.ts         ← 114 tests
│   ├── hardhat.config.ts
│   ├── package.json
│   └── tsconfig.json
│
├── frontend/
│   ├── .env                         ← create manually, fill addresses after deploy
│   ├── src/
│   │   ├── App.tsx                  ← campaign selector, wallet, tabs
│   │   ├── components/
│   │   │   ├── Donation.tsx         ← donate tab
│   │   │   ├── Requests.tsx         ← spending requests tab
│   │   │   ├── ValidatorDashboard.tsx  ← owner/validator panel
│   │   │   ├── ProposalDashboard.tsx   ← proposal governance + staking
│   │   │   └── IPFSUpload.tsx       ← Pinata file uploader
│   │   ├── contracts/
│   │   │   ├── Campaign.abi.ts
│   │   │   └── CampaignFactory.abi.ts
│   │   ├── utils/
│   │   │   ├── ethers.ts
│   │   │   ├── gasEstimation.ts
│   │   │   ├── pinata.ts
│   │   │   └── networkHelper.ts
│   │   └── styles/                  ← CSS Modules
│   ├── package.json
│   └── vite.config.ts
│
└── README.md
```

---

## 3. Environment Configuration

Two `.env` files must be **created manually** before any install step.

In VS Code Explorer: right-click the folder → **New File** → name it `.env` → paste content below.

### 3.1 `backend/.env`

```env
DEPLOYER_PRIVATE_KEY=2113e1a713e25c2df7783694b63ac045efa909508e5c557050a9bed52b6bbdcf
POLYGON_AMOY_RPC=https://polygon-amoy.g.alchemy.com/v2/LidisdtNzbj9PPHeg1WEi
REPORT_GAS=false
POLYGONSCAN_API_KEY=
```

### 3.2 `frontend/.env`

> Leave `VITE_FACTORY_ADDRESS` and `VITE_CONTRACT_ADDRESS` blank for now. Fill them in **after** running the deploy script in Section 6.

```env
VITE_FACTORY_ADDRESS=
VITE_CONTRACT_ADDRESS=
VITE_CHAIN_ID=31337
VITE_RPC_URL=http://127.0.0.1:8545
VITE_PINATA_JWT=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySW5mb3JtYXRpb24iOnsiaWQiOiJiODc4NTU3MS01NmJkLTRmZDktYjY4OS01N2Y5MDE1Y2RmOWIiLCJlbWFpbCI6Imp1bmVuZzIxMDhAZ21haWwuY29tIiwiZW1haWxfdmVyaWZpZWQiOnRydWUsInBpbl9wb2xpY3kiOnsicmVnaW9ucyI6W3siZGVzaXJlZFJlcGxpY2F0aW9uQ291bnQiOjEsImlkIjoiRlJBMSJ9LHsiZGVzaXJlZFJlcGxpY2F0aW9uQ291bnQiOjEsImlkIjoiTllDMSJ9XSwidmVyc2lvbiI6MX0sIm1mYV9lbmFibGVkIjpmYWxzZSwic3RhdHVzIjoiQUNUSVZFIn0sImF1dGhlbnRpY2F0aW9uVHlwZSI6InNjb3BlZEtleSIsInNjb3BlZEtleUtleSI6IjBmODBmYzRlYjk0NzE1YzVmN2RiIiwic2NvcGVkS2V5U2VjcmV0IjoiN2FkNTVlMTZiZjA3MzIxYzg4ZjE5M2U3OTE3MjhjYjZlZmJjYTlhOTgxYTAzNjdlODU5MWZlZjA0YTQyZDAxYiIsImV4cCI6MTgwNzYyOTQzNH0.Zk7QAej2bAyl9i4OeaF_Amy9QnKljzwK5J8DM4qmyUE
```

---

## 4. Backend Installation

Open VS Code → **File > Open Folder** → select the `reliefchain` root folder.

Open the integrated terminal: `Ctrl + \`` (backtick). Confirm the prompt shows:

```
PS C:\Users\...\reliefchain>
```

### Step 1 — Navigate to backend

```bash
cd backend
```

### Step 2 — Install dependencies

```bash
npm install --legacy-peer-deps
```

> Always use `--legacy-peer-deps`. Required to resolve `hardhat-network-helpers` peer conflicts.

### Step 3 — Node.js v24 only (skip on v18)

```bash
npm install --save-dev --legacy-peer-deps fp-ts@2.16.9
```

### Step 4 — Install Hardhat plugin dependencies

```bash
npm install --save-dev --legacy-peer-deps "@nomicfoundation/hardhat-network-helpers@1.0.8" "@nomicfoundation/hardhat-chai-matchers@1.0.6" "@nomiclabs/hardhat-ethers@2.2.3" "@nomiclabs/hardhat-etherscan@3.1.7" "@typechain/ethers-v5@10.2.1" "@typechain/hardhat@6.1.6" "solidity-coverage@0.8.12" "typechain@8.3.2"
```

### Step 5 — Install OpenZeppelin contracts

```bash
npm install --legacy-peer-deps @openzeppelin/contracts@4.9.6
```

### Step 6 — Compile contracts

```bash
npx hardhat compile
```

Expected output:

```
Compiled 11 Solidity files successfully (evm target: paris)
```

---

## 5. Frontend Installation

Open a **second terminal tab** in VS Code (click `+` in the terminal panel).

### Step 1 — Navigate to frontend

```bash
cd frontend
```

### Step 2 — Install dependencies

```bash
npm install --legacy-peer-deps
```

Expected output ends with: `added NNN packages`

> Do not start the dev server yet. Complete Section 6 first to get contract addresses.

---

## 6. Running the System

**Three terminal windows must run concurrently throughout the demo.** Use the `+` button in VS Code terminal panel to open each.

| Terminal | Directory | Command | Purpose |
|---|---|---|---|
| Terminal 1 | `backend` | `npx hardhat node` | Local blockchain — keep open all session |
| Terminal 2 | `backend` | `npx hardhat run scripts/deploy.ts --network localhost` | Deploy contracts once |
| Terminal 3 | `frontend` | `npm run dev` | React dev server |

---

### Terminal 1 — Start the local blockchain

```bash
cd backend
npx hardhat node
```

The node prints 20 accounts with private keys and then stays running. **Do not close this terminal.**

Sample output:

```
Started HTTP and WebSocket JSON-RPC server at http://127.0.0.1:8545/

Accounts
========
Account #0: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266 (10000 ETH)
Private Key: 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
...
```

---

### Terminal 2 — Deploy contracts

Open a **new terminal tab**. Run:

```bash
cd backend
npx hardhat run scripts/deploy.ts --network localhost
```


**Node.js v24 (if you see `FATAL ERROR: Zone Allocation failed` or out-of-memory crash):**

```powershell
cd backend
$env:NODE_OPTIONS="--max-old-space-size=4096"
npx hardhat run scripts/deploy.ts --network localhost
```

> The `viaIR: true` compiler setting used in this project significantly increases memory usage during compilation. Node.js v24 hits the default heap limit. The `--max-old-space-size=4096` flag raises the limit to 4 GB, which is sufficient for the compile + deploy to complete. Node.js v18 does not have this issue.

The deploy script:
1. Deploys `CampaignFactory` with 5 global validators and 3-of-5 threshold
2. Each validator stakes 0.05 ETH (skin-in-the-game)
3. Creates Campaign 1 — "Vietnam Flood Relief 2026" (3-of-5, direct)
4. Creates Campaign 2 — "Earthquake Emergency Fund" (5-of-5 unanimous, direct)
5. Simulates donations and a full spending request cycle on Campaign 1
6. Demonstrates the proposal pipeline — organizer submits, 3 validators approve → Campaign 3 auto-deploys
7. Demonstrates slash — admin penalizes a validator's staked ETH

End of output looks like this:

```
============================================================
FRONTEND .env VALUES — copy into frontend/.env
============================================================
VITE_FACTORY_ADDRESS=0x5FbDB2315678afecb367f032d93F642f64180aa3
VITE_CONTRACT_ADDRESS=0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512
VITE_GLOBAL_VALIDATOR_1=0x70997970C51812dc3A010C7d01b50e0d17dc79C8
VITE_GLOBAL_VALIDATOR_2=0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC
VITE_GLOBAL_VALIDATOR_3=0x90F79bf6EB2c4f870365E785982E1f101E93b906
VITE_GLOBAL_VALIDATOR_4=0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65
VITE_GLOBAL_VALIDATOR_5=0x9965507D1a55bcC2695C58ba16FB37d819B0A4dc
VITE_GLOBAL_THRESHOLD=3
VITE_MINIMUM_STAKE=10000000000000000
VITE_CHAIN_ID=31337
VITE_RPC_URL=http://127.0.0.1:8545
============================================================
Campaign 1 (Flood Relief — direct)   : 0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512
Campaign 2 (Earthquake — direct)     : 0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0
Campaign 3 (Typhoon — via proposal)  : 0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9
```

**Copy only two values** into `frontend/.env`:

```env
VITE_FACTORY_ADDRESS=<your VITE_FACTORY_ADDRESS from output>
VITE_CONTRACT_ADDRESS=<your VITE_CONTRACT_ADDRESS from output>
```

Leave all other lines unchanged.

---

### Terminal 3 — Start the frontend

Open a **third terminal tab**. Run:

```bash
cd frontend
npm run dev
```

Open **http://localhost:5173** in Chrome.

The campaign selector dropdown at the top will show all 3 campaigns immediately.

---

## 7. MetaMask Configuration

### 7.1 Add Hardhat Local Network

Open MetaMask → click the network dropdown at the top → **Add a custom network**:

| Field | Value |
|---|---|
| Network name | `Hardhat Local` |
| New RPC URL | `http://127.0.0.1:8545` |
| Chain ID | `31337` |
| Currency symbol | `ETH` |

Click **Save**. Switch to this network before connecting any wallet.

---

### 7.2 Import All 11 Accounts

For each account: MetaMask → click the account icon (top-right) → **Import Account** → paste private key → **Import**.

Rename each account in MetaMask after import (click the pencil icon) so you can identify them during the demo.

| # | Suggested Name | Role | Address | Private Key |
|---|---|---|---|---|
| 0 | Admin / Deployer | Factory admin, campaign owner | `0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266` | `0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80` |
| 1 | Global Validator 1 | Can vote on proposals + spending requests | `0x70997970C51812dc3A010C7d01b50e0d17dc79C8` | `0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d` |
| 2 | Global Validator 2 | Can vote on proposals + spending requests | `0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC` | `0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a` |
| 3 | Global Validator 3 | Can vote on proposals + spending requests | `0x90F79bf6EB2c4f870365E785982E1f101E93b906` | `0x7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6` |
| 4 | Global Validator 4 | Can vote on proposals + spending requests | `0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65` | `0x47e179ec197488593b187f80a00eb0da91f1b9d0b13f8733639f19c30a34926b` |
| 5 | Global Validator 5 | Can vote on proposals + spending requests | `0x9965507D1a55bcC2695C58ba16FB37d819B0A4dc` | `0x8b3a350cf5c34c9194ca85829a2df0ec3153be0318b5e2d3348e872092edffba` |
| 6 | Ha Noi Red Cross | Donor | `0x976EA74026E726554dB657fA54763abd0C3a0aa9` | `0x92db14e403b83dfe3df233f83dfa3a0d7096f21ca9b0d6d6b8d88b2b4ec1564e` |
| 7 | HCMC Community Fund | Donor | `0x14dC79964da2C08b23698B3D3cc7Ca32193d9955` | `0x4bbbf85ce3377467afe5d46f804f221813b2bb87f24d81f60f1fcdbf7cbf4356` |
| 8 | Da Nang Relief Group | Donor | `0x23618e81E3f5cdF7f54C3d65f7FBc0aBf5B21E8f` | `0xdbda1821b80551c9d65939329250298aa3472ba22feea921c0cf5d620ea67b97` |
| 9 | Relief Organizer | Submits campaign proposals | `0xa0Ee7A142d267C1f36714E4a8F75612F20a79720` | `0x2a871d0798f97d79848a013d4936a73bf4cc922c825d33c1cf7073dff6d409c6` |
| 10 | Hoa Binh Centre | Beneficiary (receives funds) | `0xBcd4042DE499D14e55001CcbB24a551F3b954096` | `0xf214f2b2cd398c806f84e317254e0f0b801d0643303237d97a22a48e01628897` |

> These private keys come from Hardhat's public default mnemonic. They hold no real value. **Never use them on any live network.**

---

## 8. Full Lifecycle Demo Walkthrough

This walkthrough simulates the complete real-world lifecycle: public fundraising → evidence-backed spending → multi-sig approval → fund release → new campaign proposal → validator governance → economic anti-fraud mechanisms.

Follow phases in order for a complete demonstration.

> **Campaign selector:** A blue bar at the top of the app shows the active campaign dropdown. Switch between campaigns at any time. Each campaign has completely independent state.

---

### Phase 1 — Public Donations to Campaign 1 (Vietnam Flood Relief 2026)

**Real-world scenario:** Three aid organisations learn about the Vietnam flood via the platform and donate transparently on-chain.

> Campaign selector: select **"Vietnam Flood Relief 2026 — 3/5 multisig"**

**Ha Noi Red Cross (Account #6)**
1. Switch MetaMask to Account #6
2. Click **Connect Wallet** → accept in MetaMask
3. Go to **Donate** tab
4. Enter `5` ETH → click **Donate Now** → confirm in MetaMask
5. Progress bar advances to `5/100 ETH`. Row appears in Donation History.

**HCMC Community Fund (Account #7)**
1. Switch MetaMask to Account #7 → Connect Wallet
2. **Donate** tab → enter `10` → **Donate Now** → confirm
3. Progress bar reaches `15/100 ETH`.

**Da Nang Relief Group (Account #8)**
1. Switch MetaMask to Account #8 → Connect Wallet
2. **Donate** tab → enter `8` → **Donate Now** → confirm
3. Progress bar reaches `23/100 ETH`. Three rows visible in Donation History.

---

### Phase 2 — Owner Submits Spending Request with IPFS Evidence

**Real-world scenario:** The campaign owner (deployer/admin) needs to purchase water purification units. They upload proof of vendor quotes to IPFS before requesting funds — creating an immutable, publicly auditable evidence trail.

**Admin / Deployer (Account #0)**
1. Switch MetaMask to Account #0 → Connect Wallet
2. Go to **Owner / Validator** tab (visible only to Account #0)
3. In the **Upload Evidence** section, drag any file (image, PDF, invoice scan) onto the upload area
4. Wait for the CID to appear and the IPFS gateway link to become clickable
5. Fill the spending request form:
   - **Description:** `Purchase 50 water purification units — Hoa Binh Province`
   - **Beneficiary:** `0xBcd4042DE499D14e55001CcbB24a551F3b954096` (Account #10 — Hoa Binh Centre)
   - **Amount:** `10`
6. Click **Submit Request** → confirm MetaMask
7. Switch to **Requests** tab → request appears with status `Pending`, vote count `0/3`, and clickable IPFS evidence link

---

### Phase 3 — Global Validators Review and Vote

**Real-world scenario:** Three independent validators review the uploaded evidence on IPFS before casting their on-chain vote. No single validator can approve alone — collusion requires at least 3-of-5 (and any fraud risks their staked ETH being slashed).

**Global Validator 1 (Account #1)**
1. Switch MetaMask to Account #1 → Connect Wallet
2. Go to **Owner / Validator** tab → Validator panel is visible
3. Click the IPFS evidence link on the pending request to review the file
4. Click **Approve** → confirm MetaMask
5. Vote count shows `1/3`. Status remains `Pending`.

**Global Validator 2 (Account #2)**
1. Switch MetaMask to Account #2 → Connect Wallet
2. **Owner / Validator** tab → click **Approve** on the same request → confirm
3. Vote count shows `2/3`. Status remains `Pending`.

**Global Validator 3 (Account #3)**
1. Switch MetaMask to Account #3 → Connect Wallet
2. **Owner / Validator** tab → click **Approve** → confirm
3. Vote count reaches `3/3`. Status changes to **Ready**. Threshold met.

---

### Phase 4 — Release Funds to Beneficiary

**Real-world scenario:** Once the multisig threshold is met, the funds are unlocked. Any account can trigger the release — the contract automatically transfers ETH to the beneficiary address. No intermediary, no bank transfer, no delay.

**Ha Noi Red Cross (Account #6)**
1. Switch MetaMask to Account #6
2. **Requests** tab → click **Release Funds** on the `Ready` request → confirm MetaMask
3. Status changes to `Executed`. Release Funds button disappears.

**Hoa Binh Centre (Account #10) — verify receipt**
1. Switch MetaMask to Account #10
2. Check balance in MetaMask wallet → shows approximately `10,010 ETH`
   *(10,000 start + 10 ETH just released to beneficiary)*

---

### Phase 5 — Campaign 2: Earthquake Emergency Fund (Unanimous 5-of-5)

**Real-world scenario:** A more severe earthquake disaster requires unanimous consensus from all 5 validators before any funds move — no minority approval possible.

> Campaign selector: switch to **"Earthquake Emergency Fund — 5/5 multisig"**

1. **Account #6 (Ha Noi Red Cross)** → Donate tab → donate `20 ETH` → confirm
2. **Account #0 (Admin)** → Owner / Validator tab → upload evidence → submit request:
   - Description: `Emergency shelter kits and medical supplies — earthquake zone`
   - Beneficiary: Account #10
   - Amount: `15`
3. **Account #1** → Owner / Validator tab → **Approve** → confirm
4. **Account #2** → Owner / Validator tab → **Approve** → confirm
5. **Account #3** → Owner / Validator tab → **Approve** → confirm
6. **Account #4** → Owner / Validator tab → **Approve** → confirm
7. **Account #5** → Owner / Validator tab → **Approve** → confirm *(all 5 required)*
8. Status changes to **Ready** after Account #5 votes
9. Any account → **Requests** tab → **Release Funds** → confirm

---

### Phase 6 — Spending Request Rejection Demo

**Real-world scenario:** A suspicious or invalid spending request is submitted. Two validators review the evidence, find it inadequate, and reject it. The funds stay locked. The outcome is permanent on-chain.

> Campaign selector: switch back to **"Vietnam Flood Relief 2026"**

1. **Account #0 (Admin)** → Owner / Validator tab → submit second request:
   - Description: `Administrative and transport overhead (suspicious)`
   - Beneficiary: Account #10
   - Amount: `5`
2. **Account #1** → Owner / Validator tab → click **Reject** → confirm
3. **Account #2** → Owner / Validator tab → click **Reject** → confirm
4. Vote count shows `0 approved / 2 rejected`. Status changes to **Rejected**.
5. No ETH moves. Release Funds button never appears. Outcome is permanent.

---

### Phase 7 — Proposal Governance: Any Organizer Creates a New Campaign

**Real-world scenario:** A new relief organiser in Da Nang wants to launch a typhoon campaign but does not have factory admin access. They submit a proposal with full IPFS evidence of their credentials. The global validator council votes. On reaching 3-of-5 approval, the campaign auto-deploys — no admin action needed.

#### Step 7A — Organizer submits proposal

**Relief Organizer (Account #9)**
1. Switch MetaMask to Account #9 → Connect Wallet
2. Go to the **Proposals** tab
3. In the **Submit New Campaign Proposal** panel, fill in:
   - **Campaign Name:** `Typhoon Emergency Fund 2026`
   - **Fundraising Target (ETH):** `75`
   - **Campaign Validators (one address per line):**
     ```
     0x70997970C51812dc3A010C7d01b50e0d17dc79C8
     0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC
     0x90F79bf6EB2c4f870365E785982E1f101E93b906
     0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65
     0x9965507D1a55bcC2695C58ba16FB37d819B0A4dc
     ```
   - **Approval Threshold:** `3`
4. In the **Evidence Upload** section, drag any file to IPFS (simulates credential/plan document)
5. Click **Submit Proposal** → confirm MetaMask
6. Proposal card appears in the **Pending Proposals** list with status `Pending` and tally `0/3 approvals`

#### Step 7B — Global Validators vote to approve

**Global Validator 1 (Account #1)**
1. Switch MetaMask to Account #1 → Connect Wallet
2. Go to **Proposals** tab → **Stake Management** panel shows `0.05 ETH` staked (from deploy script)
3. On the proposal card, click **Approve** → confirm MetaMask
4. Tally updates to `1 / 3 approvals`

**Global Validator 2 (Account #2)**
1. Switch MetaMask to Account #2 → Connect Wallet
2. **Proposals** tab → click **Approve** on the same card → confirm
3. Tally updates to `2 / 3 approvals`

**Global Validator 3 (Account #3)**
1. Switch MetaMask to Account #3 → Connect Wallet
2. **Proposals** tab → click **Approve** → confirm
3. Tally reaches `3 / 3`. Status changes to **Approved**. Campaign auto-deploys.
4. Campaign selector dropdown now shows **"Typhoon Emergency Fund 2026"** as a fourth campaign.

#### Step 7C — New campaign is now live

1. Select **"Typhoon Emergency Fund 2026"** from the campaign selector
2. **Donate** tab is fully functional — any account can donate
3. Account #9 (the organizer who proposed it) is now the **campaign owner** and can submit spending requests via Owner / Validator tab

---

### Phase 8 — Stake Management and Slash Demo

**Real-world scenario:** Validators lock ETH as a security bond. This creates a real economic disincentive against collusion or fraud. If a validator is caught acting maliciously, the admin can permanently slash (confiscate) part of their stake.

#### Step 8A — Stake ETH as a validator

**Global Validator 3 (Account #3)**
1. Switch MetaMask to Account #3 → Connect Wallet
2. Go to **Proposals** tab
3. **Stake Management** panel shows current stake (already 0.05 ETH from deploy script)
4. Enter `0.05` in the stake input → click **Stake ETH** → confirm MetaMask
5. Stake balance updates to `0.10 ETH`

#### Step 8B — Withdraw part of stake

**Global Validator 3 (Account #3)**
1. In **Stake Management** → enter `0.04` in the withdraw input → click **Withdraw**
2. Confirm MetaMask → stake balance drops to `0.06 ETH`
3. Withdrawal is blocked if remaining amount would drop below the 0.01 ETH minimum

#### Step 8C — Admin slashes a validator (fraud penalty)

The slash function is called directly on the `CampaignFactory` contract by the admin. The deploy script already runs a slash automatically and prints the result in Terminal 2:

```
gv5 stake before slash: 0.05 ETH
gv5 stake after slash : 0.04 ETH
Slashed amount returned to admin treasury.
```

To demonstrate this live during the demo, run the following commands in a **Hardhat console** (open a fourth terminal tab):

```bash
cd backend
npx hardhat console --network localhost
```

Then paste these commands one by one:

```javascript
// Attach to the deployed factory (replace with your actual factory address from Terminal 2 output)
const factory = await ethers.getContractAt("CampaignFactory", "0x5FbDB2315678afecb367f032d93F642f64180aa3")

// Target: Global Validator 5
const gv5 = "0x9965507D1a55bcC2695C58ba16FB37d819B0A4dc"

// Check stake before
const before = await factory.validatorStake(gv5)
console.log("Stake before:", ethers.utils.formatEther(before), "ETH")

// Admin (Account #0) slashes 0.01 ETH from gv5
const [admin] = await ethers.getSigners()
await factory.connect(admin).slashValidator(gv5, ethers.utils.parseEther("0.01"))

// Check stake after
const after = await factory.validatorStake(gv5)
console.log("Stake after:", ethers.utils.formatEther(after), "ETH")
```

Expected output:
```
Stake before: 0.05 ETH
Stake after:  0.04 ETH
```

> Replace `0x5FbDB2315678afecb367f032d93F642f64180aa3` with the `VITE_FACTORY_ADDRESS` value printed by your Terminal 2 deploy output.
---

## 9. Feature and Role Summary

### 9.1 Two-Tier Governance Architecture

ReliefChain operates two independent but connected governance layers:

| Layer | Contract | Who Controls | Purpose |
|---|---|---|---|
| Factory governance | `CampaignFactory.sol` | 5 Global Validators (3-of-5) | Approving or rejecting proposals for new campaigns |
| Campaign governance | `Campaign.sol` (per campaign) | Per-campaign validators | Approving or rejecting spending requests within a campaign |

### 9.2 Role Capabilities

| Role | Account | Capabilities |
|---|---|---|
| Admin / Deployer | Account #0 | Deploy factory, create direct campaigns, slash validators, submit spending requests as campaign owner |
| Global Validator | Accounts #1–5 | Stake ETH, vote on campaign proposals, vote on per-campaign spending requests |
| Donor | Accounts #6–8 | Donate ETH to any campaign, trigger fund release on approved requests |
| Organizer / Proposer | Account #9 | Submit a campaign proposal with IPFS evidence — any wallet can do this |
| Beneficiary | Account #10 | Receive released funds, can also donate |

### 9.3 Campaign Configurations (after deploy)

| Campaign | Created via | Threshold | Validators | Meaning |
|---|---|---|---|---|
| Vietnam Flood Relief 2026 | Direct `createCampaign` | 3 of 5 | GV1–GV5 | Any 3 of 5 validators approve |
| Earthquake Emergency Fund | Direct `createCampaign` | 5 of 5 | GV1–GV5 | All 5 validators must approve |
| Typhoon Emergency Fund 2026 | Proposal governance | 3 of 5 | GV1–GV5 | Auto-deployed on proposal approval |

### 9.4 Tab Reference

| Tab | Visible to | Function |
|---|---|---|
| Donate | Everyone | Campaign progress bar, donation form, live donation history |
| Requests | Everyone | All spending requests — status, vote count, IPFS evidence link, Release Funds button |
| Owner / Validator | Campaign owner or validator | Owner: upload IPFS evidence + submit request. Validator: Approve / Reject pending requests |
| Proposals | Any connected wallet | Submit new campaign proposals with IPFS evidence. Global validators see Approve / Reject buttons and Stake Management panel |

### 9.5 Anti-Fraud Mechanisms

| Mechanism | How it works |
|---|---|
| IPFS evidence | Every spending request and campaign proposal requires an IPFS CID — immutable, publicly auditable proof |
| 3-of-5 multisig | No single validator or pair can approve alone — collusion requires 3+ validators |
| Mandatory stake | Validators must lock ≥ 0.01 ETH to vote on proposals — creates real economic skin-in-the-game |
| Slash | Admin can permanently confiscate staked ETH from any validator caught acting fraudulently |
| On-chain audit trail | Every donation, vote, proposal, approval, rejection, and slash is a permanent blockchain event — publicly queryable |
| Permissionless proposals | Any wallet can propose a campaign — no central gatekeeper, but approval still requires 3-of-5 validator consensus |

---

## 10. Account Reference

### Addresses

| # | Role | Address |
|---|---|---|
| 0 | Admin / Deployer | `0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266` |
| 1 | Global Validator 1 | `0x70997970C51812dc3A010C7d01b50e0d17dc79C8` |
| 2 | Global Validator 2 | `0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC` |
| 3 | Global Validator 3 | `0x90F79bf6EB2c4f870365E785982E1f101E93b906` |
| 4 | Global Validator 4 | `0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65` |
| 5 | Global Validator 5 | `0x9965507D1a55bcC2695C58ba16FB37d819B0A4dc` |
| 6 | Ha Noi Red Cross (Donor) | `0x976EA74026E726554dB657fA54763abd0C3a0aa9` |
| 7 | HCMC Community Fund (Donor) | `0x14dC79964da2C08b23698B3D3cc7Ca32193d9955` |
| 8 | Da Nang Relief Group (Donor) | `0x23618e81E3f5cdF7f54C3d65f7FBc0aBf5B21E8f` |
| 9 | Relief Organizer (Proposer) | `0xa0Ee7A142d267C1f36714E4a8F75612F20a79720` |
| 10 | Hoa Binh Centre (Beneficiary) | `0xBcd4042DE499D14e55001CcbB24a551F3b954096` |

### Private Keys

| # | Private Key |
|---|---|
| 0 | `0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80` |
| 1 | `0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d` |
| 2 | `0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a` |
| 3 | `0x7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6` |
| 4 | `0x47e179ec197488593b187f80a00eb0da91f1b9d0b13f8733639f19c30a34926b` |
| 5 | `0x8b3a350cf5c34c9194ca85829a2df0ec3153be0318b5e2d3348e872092edffba` |
| 6 | `0x92db14e403b83dfe3df233f83dfa3a0d7096f21ca9b0d6d6b8d88b2b4ec1564e` |
| 7 | `0x4bbbf85ce3377467afe5d46f804f221813b2bb87f24d81f60f1fcdbf7cbf4356` |
| 8 | `0xdbda1821b80551c9d65939329250298aa3472ba22feea921c0cf5d620ea67b97` |
| 9 | `0x2a871d0798f97d79848a013d4936a73bf4cc922c825d33c1cf7073dff6d409c6` |
| 10 | `0xf214f2b2cd398c806f84e317254e0f0b801d0643303237d97a22a48e01628897` |

> These keys come from Hardhat's public default mnemonic. They hold no real value. **Never use on any live network.**

---

## 11. Running Tests

The test suite runs against an in-process Hardhat network. **The standalone node (Terminal 1) does not need to be running.**

```bash
cd backend
npx hardhat test
```

Expected result: **114 tests pass**

| Test Suite | Tests | Coverage |
|---|---|---|
| Campaign — Deployment | 10 | Constructor, role assignment, configurable threshold |
| Campaign — Donations | 5 | ETH acceptance, zero rejection, accumulation |
| Campaign — createRequest | 7 | Owner-only, validation, CID storage |
| Campaign — vote | 8 | Approve, reject, double-vote prevention, unanimous threshold |
| Campaign — releaseFunds | 6 | Transfer, state update, re-entry prevention |
| Campaign — View helpers | 3 | isValidator, isOwner, getAllDonations |
| Campaign — Access control | 2 | Cross-role restrictions |
| CampaignFactory — Core | 9 | Deploy, register, caller ownership, multi-campaign, end-to-end |
| CampaignFactory — Proposal System | 39 | Constructor validation, submitProposal, voteOnProposal approval path, rejection path, proposalHasVoted, multiple proposals, backwards compatibility |
| CampaignFactory — Staking | 20 | stake(), withdrawStake(), slashValidator(), stake+vote integration |
| **Total** | **114** | |

To run with gas reporting:

```bash
$env:REPORT_GAS="true"; npx hardhat test
```

---

## 12. Troubleshooting

| Error / Symptom | Fix |
|---|---|
| `cd reliefchain\backend` fails with PathNotFound | You are already inside `reliefchain/`. Use `cd backend`, not `cd reliefchain\backend`. |
| `npm install` aborts with `ERESOLVE` | Always use `npm install --legacy-peer-deps` in both `backend` and `frontend`. |
| `Cannot find module fp-ts/lib/Either` | Run: `npm install --save-dev --legacy-peer-deps fp-ts@2.16.9` |
| `Error HH801` missing plugin dependencies | Run the full plugin install command from Section 4 Step 4. |
| `Error HH404` OpenZeppelin not found | Run: `npm install --legacy-peer-deps @openzeppelin/contracts@4.9.6` |
| `TS5109` moduleResolution error | Set `module: CommonJS` and `moduleResolution: node` in `backend/tsconfig.json` |
| Port 8545 already in use | Run: `netstat -ano \| findstr :8545` then `taskkill /PID <pid> /F` |
| MetaMask shows wrong network | Click **Switch Network** in the red banner, or manually select **Hardhat Local** in MetaMask. |
| Contract addresses mismatch after node restart | Re-run deploy script, copy new factory + campaign1 addresses, update `frontend/.env`, restart Vite. |
| Vite not picking up `.env` changes | Stop server (`Ctrl+C`) then restart: `npm run dev` |
| Campaign selector dropdown is empty | `VITE_FACTORY_ADDRESS` is blank. Fill it in `frontend/.env` and restart Vite. |
| Proposals tab shows nothing | Factory address not set, or Hardhat node not running. Check Terminal 1. |
| "Insufficient stake" error when voting | The connected validator has no stake. Go to Proposals tab → Stake Management → stake at least 0.01 ETH. |
| IPFS upload fails or returns no CID | Verify `VITE_PINATA_JWT` is set in `frontend/.env`. Restart Vite after saving. |
| Donation History not updating | Click **Refresh** button or switch tabs to remount the component. |
| MetaMask "nonce too high" | Reset MetaMask account: Settings → Advanced → Reset Account. Occurs after restarting the Hardhat node. |
| `FATAL ERROR: Zone Allocation failed - process out of memory` | Node.js v24 memory limit exceeded during compile. Run: `$env:NODE_OPTIONS="--max-old-space-size=4096"` before the deploy command, or downgrade to Node.js v18 LTS. |
| `No matching export CAMPAIGN_FACTORY_ABI` | File is empty. Open `src/contracts/CampaignFactory.abi.ts`, paste full content, save. |

---

*INTE2641 Assignment 3 — HN Group 4*
