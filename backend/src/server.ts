// QuantumGuard backend API
// Routes:
//   GET  /api/health         → simple ping
//   GET  /api/projects       → list all scanned projects
//   GET  /api/report/:addr   → get one report
//   POST /api/scan           → scan { input } (address, URL, GitHub, or project name)

import express from "express";
import cors from "cors";
import "dotenv/config";
import { fetchOnchainData } from "./lib/arc.js";
import { runAdvisor } from "./agents/advisor.js";
import { resolveInput } from "./agents/resolver.js";
import { orchestrate } from "./agents/orchestrator.js";
import { saveReport, getReport, listReports } from "./lib/storage.js";
import type { FullReport } from "./types.js";

const app = express();
app.use(cors({ origin: true, credentials: true }));
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
// Scan endpoint — accepts address, URL, GitHub link, or project name
// ─────────────────────────────────────────────
app.post("/api/scan", async (req, res) => {
  const { input, contractAddress } = req.body;
  const userInput = input || contractAddress;

  if (!userInput || typeof userInput !== "string") {
    return res.status(400).json({
      error: "Missing 'input'. Provide a contract address, URL, GitHub link, or project name.",
    });
  }

  console.log(`\n🔍 Scan requested for: ${userInput}`);

  try {
    // 1. Resolve whatever the user gave us into a contract address
    console.log("   Step 1: Resolving input...");
    const resolved = await resolveInput(userInput);
    console.log(`   → kind=${resolved.kind} confidence=${resolved.confidence} address=${resolved.contractAddress}`);

    if (!resolved.contractAddress) {
      return res.status(404).json({
        error: "Could not resolve to a contract address.",
        resolved,
      });
    }

    // 2. Fetch on-chain data
    console.log("   Step 2: Fetching on-chain data...");
    const onchain = await fetchOnchainData(resolved.contractAddress);

    if (!onchain.hasCode) {
      return res.status(404).json({
        error: "No contract found at that address on Arc Testnet",
        resolved,
        onchain,
      });
    }

    // 3. Run the advisor (Gemini)
    console.log("   Step 3: Running AI advisor (Gemini)...");
    const ai = await runAdvisor(onchain);

    // 4. Build full report and save
    const report: FullReport = {
      contractAddress: resolved.contractAddress,
      scannedAt: new Date().toISOString(),
      resolved,
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
app.listen(PORT, "0.0.0.0", () => {
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
  console.log("│   POST /api/scan { input }                          │");
  console.log("└─────────────────────────────────────────────────────┘\n");
});

// ─────────────────────────────────────────────
// Deep scan — runs the full multi-agent orchestrator
// ─────────────────────────────────────────────
app.post("/api/scan-deep", async (req, res) => {
  const { input, contractAddress } = req.body;
  const userInput = input || contractAddress;

  if (!userInput || typeof userInput !== "string") {
    return res.status(400).json({ error: "Missing 'input'." });
  }

  try {
    const report = await orchestrate(userInput);
    res.json(report);
  } catch (err: any) {
    console.error("Deep scan failed:", err.message);
    res.status(500).json({ error: "Deep scan failed", message: err.message });
  }
});
