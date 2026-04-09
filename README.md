# QuantumGuard Agents

AI agents that scan Arc Testnet, audit live projects, and give builders concrete, quantum-aware improvement suggestions — powered by Circle's Arc blockchain, Gemini AI, and USDC nanopayments.

Built for the **Agentic Economy on Arc Hackathon** (April 20–26, 2026).

## What it does

- 🔍 **Discovery Agent** — Scans Arc Testnet for new contracts and activity
- 🧠 **Analyzer Agent** — Reads contract code, transactions, and usage patterns
- 🛡️ **Quantum Agent** — Flags "harvest-now-decrypt-later" risk and suggests Arc's post-quantum signature migration (ML-DSA / Falcon)
- 💡 **Advisor Agent** — Uses Gemini to write specific, Arc-native improvement suggestions
- 💳 **AgentCard Billing** — Accept USDC nanopayments via a virtual-card UI (no crypto jargon)

## Tech stack

- **Blockchain:** Arc Testnet (Chain ID 5042002), USDC as gas
- **Contracts:** Solidity ^0.8.30, deployed via Remix
- **Backend:** Node.js + Express + TypeScript
- **Frontend:** React + Vite + Tailwind CSS
- **AI:** Google Gemini (free tier)
- **Wallets:** Circle Developer-Controlled Wallets + MetaMask

## Status

🚧 Under active development for hackathon demo.

## Live Deployment

- **Contract on Arc Testnet:** `0x49eD6af7c1C9dc24d4eA9Cb5D80132E46d2b2F2A`
- **Live website:** https://quantumguard-agents-ii6s.vercel.app
- **Live API:** https://quantumguard-agents-production.up.railway.app/api/health
- **Verified source:** https://repo.sourcify.dev/5042002/0x49eD6af7c1C9dc24d4eA9Cb5D80132E46d2b2F2A
