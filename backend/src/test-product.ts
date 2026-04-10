// Test the crawler + product agent together
// Usage:
//   npx tsx --env-file=.env src/test-product.ts
//   npx tsx --env-file=.env src/test-product.ts https://aave.com

import { crawl } from "./agents/crawler.js";
import { runProductAgent } from "./agents/productAgent.js";

const url = process.argv[2] || "https://uniswap.org";

console.log(`\n┌──────────────────────────────────────────────┐`);
console.log(`│  🕵️  Sub-part 1 test: Crawler + Product       │`);
console.log(`└──────────────────────────────────────────────┘`);
console.log(`\nTarget URL: ${url}\n`);

console.log("→ Step 1: Crawling...");
const crawled = await crawl(url);

if (crawled.error) {
  console.log(`  ⚠️  Crawl warning: ${crawled.error}`);
}

console.log(`  Title:        ${crawled.title || "(none)"}`);
console.log(`  Description:  ${crawled.description ? crawled.description.slice(0, 80) + "..." : "(none)"}`);
console.log(`  Body chars:   ${crawled.bodyText.length}`);
console.log(`  Tech hints:   ${crawled.techHints.join(", ") || "none"}`);
console.log(`  Addresses:    ${crawled.foundAddresses.length} found`);
console.log(`  Links:        ${crawled.links.length} found`);

console.log("\n→ Step 2: Sending to Product Agent (Gemini)...");
console.log("  (this may take 5-15 seconds)\n");

const product = await runProductAgent(crawled);

console.log("─".repeat(60));
console.log("📦 PRODUCT ANALYSIS");
console.log("─".repeat(60));
console.log(`Project:       ${product.project_name}`);
console.log(`One-liner:     ${product.one_liner}`);
console.log(`Category:      ${product.category}`);
console.log(`Chains:        ${product.detected_chains.join(", ") || "(none detected)"}`);
console.log(`Arc fit:       ${product.arc_fit_score}/100`);
console.log("");
console.log(`What it does:  ${product.what_it_does}`);
console.log(`Target users:  ${product.target_users}`);
console.log(`Value prop:    ${product.value_prop}`);
console.log("");
console.log(`Arc fit explanation:`);
console.log(`  ${product.arc_fit_explanation}`);
console.log("");
console.log(`Notes: ${product.notes}`);
console.log("─".repeat(60));
