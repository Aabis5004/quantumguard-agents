import { crawl } from "./agents/crawler.js";

const url = process.argv[2] || "https://arclenz.xyz/ecosystem";
console.log(`\n🕷️ Crawling: ${url}\n`);

const result = await crawl(url);
console.log(`Title:        ${result.title || "(none)"}`);
console.log(`Description:  ${result.description.slice(0, 120) || "(none)"}`);
console.log(`Body chars:   ${result.bodyText.length}`);
console.log(`Pages:        ${result.pagesCrawled.join(", ")}`);
console.log(`Tech hints:   ${result.techHints.join(", ") || "none"}`);
console.log(`Addresses:    ${result.foundAddresses.length}`);
console.log(`Links:        ${result.links.length}`);
console.log(`\n--- First 800 chars of body ---\n${result.bodyText.slice(0, 800)}`);
if (result.error) console.log(`\n⚠️  Error: ${result.error}`);
