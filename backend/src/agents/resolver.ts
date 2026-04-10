// Resolver Agent — figures out what kind of input the user gave
// and turns it into a usable contract address (or list of candidates)

import { callGemini } from "../lib/gemini.js";

export type ResolverResult = {
  kind: "address" | "url" | "github" | "name";
  contractAddress: string | null;
  sourceText: string;
  confidence: "high" | "medium" | "low";
  notes: string;
  hint?: string;
};

const ADDRESS_REGEX = /^0x[a-fA-F0-9]{40}$/;
const ADDRESS_FIND_REGEX = /0x[a-fA-F0-9]{40}/g;

// Pages we know don't have contract addresses
const KNOWN_NON_PROJECT_DOMAINS = [
  "docs.arc.network",
  "docs.circle.com",
  "developers.circle.com",
  "circle.com",
  "ethereum.org",
  "google.com",
];

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

    // Check known non-project domains
    try {
      const url = new URL(trimmed);
      if (KNOWN_NON_PROJECT_DOMAINS.some(d => url.hostname.includes(d))) {
        return {
          kind: "url",
          contractAddress: null,
          sourceText: trimmed,
          confidence: "low",
          notes: `${url.hostname} is a documentation/reference site, not a project page.`,
          hint: "Try pasting a specific project's website, GitHub repo, or its contract address (0x...).",
        };
      }
    } catch {}

    return await resolveFromUrl(trimmed, isGithub);
  }

  // 3. Project name → ask Gemini to research it
  return await resolveFromName(trimmed);
}

// ─────────────────────────────────────────────
// URL / GitHub resolver
// ─────────────────────────────────────────────
async function resolveFromUrl(url: string, isGithub: boolean): Promise<ResolverResult> {
  const candidates: string[] = [];

  // For GitHub URLs, try a few likely README locations
  if (isGithub) {
    const m = url.match(/github\.com\/([^\/]+)\/([^\/\?#]+)/i);
    if (m) {
      const [, owner, repo] = m;
      const cleanRepo = repo.replace(/\.git$/, "");
      candidates.push(
        `https://raw.githubusercontent.com/${owner}/${cleanRepo}/main/README.md`,
        `https://raw.githubusercontent.com/${owner}/${cleanRepo}/master/README.md`,
        `https://api.github.com/repos/${owner}/${cleanRepo}/readme`,
        url,
      );
    }
  } else {
    candidates.push(url);
  }

  let lastError = "";
  for (const candidate of candidates) {
    try {
      const res = await fetch(candidate, {
        headers: {
          "User-Agent": "QuantumGuard-Agent/1.0",
          "Accept": "text/html,text/plain,application/json,*/*",
        },
        signal: AbortSignal.timeout(10_000),
      });

      if (!res.ok) {
        lastError = `HTTP ${res.status} on ${candidate}`;
        continue;
      }

      const text = await res.text();
      const matches = text.match(ADDRESS_FIND_REGEX);

      if (matches && matches.length > 0) {
        // Pick the most-mentioned address
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
          sourceText: url,
          confidence: sorted[0][1] > 1 ? "high" : "medium",
          notes: `Found ${sorted.length} unique address(es) in the page. Picked the most frequent one.`,
        };
      }
    } catch (err: any) {
      lastError = err.message;
    }
  }

  // No address found in any candidate — try Gemini fallback
  return await fallbackToGemini(url, isGithub, lastError);
}

// ─────────────────────────────────────────────
// Gemini fallback when scraping fails
// ─────────────────────────────────────────────
async function fallbackToGemini(url: string, isGithub: boolean, scrapeError: string): Promise<ResolverResult> {
  const prompt = `The user provided this URL: ${url}

I scraped the page but could not find any 0x contract addresses.
Question: Do you know what project this URL belongs to, and does it have a deployed contract on Arc Testnet (chain id 5042002)?

If yes, return ONLY a JSON object:
{ "contractAddress": "0x...", "confidence": "high|medium|low", "projectName": "...", "notes": "short explanation" }

If you don't know or it's not a project (e.g. docs site, blog), return:
{ "contractAddress": null, "confidence": "low", "projectName": "...", "notes": "Why this URL isn't a project" }

Output ONLY the JSON, nothing else.`;

  try {
    const raw = await callGemini("You return strict JSON only.", prompt);
    const cleaned = raw
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();
    const parsed = JSON.parse(cleaned);

    if (parsed.contractAddress) {
      return {
        kind: isGithub ? "github" : "url",
        contractAddress: parsed.contractAddress,
        sourceText: url,
        confidence: parsed.confidence || "medium",
        notes: `${parsed.projectName || "Project"}: ${parsed.notes || "Found via Gemini lookup."}`,
      };
    }

    return {
      kind: isGithub ? "github" : "url",
      contractAddress: null,
      sourceText: url,
      confidence: "low",
      notes: parsed.notes || "Could not find a contract address on this page.",
      hint: "Try pasting the project's contract address directly (0x...) or a URL that mentions the address.",
    };
  } catch (err: any) {
    return {
      kind: isGithub ? "github" : "url",
      contractAddress: null,
      sourceText: url,
      confidence: "low",
      notes: scrapeError ? `Could not fetch the page (${scrapeError}).` : "No contract address found on the page.",
      hint: "Try pasting the contract address directly, or a URL that includes it in the page text.",
    };
  }
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
      hint: parsed.contractAddress ? undefined : "Try pasting the project's contract address (0x...) or its GitHub repo URL.",
    };
  } catch (err: any) {
    return {
      kind: "name",
      contractAddress: null,
      sourceText: name,
      confidence: "low",
      notes: `Could not resolve project name: ${err.message}`,
      hint: "Try pasting the project's contract address (0x...) directly.",
    };
  }
}
