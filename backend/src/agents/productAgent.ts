// Product Agent — reads crawled website content and produces
// a structured product analysis using Gemini.

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
  notes: string;
}

const SYSTEM_PROMPT = `You are a senior Web3 product analyst. You read website content and extract a clean, factual product summary. You return ONLY strict JSON with no markdown fences, no commentary, and no preamble.`;

export async function runProductAgent(crawled: CrawledData): Promise<ProductAnalysis> {
  if (!crawled.bodyText && !crawled.title && !crawled.description) {
    return defaultEmpty(crawled.error);
  }

  const userInput = `Here is the scraped content from a project's website or GitHub README:

URL: ${crawled.url}
Source: ${crawled.source}
Title: ${crawled.title || "(none)"}
Meta description: ${crawled.description || "(none)"}
Detected tech mentions: ${crawled.techHints.join(", ") || "none"}
Found contract addresses: ${crawled.foundAddresses.length}
Number of outbound links: ${crawled.links.length}

Body text (first 5000 chars):
${crawled.bodyText || "(empty)"}

Analyze this and return ONLY a JSON object with this exact shape:
{
  "project_name": "string",
  "one_liner": "string under 15 words describing what it is",
  "what_it_does": "2-3 sentences explaining the product",
  "target_users": "who would use this",
  "value_prop": "main value proposition",
  "category": "defi | payments | infra | wallet | tooling | social | gaming | rwa | other",
  "detected_chains": ["ethereum", "polygon", ...],
  "arc_fit_score": 0-100,
  "arc_fit_explanation": "2-3 sentences on whether this project would benefit from migrating to or building on Arc (Circle's stablecoin L1 with USDC as native gas, sub-second finality, opt-in privacy, post-quantum signatures, and full Circle platform integration including CCTP, Gateway, USDC, EURC, USYC). Be specific about which Arc features fit this project.",
  "notes": "any caveats, missing data, or assumptions"
}

Scoring guidance for arc_fit_score:
- 80-100: stablecoin payments, FX, lending, capital markets, RWA, treasury, B2B finance — Arc was built for these
- 60-79: general DeFi (DEXs, AMMs, yield), wallets, dev tooling — strong fit
- 40-59: NFTs with payment flows, gaming with on-chain economy, social with payments
- 20-39: pure NFTs, gaming without payments, infra unrelated to money
- 0-19: not a Web3 project at all, or irrelevant to stablecoin finance

Output ONLY the JSON object. No markdown fences. No commentary.`;

  try {
    const raw = await callGemini(SYSTEM_PROMPT, userInput);
    const cleaned = raw
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();
    const parsed = JSON.parse(cleaned) as ProductAnalysis;
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
    arc_fit_explanation: "Insufficient crawled data to analyze.",
    notes: reason || "Crawler returned no usable content.",
  };
}
