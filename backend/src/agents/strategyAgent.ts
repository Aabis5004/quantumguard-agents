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
  // NEW point-wise sections
  product_improvements: string[];
  security_action_items: string[];
  arc_migration_steps: string[];
  migration_roadmap: string[];
  estimated_effort: "low" | "medium" | "high";
  business_impact: string;
}

const SYSTEM = `You are a senior Web3 strategy + security consultant. You combine multiple agent reports into a clear, point-wise strategy. You return ONLY strict JSON, no markdown fences. Every bullet must be specific, actionable, and under 25 words.`;

export async function runStrategyAgent(
  product: ProductAnalysis | null,
  onchain: OnchainData | null,
  techReport: AIReport | null,
  crawled: CrawledData | null,
): Promise<UnifiedStrategy> {
  const input = `Combine these into ONE unified strategy:

PRODUCT: ${JSON.stringify(product, null, 2)}
ONCHAIN: ${JSON.stringify(onchain, null, 2)}
TECH: ${JSON.stringify(techReport, null, 2)}
CRAWLED: ${crawled?.title || ""} | ${crawled?.techHints?.join(",") || ""}

Return ONLY this JSON shape (every array MUST have 4-6 specific bullets):
{
  "executive_summary": "3-4 sentences: what the project is, biggest opportunity on Arc",
  "top_3_recommendations": [
    { "title": "...", "why": "...", "how": "...", "arc_feature": "..." },
    { "title": "...", "why": "...", "how": "...", "arc_feature": "..." },
    { "title": "...", "why": "...", "how": "...", "arc_feature": "..." }
  ],
  "product_improvements": [
    "Specific UX/product bullet (under 25 words)",
    "Another bullet",
    "Another bullet",
    "Another bullet"
  ],
  "security_action_items": [
    "Specific security/trust bullet — what to fix or audit",
    "Another security bullet",
    "Another security bullet",
    "Another security bullet"
  ],
  "arc_migration_steps": [
    "Step 1: What to do first to use Arc",
    "Step 2: ...",
    "Step 3: ...",
    "Step 4: ..."
  ],
  "migration_roadmap": ["Week 1: ...", "Week 2: ...", "Week 3: ...", "Week 4: ..."],
  "estimated_effort": "low|medium|high",
  "business_impact": "one paragraph on business value"
}`;

  try {
    const raw = await callGemini(SYSTEM, input);
    const cleaned = raw.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/\s*```$/i, "").trim();
    const parsed = JSON.parse(cleaned) as UnifiedStrategy;
    parsed.product_improvements = parsed.product_improvements || [];
    parsed.security_action_items = parsed.security_action_items || [];
    parsed.arc_migration_steps = parsed.arc_migration_steps || [];
    return parsed;
  } catch (err: any) {
    return {
      executive_summary: "Strategy synthesis failed: " + err.message,
      top_3_recommendations: [],
      product_improvements: [],
      security_action_items: [],
      arc_migration_steps: [],
      migration_roadmap: [],
      estimated_effort: "medium",
      business_impact: "Unable to compute.",
    };
  }
}
