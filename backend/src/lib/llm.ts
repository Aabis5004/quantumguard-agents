// Multi-provider LLM client with automatic failover.
//
// Tries providers in order. If one returns 429 / 503 / network error,
// the next one is tried. The first successful response wins.
//
// Add or remove providers in MODEL_CHAIN below.

import "dotenv/config";

interface LLMProvider {
  name: string;
  model: string;
  call: (system: string, user: string) => Promise<string>;
}

// ────────────────────────────────────────────────
// Provider 1: Google Gemini API (existing key)
// ────────────────────────────────────────────────
async function callGoogleGenAI(model: string, system: string, user: string): Promise<string> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY not set");

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;
  const body = {
    contents: [{ role: "user", parts: [{ text: `${system}\n\n=== INPUT ===\n${user}` }] }],
    generationConfig: {
      temperature: 0.4,
      responseMimeType: "application/json",
    },
  };

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(45_000),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`HTTP ${res.status}: ${errText.slice(0, 200)}`);
  }

  const data: any = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("Empty response from Google");
  return text;
}

// ────────────────────────────────────────────────
// Provider 2: Google Gemma via Gemini API
// (same endpoint, doesn't support responseMimeType)
// ────────────────────────────────────────────────
async function callGoogleGemma(model: string, system: string, user: string): Promise<string> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY not set");

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;
  const body = {
    contents: [{
      role: "user",
      parts: [{
        text: `CRITICAL INSTRUCTION: Your entire response must be a single valid JSON object. The very first character of your response MUST be the opening brace { and the very last character MUST be the closing brace }. Do not write any prose, role-play, explanation, greeting, or markdown fences. Just the raw JSON object.\n\n${system}\n\n=== INPUT ===\n${user}\n\nRemember: respond with ONLY the JSON object. Start with { and end with }.`
      }]
    }],
  };

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(45_000),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`HTTP ${res.status}: ${errText.slice(0, 200)}`);
  }

  const data: any = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("Empty response from Gemma");
  return text;
}

// ────────────────────────────────────────────────
// Provider 3: OpenRouter (free models)
// ────────────────────────────────────────────────
async function callOpenRouter(model: string, system: string, user: string): Promise<string> {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) throw new Error("OPENROUTER_API_KEY not set");

  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${key}`,
      "HTTP-Referer": "https://quantumguard-agents-ii6s.vercel.app",
      "X-Title": "QuantumGuard Agents",
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      temperature: 0.4,
    }),
    signal: AbortSignal.timeout(60_000),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`HTTP ${res.status}: ${errText.slice(0, 200)}`);
  }

  const data: any = await res.json();
  const text = data?.choices?.[0]?.message?.content;
  if (!text) throw new Error("Empty response from OpenRouter");
  return text;
}

// ────────────────────────────────────────────────
// The fallback chain (top to bottom)
// ────────────────────────────────────────────────
const MODEL_CHAIN: LLMProvider[] = [
  // Google Gemini direct (best at JSON, your existing key)
  { name: 'google/gemini-2.5-flash-lite', model: 'gemini-2.5-flash-lite',
    call: (s, u) => callGoogleGenAI('gemini-2.5-flash-lite', s, u) },
  { name: 'google/gemini-2.5-flash', model: 'gemini-2.5-flash',
    call: (s, u) => callGoogleGenAI('gemini-2.5-flash', s, u) },
  // OpenRouter free models (separate quota pool from Google direct)
  { name: 'openrouter/google/gemma-4-31b-it:free', model: 'google/gemma-4-31b-it:free',
    call: (s, u) => callOpenRouter('google/gemma-4-31b-it:free', s, u) },
  { name: 'openrouter/google/gemma-4-26b-a4b-it:free', model: 'google/gemma-4-26b-a4b-it:free',
    call: (s, u) => callOpenRouter('google/gemma-4-26b-a4b-it:free', s, u) },
  { name: 'openrouter/meta-llama/llama-3.3-70b-instruct:free', model: 'meta-llama/llama-3.3-70b-instruct:free',
    call: (s, u) => callOpenRouter('meta-llama/llama-3.3-70b-instruct:free', s, u) },
  { name: 'openrouter/openai/gpt-oss-120b:free', model: 'openai/gpt-oss-120b:free',
    call: (s, u) => callOpenRouter('openai/gpt-oss-120b:free', s, u) },
  { name: 'openrouter/google/gemma-3-27b-it:free', model: 'google/gemma-3-27b-it:free',
    call: (s, u) => callOpenRouter('google/gemma-3-27b-it:free', s, u) },
];

// Errors that should trigger a fallback to the next provider
function isRetryable(err: Error): boolean {
  const msg = err.message.toLowerCase();
  return (
    msg.includes("429") ||         // rate limit
    msg.includes("quota") ||
    msg.includes("503") ||         // overloaded
    msg.includes("unavailable") ||
    msg.includes("502") ||
    msg.includes("504") ||
    msg.includes("timeout") ||
    msg.includes("aborted") ||
    msg.includes("network") ||
    msg.includes("fetch failed") ||
    msg.includes("not set") ||     // missing key for this provider
    msg.includes("empty response")
  );
}

/**
 * Main entry point. Tries each provider in MODEL_CHAIN until one succeeds.
 * Returns { text, providerUsed }.
 */
export async function callLLM(systemPrompt: string, userInput: string): Promise<{ text: string; providerUsed: string }> {
  const errors: string[] = [];

  for (const provider of MODEL_CHAIN) {
    try {
      console.log(`   🤖 Trying ${provider.name}...`);
      const text = await provider.call(systemPrompt, userInput);
      // Sanity check: response must contain a JSON object structure
      if (!text.includes('{') || !text.includes('}')) {
        console.log(`   ⚠️  ${provider.name} returned non-JSON text — treating as failure`);
        errors.push(`${provider.name}: response was not JSON`);
        continue;
      }
      console.log(`   ✅ ${provider.name} answered`);
      return { text, providerUsed: provider.name };
    } catch (err: any) {
      const msg = err.message || String(err);
      console.log(`   ⚠️  ${provider.name} failed: ${msg.slice(0, 100)}`);
      errors.push(`${provider.name}: ${msg.slice(0, 100)}`);
      if (!isRetryable(err)) {
        // Non-retryable: still try the next provider, but log differently
        console.log(`      (non-retryable error, but trying next provider anyway)`);
      }
    }
  }

  throw new Error(
    `All ${MODEL_CHAIN.length} LLM providers failed:\n  ` + errors.join("\n  ")
  );
}

/**
 * Convenience wrapper for callers that just want the text.
 */
export async function callGemini(systemPrompt: string, userInput: string): Promise<string> {
  const { text } = await callLLM(systemPrompt, userInput);
  return text;
}
