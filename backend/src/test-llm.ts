import { callLLM } from "./lib/llm.js";

console.log("\n🧪 Testing multi-provider LLM fallback chain...\n");

const system = "You return strict JSON only. No markdown fences.";
const user = `Return a JSON object with these fields:
{ "greeting": "hello", "lucky_number": 7, "model_name": "<which model are you?>" }`;

try {
  const { text, providerUsed } = await callLLM(system, user);
  console.log(`\n✅ Answered by: ${providerUsed}\n`);
  console.log("Raw response:");
  console.log(text);
  console.log("\n");
} catch (err: any) {
  console.error("\n❌ All providers failed:");
  console.error(err.message);
}
