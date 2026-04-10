// Crawler Agent — fetches a URL or GitHub README and extracts
// structured info: title, description, body text, links, addresses,
// and tech keywords. No LLM calls — pure scraping.

export interface CrawledData {
  url: string;
  title: string;
  description: string;
  bodyText: string;        // first 5000 chars of plain text
  links: string[];
  foundAddresses: string[];
  techHints: string[];     // detected tech mentions
  fetchedAt: string;
  source: "html" | "github_readme" | "raw_text";
  error?: string;
}

const TECH_KEYWORDS = [
  "solidity", "evm", "ethereum", "polygon", "arbitrum", "optimism", "base",
  "uniswap", "compound", "aave", "erc-20", "erc-721", "erc-1155",
  "usdc", "usdt", "dai", "stablecoin", "defi", "dex", "amm", "lending",
  "smart contract", "blockchain", "web3", "metamask", "circle", "arc",
  "rust", "anchor", "solana", "cosmwasm", "near", "fhe", "zk", "zero-knowledge",
  "rollup", "layer 2", "l2", "bridge", "swap", "yield", "vault", "staking"
];

export async function crawl(url: string): Promise<CrawledData> {
  try {
    const isGithub = /github\.com/i.test(url);
    let fetchUrl = url;
    let source: CrawledData["source"] = "html";

    // For GitHub URLs, try the raw README first
    if (isGithub) {
      const m = url.match(/github\.com\/([^\/]+)\/([^\/\?#]+)/i);
      if (m) {
        const [, owner, repo] = m;
        const cleanRepo = repo.replace(/\.git$/, "");
        fetchUrl = `https://raw.githubusercontent.com/${owner}/${cleanRepo}/main/README.md`;
        source = "github_readme";
      }
    }

    let res = await fetch(fetchUrl, {
      headers: {
        "User-Agent": "QuantumGuard-Crawler/1.0 (+https://quantumguard.app)",
        "Accept": "text/html,text/plain,application/json,*/*",
      },
      signal: AbortSignal.timeout(15_000),
    });

    // GitHub master branch fallback
    if (!res.ok && isGithub && fetchUrl.includes("/main/")) {
      const masterUrl = fetchUrl.replace("/main/", "/master/");
      res = await fetch(masterUrl, {
        headers: { "User-Agent": "QuantumGuard-Crawler/1.0" },
        signal: AbortSignal.timeout(10_000),
      });
    }

    // If GitHub readme fails entirely, try the github.com page
    if (!res.ok && isGithub) {
      res = await fetch(url, {
        headers: { "User-Agent": "QuantumGuard-Crawler/1.0" },
        signal: AbortSignal.timeout(10_000),
      });
      source = "html";
    }

    if (!res.ok) {
      return emptyResult(url, `HTTP ${res.status}`);
    }

    const text = await res.text();
    return parseContent(url, text, source);
  } catch (err: any) {
    return emptyResult(url, err.message || "fetch failed");
  }
}

function parseContent(url: string, raw: string, source: CrawledData["source"]): CrawledData {
  // Extract title
  const titleMatch = raw.match(/<title[^>]*>([^<]+)<\/title>/i);
  let title = titleMatch ? decodeHtml(titleMatch[1].trim()) : "";

  // For GitHub README, the title is often the first # heading
  if (source === "github_readme" && !title) {
    const headingMatch = raw.match(/^#\s+(.+)$/m);
    if (headingMatch) title = headingMatch[1].trim();
  }

  // Extract meta description
  const descMatch =
    raw.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i) ||
    raw.match(/<meta[^>]+content=["']([^"']+)["'][^>]+name=["']description["']/i) ||
    raw.match(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i);
  const description = descMatch ? decodeHtml(descMatch[1].trim()) : "";

  // Strip HTML tags & markdown to get plain text
  const stripped = raw
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim();

  const bodyText = stripped.slice(0, 5000);

  // Extract unique addresses
  const addressMatches = raw.match(/0x[a-fA-F0-9]{40}/g) || [];
  const foundAddresses = [...new Set(addressMatches.map((a) => a.toLowerCase()))];

  // Extract unique links (cap to 30)
  const linkMatches = raw.match(/https?:\/\/[^\s"'<>)]+/g) || [];
  const links = [...new Set(linkMatches)].slice(0, 30);

  // Detect tech keywords (case-insensitive)
  const lowerText = stripped.toLowerCase();
  const techHints = TECH_KEYWORDS.filter((k) => lowerText.includes(k));

  return {
    url,
    title,
    description,
    bodyText,
    links,
    foundAddresses,
    techHints,
    fetchedAt: new Date().toISOString(),
    source,
  };
}

function decodeHtml(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function emptyResult(url: string, error: string): CrawledData {
  return {
    url,
    title: "",
    description: "",
    bodyText: "",
    links: [],
    foundAddresses: [],
    techHints: [],
    fetchedAt: new Date().toISOString(),
    source: "html",
    error,
  };
}
