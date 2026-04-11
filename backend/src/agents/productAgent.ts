import { callGemini } from "../lib/gemini.js";
import type { CrawledData } from "./crawler.js";

export interface ProductAnalysis {
  project_name: string;
  one_liner: string;
  category: "defi" | "payments" | "infra" | "wallet" | "tooling" | "social" | "gaming" | "rwa" | "other";
  what_they_are_building: string;     // section 1: rich paragraph
  what_they_did_great: string[];      // section 2: 3-5 bullets
  improvements_for_arc: Array<{ title: string; what: string; arc_feature: string }>; // section 3: 3-5 specific Arc improvements
  arc_fit_score: number;
  notes: string;
}

const SYSTEM_PROMPT = `You are a senior Arc engineer at Circle. You review projects in the Arc Testnet community and give them clear, actionable feedback. You ONLY discuss things related to Arc and Circle infrastructure (USDC as native gas, EURC, USYC, sub-second finality, opt-in privacy, ML-DSA/Falcon post-quantum signatures, CCTP V2, Gateway, Circle Wallets, StableFX, Permit2, Multicall3). You ignore generic Web3 advice. Return ONLY strict JSON, no markdown fences.`;

export async function runProductAgent(crawled: CrawledData): Promise<ProductAnalysis> {
  if (!crawled.bodyText && !crawled.title && !crawled.description) {
    return defaultEmpty(crawled.error);
  }

  const userInput = `Project to review for the Arc Testnet community.

URL: ${crawled.url}
Title: ${crawled.title || "(none)"}
Meta description: ${crawled.description || "(none)"}
Pages crawled: ${crawled.pagesCrawled.join(", ")}
Tech keywords found: ${crawled.techHints.join(", ") || "none"}
Contract addresses found: ${crawled.foundAddresses.length}

Combined content from all crawled pages:
${crawled.bodyText}

Analyze ALL of the above content carefully. Then return ONLY this JSON. Be specific and reference details from the actual content you read. Every "improvement" must mention a real Arc feature by name.

{
  "project_name": "string (use real name from content)",
  "one_liner": "under 15 words, what they actually built",
  "category": "defi|payments|infra|wallet|tooling|social|gaming|rwa|other",
  "what_they_are_building": "3-5 sentences. Be specific. Reference actual features, sections, or pages you saw. Don't be generic.",
  "what_they_did_great": [
    "Specific thing they did well (under 25 words). Reference what you actually saw.",
    "Another specific positive observation",
    "Another specific positive observation",
    "Another specific positive observation"
  ],
  "improvements_for_arc": [
    { "title": "Short improvement title", "what": "Concrete change in 1-2 sentences", "arc_feature": "Exact Arc feature name" },
    { "title": "...", "what": "...", "arc_feature": "..." },
    { "title": "...", "what": "...", "arc_feature": "..." }
  ],
  "arc_fit_score": 0-100,
  "notes": "one short sentence"
}

Rules:
- "what_they_are_building" must show you actually READ the content. Mention real features, real terminology from the project.
- "what_they_did_great" must be specific to what you saw, NOT generic ("great UI", "good docs" is too generic — say WHICH part).
- "improvements_for_arc" must each name an Arc feature. NO generic Web3 advice. NO "use multi-sig" without tying to Arc.
- Output ONLY the JSON. No markdown fences. No commentary.`;

  try {
    const raw = await callGemini(SYSTEM_PROMPT, userInput);
    const cleaned = raw.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/\s*```$/i, "").trim();
    const parsed = JSON.parse(cleaned) as ProductAnalysis;
    parsed.what_they_did_great = parsed.what_they_did_great || [];
    parsed.improvements_for_arc = parsed.improvements_for_arc || [];
    return parsed;
  } catch (err: any) {
    console.error("ProductAgent failed:", err.message);
    return defaultEmpty(err.message);
  }
}

function defaultEmpty(reason?: string): ProductAnalysis {
  return {
    project_name: "Unknown",
    one_liner: "Could not analyze",
    category: "other",
    what_they_are_building: "Insufficient data — the crawler could not fetch usable content from this URL.",
    what_they_did_great: [],
    improvements_for_arc: [],
    arc_fit_score: 0,
    notes: reason || "Crawler returned no usable content.",
  };
}
