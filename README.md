# ⛓️ ReliefChain

> **Blockchain-Based Humanitarian Relief Fund Platform**  
> Complete Setup, Usage & Demo Guide

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
5. [Running the System](#5-running-the-system)
6. [MetaMask Configuration](#6-metamask-configuration)
7. [Complete Demo Walkthrough](#7-complete-demo-walkthrough)
8. [Feature and Role Summary](#8-feature-and-role-summary)
9. [Account Reference](#9-account-reference)
10. [Troubleshooting](#10-troubleshooting)
11. [Running Tests](#11-running-tests)

---

## 1. Prerequisites

Install **all** tools below before proceeding. Missing any one will cause install or compile errors.

| Tool | Required Version | Download |
|---|---|---|
| Node.js | 18.20.4 LTS | https://nodejs.org/en/download |
| MetaMask | Any current | Chrome Web Store |
| VS Code | Any current | https://code.visualstudio.com |
| Google Chrome | Any current | https://www.google.com/chrome |

Verify your Node.js version after install:

```bash
node -v
```

> **Expected output:** `v18.x.x`  
> ⚠️ v24 works with warnings, but **v18 is strongly recommended**.

---

## 2. Project Structure

After extracting `reliefchain_HNGroup4.zip`, the folder layout is:

```
reliefchain/
├── backend/
│   ├── .env                     ← create manually (see Section 3)
│   ├── contracts/
│   │   ├── Campaign.sol         ← configurable validator + threshold
│   │   └── CampaignFactory.sol  ← deploys multiple campaigns
│   ├── scripts/
│   │   └── deploy.ts
│   ├── test/
│   │   └── Campaign.test.ts
│   ├── hardhat.config.ts
│   ├── package.json
│   └── tsconfig.json
│
├── frontend/
│   ├── .env                     ← create manually (see Section 3)
│   ├── src/
│   │   ├── App.tsx              ← campaign selector + wallet
│   │   ├── components/          ← Donation, Requests, ValidatorDashboard, IPFSUpload
│   │   ├── contracts/           ← Campaign.abi.ts, CampaignFactory.abi.ts
│   │   ├── utils/               ← ethers.ts, gasEstimation.ts, pinata.ts, networkHelper.ts
│   │   └── styles/              ← CSS Modules
│   ├── package.json
│   └── vite.config.ts
│
└── README.md
```

---

## 3. Environment Configuration

Two `.env` files must be **created manually**. In VS Code Explorer, right-click each folder → **New File** → name it `.env` → paste the content below.

### 3.1 `backend/.env`

```env
DEPLOYER_PRIVATE_KEY=2113e1a713e25c2df7783694b63ac045efa909508e5c557050a9bed52b6bbdcf
POLYGON_AMOY_RPC=https://polygon-amoy.g.alchemy.com/v2/LidisdtNzbj9PPHeg1WEi
REPORT_GAS=false
POLYGONSCAN_API_KEY=
```

### 3.2 `frontend/.env`

> ⚠️ Leave `VITE_FACTORY_ADDRESS` and `VITE_CONTRACT_ADDRESS` blank for now. Fill them in **after** running the deploy script (Step 5).

```env
VITE_FACTORY_ADDRESS=
VITE_CONTRACT_ADDRESS=
VITE_CHAIN_ID=31337
VITE_RPC_URL=http://127.0.0.1:8545
VITE_PINATA_JWT=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySW5mb3JtYXRpb24iOnsiaWQiOiJiODc4NTU3MS01NmJkLTRmZDktYjY4OS01N2Y5MDE1Y2RmOWIiLCJlbWFpbCI6Imp1bmVuZzIxMDhAZ21haWwuY29tIiwiZW1haWxfdmVyaWZpZWQiOnRydWUsInBpbl9wb2xpY3kiOnsicmVnaW9ucyI6W3siZGVzaXJlZFJlcGxpY2F0aW9uQ291bnQiOjEsImlkIjoiRlJBMSJ9LHsiZGVzaXJlZFJlcGxpY2F0aW9uQ291bnQiOjEsImlkIjoiTllDMSJ9XSwidmVyc2lvbiI6MX0sIm1mYV9lbmFibGVkIjpmYWxzZSwic3RhdHVzIjoiQUNUSVZFIn0sImF1dGhlbnRpY2F0aW9uVHlwZSI6InNjb3BlZEtleSIsInNjb3BlZEtleUtleSI6IjBmODBmYzRlYjk0NzE1YzVmN2RiIiwic2NvcGVkS2V5U2VjcmV0IjoiN2FkNTVlMTZiZjA3MzIxYzg4ZjE5M2U3OTE3MjhjYjZlZmJjYTlhOTgxYTAzNjdlODU5MWZlZjA0YTQyZDAxYiIsImV4cCI6MTgwNzYyOTQzNH0.Zk7QAej2bAyl9i4OeaF_Amy9QnKljzwK5J8DM4qmyUE
VITE_VALIDATOR_1=0x70997970C51812dc3A010C7d01b50e0d17dc79C8
VITE_VALIDATOR_2=0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC
VITE_VALIDATOR_3=0x90F79bf6EB2c4f870365E785982E1f101E93b906
```

---

## 4. Backend Installation

Open VS Code → **File > Open Folder** → select the `reliefchain` folder. Open the integrated terminal with `Ctrl + \`` and confirm the prompt reads:

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

> ⚠️ Always use `--legacy-peer-deps`. This flag is **required** to resolve the `hardhat-network-helpers` peer conflict.

### Step 3 — Install missing peer packages *(Node.js v24 only)*

If you are running Node.js v24, run this extra command once:

```bash
npm install --save-dev --legacy-peer-deps fp-ts@2.16.9
```

### Step 4 — Install Hardhat plugin dependencies

```bash
npm install --save-dev --legacy-peer-deps \
  "@nomicfoundation/hardhat-network-helpers@1.0.8" \
  "@nomicfoundation/hardhat-chai-matchers@1.0.6" \
  "@nomiclabs/hardhat-ethers@2.2.3" \
  "@nomiclabs/hardhat-etherscan@3.1.7" \
  "@typechain/ethers-v5@10.2.1" \
  "@typechain/hardhat@6.1.6" \
  "solidity-coverage@0.8.12" \
  "typechain@8.3.2"
```

### Step 5 — Install OpenZeppelin

```bash
npm install --legacy-peer-deps @openzeppelin/contracts@4.9.6
```

### Step 6 — Compile contracts

```bash
npx hardhat compile
```

> **Expected output:** `Compiled 11 Solidity files successfully (evm target: paris)`

---

## 5. Running the System

**Three terminal windows must stay open concurrently.** Open each with the `+` button in the VS Code terminal panel.

| Terminal | Directory | Command | Purpose |
|---|---|---|---|
| 1 | `backend` | `npx hardhat node` | Local blockchain — keep open all session |
| 2 | `backend` | `npx hardhat run scripts/deploy.ts --network localhost` | Deploy contracts once |
| 3 | `frontend` | `npm run dev` | React dev server |

### Terminal 1 — Start the Hardhat node

```bash
npx hardhat node
```

The node prints 20 accounts with private keys and stays running. **Do not close this terminal.**

### Terminal 2 — Deploy contracts

```bash
npx hardhat run scripts/deploy.ts --network localhost
```

The script deploys `CampaignFactory` and creates two campaigns. Output will look like:

```
CampaignFactory deployed at: 0x5FbDB2315678afecb367f032d93F642f64180aa3
Campaign 1 address:          0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512
Campaign 2 address:          0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0
```

Copy both addresses. Open `frontend/.env` and fill in:

```env
VITE_FACTORY_ADDRESS=0x5FbDB2315678afecb367f032d93F642f64180aa3
VITE_CONTRACT_ADDRESS=0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512
```

### Terminal 3 — Start the frontend

```bash
cd frontend
npm install --legacy-peer-deps
npm run dev
```

Open **http://localhost:5173** in Chrome.

---

## 6. MetaMask Configuration

### 6.1 Add Hardhat Local Network

Open MetaMask → network dropdown → **Add a custom network**:

| Field | Value |
|---|---|
| Network name | `Hardhat Local` |
| New RPC URL | `http://127.0.0.1:8545` |
| Chain ID | `31337` |
| Currency symbol | `ETH` |

### 6.2 Import All 8 Accounts

For each account: MetaMask → account icon → **Import Account** → paste private key.

| # | Name / Role | Private Key |
|---|---|---|
| 0 | Nguyen Van An — Campaign Owner | `0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80` |
| 1 | Tran Thi Bich — Validator 1 | `0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d` |
| 2 | Le Minh Duc — Validator 2 | `0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a` |
| 3 | Pham Thi Lan — Validator 3 | `0x7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6` |
| 4 | Hoa Binh Relief Centre — Beneficiary | `0x47e179ec197488593b187f80a00eb0da91f1b9d0b13f8733639f19c30a34926b` |
| 5 | Ha Noi Red Cross — Donor | `0x8b3a350cf5c34c9194ca85829a2df0ec3153be0318b5e2d3348e872092edffba` |
| 6 | HCMC Community Fund — Donor | `0x92db14e403b83dfe3df233f83dfa3a0d7096f21ca9b0d6d6b8d88b2b4ec1564e` |
| 7 | Da Nang Relief Group — Donor | `0x4bbbf85ce3377467afe5d46f804f221813b2bb87f24d81f60f1fcdbf7cbf4356` |

> 🔑 These private keys are from Hardhat's **public default mnemonic**. They hold no real value. **Never use them on any live network.**

### 6.3 Starting Balances (after deploy script runs)

| Account | Starting ETH | Notes |
|---|---|---|
| All accounts #0–7 | ~10,000 ETH each | Hardhat provides 10,000 test ETH per account |
| Deploy script donates from #4–7 | Balances slightly reduced | 4 donations simulated during deploy |
| Beneficiary #4 | ~10,002 ETH | Received 2 ETH from deploy script simulation |

---

## 7. Complete Demo Walkthrough

This walkthrough covers all features across both campaigns. Follow in order for a complete demonstration.

> **Campaign Selector:** A blue bar at the top of the app shows the active campaign dropdown. Switch between campaigns at any time. Each campaign has completely independent state — donations, requests, and votes do not cross over.

---

### Phase 1 — Fund Campaign 1: Vietnam Flood Relief 2026 *(2-of-3 multisig)*

> *Campaign selector: select **"Vietnam Flood Relief 2026 — 2/3 multisig"***

**Ha Noi Red Cross (Account #5)**
- Switch MetaMask to Account #5
- Click **Connect Wallet** — accept in MetaMask
- Donate tab → enter `5` → **Donate Now** → confirm MetaMask
- ✅ Progress bar advances to `5/100 ETH`. Row appears in Donation History.

**HCMC Community Fund (Account #6)**
- Switch MetaMask to Account #6 → Connect Wallet
- Donate tab → enter `10` → **Donate Now** → confirm
- ✅ Progress bar reaches `15/100 ETH`.

**Da Nang Relief Group (Account #7)**
- Switch MetaMask to Account #7 → Connect Wallet
- Donate tab → enter `8` → **Donate Now** → confirm
- ✅ Progress bar reaches `23/100 ETH`. Three rows in Donation History.

---

### Phase 2 — Owner Submits Spending Request with IPFS Evidence

**Nguyen Van An (Account #0)**
- Switch MetaMask to Account #0 → Connect Wallet
- **Validator Dashboard** tab → Owner panel is visible *(only Account #0 sees this)*
- **Upload Evidence** section → drag any file (image, PDF, or document) onto the upload area
- Wait for the CID to appear and the gateway link to show. This confirms the file is pinned on IPFS.
- Fill the request form:
  - **Description:** `Purchase 50 water purification units for Hoa Binh Province`
  - **Beneficiary:** `0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65` (Account #4)
  - **Amount:** `10`
- Click **Submit Request** → confirm MetaMask
- Switch to **Requests** tab → request appears with status `Pending`, vote count `0/2`, and a clickable IPFS evidence link.

---

### Phase 3 — Validators Review and Approve

**Tran Thi Bich (Account #1) — Approves**
- Switch MetaMask to Account #1 → Connect Wallet
- **Validator Dashboard** tab → Validator panel visible
- Click the IPFS evidence link to review the uploaded file
- Click **Approve** → confirm MetaMask
- ✅ Vote count shows `1/2`. Status remains `Pending`.

**Le Minh Duc (Account #2) — Approves**
- Switch MetaMask to Account #2 → Connect Wallet
- **Validator Dashboard** → click **Approve** on the same request → confirm
- ✅ Vote count reaches `2/2`. Status changes to `Ready`. Account #3 vote no longer required.

---

### Phase 4 — Release Funds to Beneficiary

**Ha Noi Red Cross (Account #5) — triggers release** *(any account can do this)*
- Switch MetaMask to Account #5
- **Requests** tab → click **Release Funds** on the `Ready` request → confirm MetaMask
- ✅ Status changes to `Executed`. Release Funds button disappears.

**Hoa Binh Relief Centre (Account #4) — verify receipt**
- Switch MetaMask to Account #4
- Check balance in MetaMask → shows approximately `10,012 ETH`
  *(10,000 start + 2 ETH from deploy script + 10 ETH just released)*

---

### Phase 5 — Campaign 2: Earthquake Emergency Fund *(3-of-3 unanimous)*

> *Campaign selector: switch to **"Earthquake Emergency Fund — 3/3 multisig"***

- **Da Nang Relief Group (Account #7)** → Donate tab → donate `15 ETH` → confirm
- **Nguyen Van An (Account #0)** → Validator Dashboard → upload evidence → submit request:
  - Description: `Emergency shelter kits for earthquake survivors`
  - Beneficiary: Account #4
  - Amount: `10`
- **Tran Thi Bich (Account #1)** → Validator Dashboard → **Approve** → confirm
- **Le Minh Duc (Account #2)** → Validator Dashboard → **Approve** → confirm
- **Pham Thi Lan (Account #3)** → Validator Dashboard → **Approve** → confirm *(all 3 required for unanimous)*
- ✅ Status changes to `Ready` after Account #3 votes. Any account can release funds.
- Any account → **Requests** tab → **Release Funds** → confirm

---

### Phase 6 — Rejection Demo *(back on Campaign 1)*

> *Campaign selector: switch back to **"Vietnam Flood Relief 2026"***

- **Nguyen Van An (Account #0)** → Validator Dashboard → submit second request:
  - Description: `Administrative and transport costs`
  - Beneficiary: Account #4
  - Amount: `3`
- **Tran Thi Bich (Account #1)** → Validator Dashboard → click **Reject** → confirm
- **Le Minh Duc (Account #2)** → Validator Dashboard → click **Reject** → confirm
- ✅ Status changes to `Rejected`. No ETH moves. Release Funds button does not appear. Outcome is permanent.

---

## 8. Feature and Role Summary

### 8.1 What Each Role Can Do

| Role | Accounts | Capabilities |
|---|---|---|
| Campaign Owner | Account #0 (Nguyen Van An) | Connect wallet, donate, submit spending requests with IPFS evidence, view all campaigns |
| Validator | Accounts #1–3 | Connect wallet, donate, review evidence via IPFS link, cast Approve or Reject vote on pending requests |
| Donor | Accounts #4–7 | Connect wallet, donate ETH, trigger fund release on approved requests, view donation history |
| Beneficiary | Account #4 (Hoa Binh Centre) | Receives ETH when release is triggered. Can also donate. |

### 8.2 Campaign Configurations

| Campaign | Validators | Threshold | Meaning |
|---|---|---|---|
| Vietnam Flood Relief 2026 | 3 (Accounts #1, 2, 3) | 2 of 3 | Any 2 validators can approve |
| Earthquake Emergency Fund | 3 (Accounts #1, 2, 3) | 3 of 3 | All validators must approve (unanimous) |

### 8.3 What Each Tab Does

| Tab | Function |
|---|---|
| Donate | Shows campaign progress bar, donation form with quick-fill buttons, live donation history table polling every 3 seconds |
| Requests | Lists all spending requests for the selected campaign with status badges (Pending / Ready / Executed / Rejected), IPFS evidence links, vote counts, and Release Funds button |
| Owner Panel (Dashboard) | Visible only to Account #0. Contains IPFS file uploader and spending request submission form. |
| Validator Panel (Dashboard) | Visible only to Accounts #1–3. Lists pending requests with Approve and Reject buttons. Already-voted requests show disabled buttons. |

---

## 9. Account Reference

| # | Name and Role | Address |
|---|---|---|
| 0 | Nguyen Van An — Campaign Owner | `0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266` |
| 1 | Tran Thi Bich — Validator 1 | `0x70997970C51812dc3A010C7d01b50e0d17dc79C8` |
| 2 | Le Minh Duc — Validator 2 | `0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC` |
| 3 | Pham Thi Lan — Validator 3 | `0x90F79bf6EB2c4f870365E785982E1f101E93b906` |
| 4 | Hoa Binh Relief Centre — Beneficiary | `0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65` |
| 5 | Ha Noi Red Cross — Donor | `0x9965507D1a55bcC2695C58ba16FB37d819B0A4dc` |
| 6 | HCMC Community Fund — Donor | `0x976EA74026E726554dB657fA54763abd0C3a0aa9` |
| 7 | Da Nang Relief Group — Donor | `0x14dC79964da2C08b23698B3D3cc7Ca32193d9955` |

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

> 🔑 These keys come from Hardhat's public default mnemonic and hold no real value. **Never use on any live network.**

---

## 10. Troubleshooting

| Error / Symptom | Fix |
|---|---|
| `cd reliefchain\backend` fails with `PathNotFound` | You are already inside `reliefchain/`. Use `cd backend` not `cd reliefchain\backend`. |
| `npm install` aborts with `ERESOLVE` | Always use `npm install --legacy-peer-deps` in both `backend` and `frontend`. |
| `Cannot find module fp-ts/lib/Either` | Run: `npm install --save-dev --legacy-peer-deps fp-ts@2.16.9` |
| `Error HH801` missing plugin dependencies | Run the full plugin install command from [Section 4, Step 4](#step-4--install-hardhat-plugin-dependencies). |
| `Error HH404` OpenZeppelin not found | Run: `npm install --legacy-peer-deps @openzeppelin/contracts@4.9.6` |
| `TS5109` moduleResolution error | Set `module: CommonJS` and `moduleResolution: node` in `backend/tsconfig.json` |
| Port 8545 already in use | Run: `netstat -ano \| findstr :8545` then `taskkill /PID <pid> /F` |
| MetaMask shows wrong network | Click **Switch Network** in the red banner, or manually select **Hardhat Local** in MetaMask. |
| Contract address mismatch after node restart | Re-run deploy script, copy new addresses, update `frontend/.env`, restart Vite. |
| Vite not picking up `.env` changes | Stop server (`Ctrl+C`) then run: `npx vite --force` |
| `No matching export CAMPAIGN_FACTORY_ABI` | File is empty. Open `src/contracts/CampaignFactory.abi.ts` in VS Code, paste full content, save. |
| Donation History not updating | Click **Refresh** button above progress bar or switch tabs to remount the component. |
| IPFS upload fails or returns no CID | Verify `VITE_PINATA_JWT` is set in `frontend/.env` and restart Vite after saving. |

---

## 11. Running Tests

The test suite runs against an in-process Hardhat network. The standalone node **does not need to be running**.

```bash
cd backend
npx hardhat test
```

> **Expected:** 40+ tests pass across Campaign and CampaignFactory suites.

| Test Suite | Count | Coverage |
|---|---|---|
| Campaign — Deployment | 10 | Constructor validation, role assignment, configurable threshold |
| Campaign — Donations | 5 | ETH acceptance, zero rejection, accumulation |
| Campaign — createRequest | 7 | Owner-only, validation, CID storage |
| Campaign — vote | 8 | Approve, reject, double-vote prevention, unanimous threshold |
| Campaign — releaseFunds | 6 | Transfer, state update, re-entry prevention |
| Campaign — View helpers | 3 | isValidator, isOwner, getAllDonations |
| Campaign — Access control | 2 | Cross-role restrictions |
| CampaignFactory | 9 | Deploy, register, caller ownership, multi-campaign, end-to-end |

To run with gas reporting:

```bash
$env:REPORT_GAS="true"; npx hardhat test
```

---

*INTE2641 Assignment 3 — HN Group 4*