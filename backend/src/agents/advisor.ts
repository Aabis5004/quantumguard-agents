// Advisor Agent — uses Gemini to write Arc-specific suggestions

import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { callGemini } from "../lib/gemini.js";
import type { OnchainData, AIReport } from "../types.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const promptPath = join(__dirname, "../../system.md");
const SYSTEM_PROMPT = readFileSync(promptPath, "utf-8");

export async function runAdvisor(onchain: OnchainData): Promise<AIReport> {
  const userInput = JSON.stringify(
    {
      contract_address: onchain.address,
      network: "Arc_Testnet",
      bytecode_size_bytes: onchain.bytecodeSize,
      has_code: onchain.hasCode,
      native_balance_wei: onchain.balance,
      transaction_count: onchain.txCount,
      public_key_exposed: onchain.exposedPublicKey,
      notes: "Analyze this Arc Testnet contract and produce 5-8 concrete improvement suggestions with strong focus on quantum readiness and Arc-native features.",
    },
    null,
    2
  );

  const rawResponse = await callGemini(SYSTEM_PROMPT, userInput);

  // Strip any accidental markdown fences
  const cleaned = rawResponse
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  try {
    return JSON.parse(cleaned) as AIReport;
  } catch (err) {
    console.error("Failed to parse Gemini response:");
    console.error(cleaned);
    throw new Error("Gemini returned invalid JSON");
  }
}
