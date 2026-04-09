import { fetchOnchainData } from "./lib/arc.js";
import { runAdvisor } from "./agents/advisor.js";

const myContract = process.env.QUANTUMGUARD_CONTRACT || "0x49eD6af7c1C9dc24d4eA9Cb5D80132E46d2b2F2A";

console.log(`\n🔍 Step 1: Fetching on-chain data for ${myContract}...`);
const onchain = await fetchOnchainData(myContract);
console.log("✅ On-chain data:", onchain);

console.log("\n🧠 Step 2: Sending to Gemini for analysis...");
console.log("(This may take 5-15 seconds)\n");

const report = await runAdvisor(onchain);

console.log("✅ AI Report received!\n");
console.log("─".repeat(60));
console.log("PROJECT SUMMARY:");
console.log(report.project_summary);
console.log("─".repeat(60));
console.log(`Arc Fit Score:      ${report.arc_fit_score}/100`);
console.log(`Quantum Risk Score: ${report.quantum_risk_score}/100`);
console.log("─".repeat(60));
console.log(`\n📋 SUGGESTIONS (${report.suggestions.length}):\n`);

report.suggestions.forEach((s, i) => {
  console.log(`${i + 1}. [${s.severity.toUpperCase()}] ${s.title}`);
  console.log(`   Category: ${s.category}`);
  console.log(`   Problem:  ${s.problem}`);
  console.log(`   Fix:      ${s.fix}`);
  console.log(`   Impact:   ${s.estimated_impact}`);
  console.log();
});

console.log("─".repeat(60));
console.log("🛡️  QUANTUM MIGRATION PLAN:");
console.log(`Urgency: ${report.quantum_migration_plan.urgency}`);
console.log(`Scheme:  ${report.quantum_migration_plan.signature_scheme}`);
console.log(`Action:  ${report.quantum_migration_plan.recommended_action}`);
console.log(`Note:    ${report.quantum_migration_plan.size_tradeoff_note}`);
console.log("─".repeat(60));
