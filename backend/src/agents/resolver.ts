// Resolver Agent — figures out what kind of input the user gave
// and turns it into a usable contract address (or list of candidates)

import { callGemini } from "../lib/gemini.js";

export type ResolverResult = {
  kind: "address" | "url" | "github" | "name";
  contractAddress: string | null;
  sourceText: string;
  confidence: "high" | "medium" | "low";
  notes: string;
};

const ADDRESS_REGEX = /^0x[a-fA-F0-9]{40}$/;
const ADDRESS_FIND_REGEX = /0x[a-fA-F0-9]{40}/g;

/**
 * Resolve any user input (address, URL, GitHub, or project name) to a
 * contract address that can be analyzed.
 */
export async function resolveInput(input: string): Promise<ResolverResult> {
  const trimmed = input.trim();

  // 1. Direct contract address
  if (ADDRESS_REGEX.test(trimmed)) {
    return {
      kind: "address",
      contractAddress: trimmed,
      sourceText: "Direct contract address",
      confidence: "high",
      notes: "User pasted a valid 0x address.",
    };
  }

  // 2. URL or GitHub URL
  if (/^https?:\/\//i.test(trimmed)) {
    const isGithub = /github\.com/i.test(trimmed);
    return await resolveFromUrl(trimmed, isGithub);
  }

  // 3. Project name → ask Gemini to research it
  return await resolveFromName(trimmed);
}

// ─────────────────────────────────────────────
// URL / GitHub resolver
// ─────────────────────────────────────────────
async function resolveFromUrl(url: string, isGithub: boolean): Promise<ResolverResult> {
  try {
    // For GitHub URLs, switch to the raw README endpoint to get more text
    let fetchUrl = url;
    if (isGithub) {
      const m = url.match(/github\.com\/([^\/]+)\/([^\/\?#]+)/i);
      if (m) {
        const [, owner, repo] = m;
        fetchUrl = `https://raw.githubusercontent.com/${owner}/${repo}/main/README.md`;
      }
    }

    const res = await fetch(fetchUrl, {
      headers: { "User-Agent": "QuantumGuard-Agent/1.0" },
      signal: AbortSignal.timeout(10_000),
    });

    if (!res.ok) {
      // Try the original URL as a fallback
      const fallback = await fetch(url, {
        headers: { "User-Agent": "QuantumGuard-Agent/1.0" },
        signal: AbortSignal.timeout(10_000),
      });
      if (!fallback.ok) {
        return {
          kind: isGithub ? "github" : "url",
          contractAddress: null,
          sourceText: url,
          confidence: "low",
          notes: `Could not fetch the page (HTTP ${fallback.status}).`,
        };
      }
      const text = await fallback.text();
      return findAddressInText(text, url, isGithub);
    }

    const text = await res.text();
    return findAddressInText(text, url, isGithub);
  } catch (err: any) {
    return {
      kind: isGithub ? "github" : "url",
      contractAddress: null,
      sourceText: url,
      confidence: "low",
      notes: `Fetch error: ${err.message}`,
    };
  }
}

function findAddressInText(text: string, sourceUrl: string, isGithub: boolean): ResolverResult {
  const matches = text.match(ADDRESS_FIND_REGEX);
  if (!matches || matches.length === 0) {
    return {
      kind: isGithub ? "github" : "url",
      contractAddress: null,
      sourceText: sourceUrl,
      confidence: "low",
      notes: "No 0x contract address found on the page.",
    };
  }

  // Pick the most-mentioned address (frequency = signal of importance)
  const counts: Record<string, number> = {};
  for (const a of matches) {
    const lower = a.toLowerCase();
    counts[lower] = (counts[lower] || 0) + 1;
  }
  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  const top = sorted[0][0];

  return {
    kind: isGithub ? "github" : "url",
    contractAddress: top,
    sourceText: sourceUrl,
    confidence: sorted[0][1] > 1 ? "high" : "medium",
    notes: `Found ${sorted.length} unique address(es) in the page. Picked the most frequent one.`,
  };
}

// ─────────────────────────────────────────────
// Project name → Gemini lookup
// ─────────────────────────────────────────────
async function resolveFromName(name: string): Promise<ResolverResult> {
  const prompt = `You are a research assistant. The user gave the project name "${name}".
If you know a contract address for this project on Arc Testnet (chain id 5042002),
return ONLY a JSON object like:
{ "contractAddress": "0x...", "confidence": "high|medium|low", "notes": "short explanation" }
If you do not know, return:
{ "contractAddress": null, "confidence": "low", "notes": "Project not found in known data." }
Output ONLY the JSON, nothing else.`;

  try {
    const raw = await callGemini("You return strict JSON only.", prompt);
    const cleaned = raw
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();
    const parsed = JSON.parse(cleaned);
    return {
      kind: "name",
      contractAddress: parsed.contractAddress || null,
      sourceText: name,
      confidence: parsed.confidence || "low",
      notes: parsed.notes || "Resolved by Gemini.",
    };
  } catch (err: any) {
    return {
      kind: "name",
      contractAddress: null,
      sourceText: name,
      confidence: "low",
      notes: `Could not resolve project name: ${err.message}`,
    };
  }
}
