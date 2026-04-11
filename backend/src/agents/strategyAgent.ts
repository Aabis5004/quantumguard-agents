// Strategy Agent — combines outputs from all other agents into
// a single unified migration & improvement strategy.

import { callGemini } from "../lib/gemini.js";
import type { CrawledData } from "./crawler.js";
import type { ProductAnalysis } from "./productAgent.js";
import type { OnchainData, AIReport } from "../types.js";

export interface UnifiedStrategy {
  executive_summary: string;
  top_3_recommendations: Array<{
    title: string;
    why: string;
    how: string;
    arc_feature: string;
  }>;
  migration_roadmap: string[];
  estimated_effort: "low" | "medium" | "high";
  business_impact: string;
}

const SYSTEM = `You are a senior Web3 strategy consultant. You combine multiple agent reports into a single actionable strategy. Return ONLY strict JSON, no markdown fences.`;

export async function runStrategyAgent(
  product: ProductAnalysis | null,
  onchain: OnchainData | null,
  techReport: AIReport | null,
  crawled: CrawledData | null,
): Promise<UnifiedStrategy> {
  const input = `Combine these agent reports into ONE unified strategy:

PRODUCT ANALYSIS:
${JSON.stringify(product, null, 2)}

ONCHAIN DATA:
${JSON.stringify(onchain, null, 2)}

TECH REPORT:
${JSON.stringify(techReport, null, 2)}

CRAWLED METADATA:
Title: ${crawled?.title || "n/a"}
Tech hints: ${crawled?.techHints?.join(", ") || "none"}

Return ONLY this JSON shape:
{
  "executive_summary": "3-4 sentence overview of the project and its biggest opportunity on Arc",
  "top_3_recommendations": [
    { "title": "...", "why": "...", "how": "...", "arc_feature": "..." },
    { "title": "...", "why": "...", "how": "...", "arc_feature": "..." },
    { "title": "...", "why": "...", "how": "...", "arc_feature": "..." }
  ],
  "migration_roadmap": ["Week 1: ...", "Week 2: ...", "Week 3: ...", "Week 4: ..."],
  "estimated_effort": "low | medium | high",
  "business_impact": "one paragraph on the business value of migrating to/improving on Arc"
}`;

  try {
    const raw = await callGemini(SYSTEM, input);
    const cleaned = raw.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/\s*```$/i, "").trim();
    return JSON.parse(cleaned) as UnifiedStrategy;
  } catch (err: any) {
    return {
      executive_summary: "Strategy synthesis failed: " + err.message,
      top_3_recommendations: [],
      migration_roadmap: [],
      estimated_effort: "medium",
      business_impact: "Unable to compute.",
    };
  }
}
