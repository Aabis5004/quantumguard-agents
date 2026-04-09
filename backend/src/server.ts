// QuantumGuard backend API
// Routes:
//   GET  /api/health         → simple ping
//   GET  /api/projects       → list all scanned projects
//   GET  /api/report/:addr   → get one report
//   POST /api/scan           → scan a new contract { contractAddress }

import express from "express";
import cors from "cors";
import "dotenv/config";
import { fetchOnchainData } from "./lib/arc.js";
import { runAdvisor } from "./agents/advisor.js";
import { saveReport, getReport, listReports } from "./lib/storage.js";
import type { FullReport } from "./types.js";

const app = express();
app.use(cors());
app.use(express.json());

const PORT = Number(process.env.PORT || 3000);

// ─────────────────────────────────────────────
// Health check
// ─────────────────────────────────────────────
app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    service: "QuantumGuard Agents",
    network: "Arc Testnet",
    chainId: 5042002,
    contract: process.env.QUANTUMGUARD_CONTRACT,
    timestamp: new Date().toISOString(),
  });
});

// ─────────────────────────────────────────────
// List all scanned projects
// ─────────────────────────────────────────────
app.get("/api/projects", (_req, res) => {
  const reports = listReports();
  res.json({
    count: reports.length,
    projects: reports.map((r) => ({
      contractAddress: r.contractAddress,
      scannedAt: r.scannedAt,
      arc_fit_score: r.ai.arc_fit_score,
      quantum_risk_score: r.ai.quantum_risk_score,
      summary: r.ai.project_summary,
      suggestion_count: r.ai.suggestions.length,
    })),
  });
});

// ─────────────────────────────────────────────
// Get one full report
// ─────────────────────────────────────────────
app.get("/api/report/:addr", (req, res) => {
  const report = getReport(req.params.addr);
  if (!report) {
    return res.status(404).json({ error: "Report not found. Run /api/scan first." });
  }
  res.json(report);
});

// ─────────────────────────────────────────────
// Scan a new contract
// ─────────────────────────────────────────────
app.post("/api/scan", async (req, res) => {
  const { contractAddress } = req.body;

  if (!contractAddress || !/^0x[a-fA-F0-9]{40}$/.test(contractAddress)) {
    return res.status(400).json({
      error: "Invalid contractAddress. Must be a valid 0x-prefixed Ethereum address.",
    });
  }

  console.log(`\n🔍 Scan requested for ${contractAddress}`);

  try {
    // 1. Fetch on-chain data
    console.log("   Step 1: Fetching on-chain data...");
    const onchain = await fetchOnchainData(contractAddress);

    if (!onchain.hasCode) {
      return res.status(404).json({
        error: "No contract found at that address on Arc Testnet",
        onchain,
      });
    }

    // 2. Run the advisor (Gemini)
    console.log("   Step 2: Running AI advisor (Gemini)...");
    const ai = await runAdvisor(onchain);

    // 3. Build full report and save
    const report: FullReport = {
      contractAddress,
      scannedAt: new Date().toISOString(),
      onchain,
      ai,
    };
    saveReport(report);

    console.log(`   ✅ Scan complete. ${ai.suggestions.length} suggestions generated.\n`);
    res.json(report);
  } catch (err: any) {
    console.error("   ❌ Scan failed:", err.message);
    res.status(500).json({
      error: "Scan failed",
      message: err.message,
    });
  }
});

// ─────────────────────────────────────────────
// Start server
// ─────────────────────────────────────────────
app.listen(PORT, () => {
  console.log("\n┌─────────────────────────────────────────────────────┐");
  console.log("│  🛡️  QuantumGuard Agents — Backend                  │");
  console.log("├─────────────────────────────────────────────────────┤");
  console.log(`│  Listening on http://localhost:${PORT}                │`);
  console.log("│  Network:    Arc Testnet (5042002)                  │");
  console.log("│  AI Model:   gemini-2.5-flash-lite                  │");
  console.log("├─────────────────────────────────────────────────────┤");
  console.log("│  Endpoints:                                         │");
  console.log("│   GET  /api/health                                  │");
  console.log("│   GET  /api/projects                                │");
  console.log("│   GET  /api/report/:addr                            │");
  console.log("│   POST /api/scan { contractAddress }                │");
  console.log("└─────────────────────────────────────────────────────┘\n");
});
