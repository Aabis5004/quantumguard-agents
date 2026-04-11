import { callGemini } from "../lib/gemini.js";
import type { CrawledData } from "./crawler.js";

export interface ProductAnalysis {
  project_name: string;
  one_liner: string;
  what_it_does: string;
  target_users: string;
  value_prop: string;
  category: "defi" | "payments" | "infra" | "wallet" | "tooling" | "social" | "gaming" | "rwa" | "other";
  detected_chains: string[];
  arc_fit_score: number;
  arc_fit_explanation: string;
  // NEW point-wise fields
  what_they_should_focus_on: string[];
  security_concerns: string[];
  arc_specific_improvements: string[];
  notes: string;
}

const SYSTEM_PROMPT = `You are a senior Web3 product analyst AND security reviewer. You read website content and produce a clear, point-wise product + security analysis. You return ONLY strict JSON with no markdown fences.`;

export async function runProductAgent(crawled: CrawledData): Promise<ProductAnalysis> {
  if (!crawled.bodyText && !crawled.title && !crawled.description) {
    return defaultEmpty(crawled.error);
  }

  const userInput = `Analyze this project:

URL: ${crawled.url}
Title: ${crawled.title || "(none)"}
Description: ${crawled.description || "(none)"}
Tech mentions: ${crawled.techHints.join(", ") || "none"}
Addresses found: ${crawled.foundAddresses.length}

Body text:
${crawled.bodyText || "(empty)"}

Return ONLY this JSON shape (every field required, arrays must have 3-5 items each):
{
  "project_name": "string",
  "one_liner": "under 15 words",
  "what_it_does": "2-3 sentences",
  "target_users": "who uses this",
  "value_prop": "main value",
  "category": "defi|payments|infra|wallet|tooling|social|gaming|rwa|other",
  "detected_chains": ["chain1", "chain2"],
  "arc_fit_score": 0-100,
  "arc_fit_explanation": "2-3 sentences on Arc benefit",
  "what_they_should_focus_on": [
    "Short bullet (under 20 words) about a product/UX improvement",
    "Another bullet",
    "Another bullet"
  ],
  "security_concerns": [
    "Short bullet about a potential security/trust risk based on what you see",
    "Another security bullet",
    "Another security bullet"
  ],
  "arc_specific_improvements": [
    "Short bullet: how Arc feature X would specifically help THIS project",
    "Another Arc-specific bullet",
    "Another Arc-specific bullet"
  ],
  "notes": "any caveats"
}

Scoring guidance for arc_fit_score:
- 80-100: stablecoin payments, FX, lending, capital markets, RWA, B2B finance
- 60-79: general DeFi, wallets, dev tooling
- 40-59: NFTs with payments, gaming with on-chain economy
- 20-39: pure NFTs, gaming, infra unrelated to money
- 0-19: not Web3 / irrelevant

For security_concerns: even without contract code, infer risks from product type (e.g., "Payment platform handling user funds — critical to verify smart contract audit status before mainnet launch" or "No mention of multi-sig treasury — single-key risk").

Output ONLY the JSON. No markdown fences.`;

  try {
    const raw = await callGemini(SYSTEM_PROMPT, userInput);
    const cleaned = raw.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/\s*```$/i, "").trim();
    const parsed = JSON.parse(cleaned) as ProductAnalysis;
    // Ensure arrays exist even if model omitted them
    parsed.what_they_should_focus_on = parsed.what_they_should_focus_on || [];
    parsed.security_concerns = parsed.security_concerns || [];
    parsed.arc_specific_improvements = parsed.arc_specific_improvements || [];
    return parsed;
  } catch (err: any) {
    console.error("ProductAgent failed:", err.message);
    return defaultEmpty(err.message);
  }
}

function defaultEmpty(reason?: string): ProductAnalysis {
  return {
    project_name: "Unknown",
    one_liner: "Could not analyze project",
    what_it_does: "No data available",
    target_users: "Unknown",
    value_prop: "Unknown",
    category: "other",
    detected_chains: [],
    arc_fit_score: 0,
    arc_fit_explanation: "Insufficient data.",
    what_they_should_focus_on: [],
    security_concerns: [],
    arc_specific_improvements: [],
    notes: reason || "Crawler returned no usable content.",
  };
}
