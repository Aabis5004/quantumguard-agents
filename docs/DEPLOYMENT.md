# Deployment Records

## QuantumGuardPayments Contract — LIVE ✅

| Field | Value |
|---|---|
| **Network** | Arc Testnet (Chain ID 5042002) |
| **Contract Address** | `0x49eD6af7c1C9dc24d4eA9Cb5D80132E46d2b2F2A` |
| **Deployer Wallet** | `0x29ec8BAeaEc9E0022116a5793ED23C308fbD52C7` |
| **Deployment Tx** | `0x7310873c8970ca1d9c8d2cae049874ec7e06f52e4c5263e5d32ec4b2a35fb6ba` |
| **Block Number** | 36272003 |
| **USDC Token Used** | `0x3600000000000000000000000000000000000000` |
| **Compiler** | solc 0.8.34 |
| **Verification** | ✅ Sourcify Exact Match |
| **Deployed** | April 9, 2026 |

## Public links

- **Sourcify (verified source):** https://repo.sourcify.dev/5042002/0x49eD6af7c1C9dc24d4eA9Cb5D80132E46d2b2F2A
- **Arcscan explorer:** https://testnet.arcscan.app/address/0x49eD6af7c1C9dc24d4eA9Cb5D80132E46d2b2F2A

## What it does

QuantumGuardPayments accepts USDC nanopayments for AI-generated Arc project audits.

**Flow:**
1. User approves USDC spend on the QuantumGuard contract
2. User calls `payForReport(projectId, amount)`
3. Contract transfers USDC from user → contract balance
4. Contract emits `ReportPaid(payer, projectId, amount, timestamp)`
5. Backend listens for `ReportPaid` events and unlocks the AI report

## Key functions

- `payForReport(bytes32 projectId, uint256 amount)` — pay for an audit
- `projectIdFromAddress(address arcProject)` — derive a project ID from a contract address
- `contractBalance()` — view collected USDC
- `withdraw(uint256 amount)` — owner only, withdraw funds
- `withdrawAll()` — owner only, drain the contract
- `setMinPayment(uint256 newMin)` — owner only, change minimum payment
- `transferOwnership(address newOwner)` — owner only

## Configuration

- **Minimum payment:** 0.10 USDC (100,000 in 6-decimal units)
