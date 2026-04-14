import { callGemini } from "../lib/gemini.js";
import type { CrawledData } from "./crawler.js";

export interface ProductAnalysis {
  project_name: string;
  one_liner: string;
  category: "defi" | "payments" | "infra" | "wallet" | "tooling" | "social" | "gaming" | "rwa" | "other";
  what_they_are_building: string;
  what_they_did_great: Array<{ observation: string; evidence: string }>;
  improvements_for_arc: Array<{ title: string; evidence_from_site: string; specific_change: string; arc_feature: string }>;
  arc_fit_score: number;
  notes: string;
}

const SYSTEM_PROMPT = `You are a senior Arc engineer at Circle reviewing a specific project. You MUST ground every statement in actual content you saw. Generic advice is forbidden. Every "what they did great" must quote evidence from the content. Every "improvement" must cite a specific thing in their project that needs the change. If you cannot cite evidence, say "Insufficient content to analyze this". Return ONLY strict JSON, no markdown fences.`;

function extractJson(raw: string): any {
  const cleaned = raw.replace(/```json/gi, "").replace(/```/g, "").trim();
  const first = cleaned.indexOf("{");
  const last = cleaned.lastIndexOf("}");
  if (first === -1 || last === -1 || last < first) throw new Error("No JSON object in response");
  return JSON.parse(cleaned.slice(first, last + 1));
}

export async function runProductAgent(crawled: CrawledData): Promise<ProductAnalysis> {
  if (!crawled.bodyText && !crawled.title && !crawled.description) {
    return defaultEmpty(crawled.error);
  }

  const userInput = `Project under review. READ ALL THIS CONTENT CAREFULLY:

URL: ${crawled.url}
Title: ${crawled.title || "(none)"}
Pages crawled: ${crawled.pagesCrawled.join(", ")}
Tech keywords actually found in content: ${crawled.techHints.join(", ") || "none"}

=== FULL CONTENT START ===
${crawled.bodyText.slice(0, 10000)}
=== FULL CONTENT END ===

Now analyze THIS SPECIFIC PROJECT. Every bullet must reference specific things you saw above. No generic Arc advice that could apply to any project.

Return ONLY this JSON:
{
  "project_name": "exact name from content",
  "one_liner": "under 15 words, specific to what THEY built",
  "category": "defi|payments|infra|wallet|tooling|social|gaming|rwa|other",
  "what_they_are_building": "3-5 sentences. Mention at least 3 specific features, pages, or terms from the content above. If they have a 'How it works' section, describe what it says. If they list specific chains, name them.",
  "what_they_did_great": [
    { "observation": "Short positive observation", "evidence": "Quote or paraphrase the exact thing from the content that shows this" },
    { "observation": "...", "evidence": "..." },
    { "observation": "...", "evidence": "..." }
  ],
  "improvements_for_arc": [
    {
      "title": "Improvement title tied to THEIR product",
      "evidence_from_site": "The specific feature/phrase/page from their content that this improvement addresses",
      "specific_change": "What exactly they should change in their product. Reference their own terminology.",
      "arc_feature": "Arc feature name (USDC as native gas, CCTP V2, Gateway, Circle Wallets, StableFX, Permit2, Multicall3, ML-DSA post-quantum signatures, opt-in privacy, EURC, USYC, sub-second finality)"
    },
    { "title": "...", "evidence_from_site": "...", "specific_change": "...", "arc_feature": "..." },
    { "title": "...", "evidence_from_site": "...", "specific_change": "...", "arc_feature": "..." }
  ],
  "arc_fit_score": 0-100,
  "notes": "one short sentence"
}

CRITICAL RULES:
1. If you write "they should use USDC as native gas" — WHY does this project specifically need it? Quote their content.
2. If you write "consider CCTP V2" — WHICH cross-chain feature in their product needs it? Point to it.
3. Every "what_they_did_great" entry MUST have evidence quoting or paraphrasing the content.
4. Every "improvements_for_arc" entry MUST cite evidence_from_site referencing something in THIS project.
5. No boilerplate. No generic stablecoin advice. Ground everything in what you read.`;

  let lastError = "";
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const raw = await callGemini(SYSTEM_PROMPT, userInput);
      const parsed = extractJson(raw) as ProductAnalysis;
      parsed.what_they_did_great = parsed.what_they_did_great || [];
      parsed.improvements_for_arc = parsed.improvements_for_arc || [];
      if (!parsed.project_name) parsed.project_name = "Unknown";
      return parsed;
    } catch (err: any) {
      lastError = err.message;
      console.error(`ProductAgent attempt ${attempt + 1} failed:`, err.message);
    }
  }
  return defaultEmpty(lastError);
}

function defaultEmpty(reason?: string): ProductAnalysis {
  return {
    project_name: "Unknown",
    one_liner: "Could not analyze",
    category: "other",
    what_they_are_building: "Insufficient data — the AI could not produce a clean analysis.",
    what_they_did_great: [],
    improvements_for_arc: [],
    arc_fit_score: 0,
    notes: reason || "Crawler returned no usable content.",
  };
}
