// Orchestrator — runs all agents (in parallel where possible)
// and combines them via the Strategy Agent.

import { resolveInput } from "./resolver.js";
import { crawl } from "./crawler.js";
import { runProductAgent } from "./productAgent.js";
import { fetchOnchainData } from "../lib/arc.js";
import { runAdvisor } from "./advisor.js";
import { runStrategyAgent, type UnifiedStrategy } from "./strategyAgent.js";
import type { CrawledData } from "./crawler.js";
import type { ProductAnalysis } from "./productAgent.js";
import type { OnchainData, AIReport, ResolvedInput } from "../types.js";

export interface OrchestratedReport {
  input: string;
  resolved: ResolvedInput;
  crawled: CrawledData | null;
  product: ProductAnalysis | null;
  onchain: OnchainData | null;
  tech: AIReport | null;
  strategy: UnifiedStrategy | null;
  agentsRun: string[];
  durationMs: number;
}

export async function orchestrate(userInput: string): Promise<OrchestratedReport> {
  const start = Date.now();
  const agentsRun: string[] = [];

  console.log(`\n🎼 Orchestrator starting for: ${userInput}`);

  // Step 1: Resolve input
  console.log("   [1] Resolver...");
  const resolved = await resolveInput(userInput);
  agentsRun.push("resolver");

  // Step 2: Run crawler + onchain in parallel (if applicable)
  const crawlPromise: Promise<CrawledData | null> =
    /^https?:\/\//i.test(userInput) ? crawl(userInput) :
    resolved.kind === "url" || resolved.kind === "github" ? crawl(resolved.sourceText) :
    Promise.resolve(null);

  const onchainPromise: Promise<OnchainData | null> = resolved.contractAddress
    ? fetchOnchainData(resolved.contractAddress)
    : Promise.resolve(null);

  console.log("   [2] Crawler + OnChain (parallel)...");
  const [crawled, onchain] = await Promise.all([crawlPromise, onchainPromise]);
  if (crawled) agentsRun.push("crawler");
  if (onchain) agentsRun.push("onchain");

  // Step 3: Product agent (needs crawled data)
  let product: ProductAnalysis | null = null;
  if (crawled) {
    console.log("   [3] Product Agent...");
    product = await runProductAgent(crawled);
    agentsRun.push("product");
  }

  // Step 4: Tech advisor (needs onchain data)
  let tech: AIReport | null = null;
  if (onchain && onchain.hasCode) {
    console.log("   [4] Tech Advisor...");
    tech = await runAdvisor(onchain);
    agentsRun.push("tech");
  }

  // Step 5: Strategy synthesis
  let strategy: UnifiedStrategy | null = null;
  if (product || tech) {
    console.log("   [5] Strategy Agent...");
    strategy = await runStrategyAgent(product, onchain, tech, crawled);
    agentsRun.push("strategy");
  }

  const durationMs = Date.now() - start;
  console.log(`   ✅ Orchestration complete in ${durationMs}ms · agents: ${agentsRun.join(", ")}\n`);

  return {
    input: userInput,
    resolved,
    crawled,
    product,
    onchain,
    tech,
    strategy,
    agentsRun,
    durationMs,
  };
}
