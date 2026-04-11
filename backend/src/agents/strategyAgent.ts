import { callGemini } from "../lib/gemini.js";
import type { CrawledData } from "./crawler.js";
import type { ProductAnalysis } from "./productAgent.js";
import type { OnchainData, AIReport } from "../types.js";

export interface UnifiedStrategy {
  one_line_verdict: string;
  arc_score: number;
  do_this_first: { title: string; steps: string[]; arc_feature: string };
  arc_improvements: Array<{ title: string; what: string; arc_feature: string }>;
  security_checklist: string[];
  effort: "low" | "medium" | "high";
}

const SYSTEM = `You are a senior Arc engineer at Circle giving a code-review-style report to a project building on Arc Testnet. Be direct, specific, and Arc-focused. NO generic Web3 advice. Every recommendation must name an actual Arc feature: USDC as native gas, EURC, USYC, sub-second finality, opt-in privacy, ML-DSA/Falcon post-quantum signatures, CCTP V2, Gateway, Circle Wallets, StableFX, Permit2, Multicall3. Return ONLY strict JSON, no markdown fences.`;

export async function runStrategyAgent(
  product: ProductAnalysis | null,
  onchain: OnchainData | null,
  techReport: AIReport | null,
  crawled: CrawledData | null,
): Promise<UnifiedStrategy> {
  const input = `Project context:

${product ? `PRODUCT: ${JSON.stringify(product, null, 2)}` : ""}
${onchain ? `ONCHAIN: ${JSON.stringify(onchain, null, 2)}` : ""}
${techReport ? `TECH AUDIT: ${JSON.stringify(techReport, null, 2)}` : ""}
${crawled ? `SCRAPED: ${crawled.title} | tech: ${crawled.techHints.join(",")}` : ""}

Return ONLY this JSON. Every bullet must reference a real Arc feature by name. Be concrete enough that a junior dev could open VSCode and start coding.

{
  "one_line_verdict": "One sentence — what this project should do FIRST on Arc",
  "arc_score": 0-100,
  "do_this_first": {
    "title": "Single most impactful Arc change (under 12 words)",
    "steps": [
      "Step 1: concrete action (under 20 words)",
      "Step 2: ...",
      "Step 3: ...",
      "Step 4: ..."
    ],
    "arc_feature": "Exact Arc feature name"
  },
  "arc_improvements": [
    { "title": "...", "what": "what to change in 1 sentence", "arc_feature": "Arc feature name" },
    { "title": "...", "what": "...", "arc_feature": "..." },
    { "title": "...", "what": "...", "arc_feature": "..." },
    { "title": "...", "what": "...", "arc_feature": "..." }
  ],
  "security_checklist": [
    "Arc-specific security check (under 20 words)",
    "Another Arc check",
    "Another Arc check",
    "Another Arc check",
    "Another Arc check"
  ],
  "effort": "low|medium|high"
}`;

  try {
    const raw = await callGemini(SYSTEM, input);
    const cleaned = raw.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/\s*```$/i, "").trim();
    const parsed = JSON.parse(cleaned) as UnifiedStrategy;
    parsed.arc_improvements = parsed.arc_improvements || [];
    parsed.security_checklist = parsed.security_checklist || [];
    if (parsed.do_this_first) parsed.do_this_first.steps = parsed.do_this_first.steps || [];
    return parsed;
  } catch (err: any) {
    return {
      one_line_verdict: "Strategy synthesis failed: " + err.message,
      arc_score: 0,
      do_this_first: { title: "—", steps: [], arc_feature: "—" },
      arc_improvements: [],
      security_checklist: [],
      effort: "medium",
    };
  }
}
