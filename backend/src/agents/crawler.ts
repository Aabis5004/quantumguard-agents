// Crawler — uses Jina Reader (free, no API key) to get clean
// rendered content from any URL, even JS-heavy modern sites.

export interface CrawledData {
  url: string;
  title: string;
  description: string;
  bodyText: string;
  pagesCrawled: string[];
  links: string[];
  foundAddresses: string[];
  techHints: string[];
  fetchedAt: string;
  error?: string;
}

const TECH_KEYWORDS = [
  "solidity","evm","ethereum","polygon","arbitrum","optimism","base","arc",
  "uniswap","compound","aave","erc-20","erc-721","stablecoin","defi","dex","amm",
  "lending","usdc","usdt","eurc","circle","cctp","gateway","wallet","staking",
  "rust","solana","rollup","l2","bridge","swap","yield","vault","mint","burn",
  "permit2","multicall","metamask","viem","ethers","wagmi","hardhat","foundry",
  "payment","payments","merchant","invoice","subscription","fiat","escrow",
  "kyc","aml","compliance","treasury","custody","nft","dao",
];

async function fetchViaJina(url: string): Promise<string | null> {
  try {
    const res = await fetch(`https://r.jina.ai/${url}`, {
      headers: { "Accept": "text/markdown, text/plain" },
      signal: AbortSignal.timeout(20_000),
    });
    if (!res.ok) return null;
    const text = await res.text();
    return text.length > 100 ? text : null;
  } catch {
    return null;
  }
}

async function fetchRaw(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; QuantumGuard/1.0)",
        "Accept": "text/html,text/plain,*/*",
      },
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export async function crawl(url: string): Promise<CrawledData> {
  const isGithub = /github\.com/i.test(url);
  const pages: { source: string; content: string }[] = [];

  // Strategy 1: GitHub README (raw, no JS needed)
  if (isGithub) {
    const m = url.match(/github\.com\/([^\/]+)\/([^\/\?#]+)/i);
    if (m) {
      const [, owner, repo] = m;
      const cleanRepo = repo.replace(/\.git$/, "");
      for (const branch of ["main", "master"]) {
        const readme = await fetchRaw(
          `https://raw.githubusercontent.com/${owner}/${cleanRepo}/${branch}/README.md`
        );
        if (readme && readme.length > 200) {
          pages.push({ source: `${owner}/${cleanRepo}/README.md`, content: readme });
          break;
        }
      }
    }
  }

  // Strategy 2: Jina Reader (handles JS-rendered sites — this is the key fix)
  const jinaText = await fetchViaJina(url);
  if (jinaText) {
    pages.push({ source: `jina:${url}`, content: jinaText });
  }

  // Strategy 3: Plain raw fetch as last resort
  if (pages.length === 0) {
    const raw = await fetchRaw(url);
    if (raw && raw.length > 200) {
      pages.push({ source: `raw:${url}`, content: stripHtml(raw) });
    }
  }

  if (pages.length === 0) {
    return emptyResult(url, "All fetch strategies failed");
  }

  // Combine all pages, cap each at 6000 chars, total at 14000
  const combined = pages
    .map((p) => `\n\n[SOURCE: ${p.source}]\n${p.content.slice(0, 6000)}`)
    .join("\n")
    .slice(0, 14000);

  // Title extraction (Jina returns "Title: <title>" on first line)
  let title = "";
  const titleLine = combined.match(/^Title:\s*(.+)$/im);
  if (titleLine) title = titleLine[1].trim();
  if (!title && isGithub) {
    const h = combined.match(/^#\s+(.+)$/m);
    if (h) title = h[1].trim();
  }

  // Description: first ~200 chars of clean content
  const description = combined
    .replace(/^Title:.+$/im, "")
    .replace(/^URL Source:.+$/im, "")
    .trim()
    .slice(0, 200);

  // Aggregate addresses
  const addressMatches = combined.match(/0x[a-fA-F0-9]{40}/g) || [];
  const foundAddresses = [...new Set(addressMatches.map((a) => a.toLowerCase()))];

  // Aggregate links
  const linkMatches = combined.match(/https?:\/\/[^\s"'<>)\]]+/g) || [];
  const links = [...new Set(linkMatches)].slice(0, 50);

  // Tech hints
  const lower = combined.toLowerCase();
  const techHints = TECH_KEYWORDS.filter((k) => lower.includes(k));

  return {
    url,
    title,
    description,
    bodyText: combined,
    pagesCrawled: pages.map((p) => p.source),
    links,
    foundAddresses,
    techHints,
    fetchedAt: new Date().toISOString(),
  };
}

function emptyResult(url: string, error: string): CrawledData {
  return {
    url, title: "", description: "", bodyText: "",
    pagesCrawled: [], links: [], foundAddresses: [], techHints: [],
    fetchedAt: new Date().toISOString(), error,
  };
}
