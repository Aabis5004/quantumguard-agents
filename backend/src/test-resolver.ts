import { resolveInput } from "./agents/resolver.js";

const inputs = [
  "0x49eD6af7c1C9dc24d4eA9Cb5D80132E46d2b2F2A",
  "https://github.com/Aabis5004/quantumguard-agents",
  "QuantumGuard",
];

for (const input of inputs) {
  console.log(`\n──────────────────────────────────`);
  console.log(`Input: ${input}`);
  const result = await resolveInput(input);
  console.log(JSON.stringify(result, null, 2));
}
