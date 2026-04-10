// Direct test of Gemma 4 via the Gemini API
import "dotenv/config";

const key = process.env.GEMINI_API_KEY;
if (!key) throw new Error("GEMINI_API_KEY not set");

console.log("\n🧪 Testing Gemma 4 31B directly...\n");

const model = "gemma-4-31b-it";
const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;

const body = {
  contents: [{
    role: "user",
    parts: [{
      text: `Return ONLY a JSON object (no markdown fences) with these fields:
{ "model_name": "<which model are you?>", "capabilities": ["list", "your", "strengths"], "released": "when" }`
    }]
  }],
};

try {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const status = res.status;
  const data: any = await res.json();

  if (!res.ok) {
    console.log(`❌ HTTP ${status}`);
    console.log(JSON.stringify(data, null, 2));
  } else {
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || "(no text)";
    console.log(`✅ Gemma 4 responded:\n`);
    console.log(text);
  }
} catch (err: any) {
  console.error("❌ Error:", err.message);
}
