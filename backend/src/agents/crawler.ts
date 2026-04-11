// Deep Crawler — fetches main page + relevant subpages + GitHub README
// in parallel, combines into one rich content blob.

export interface CrawledData {
  url: string;
  title: string;
  description: string;
  bodyText: string;          // combined from all pages
  pagesCrawled: string[];    // URLs we actually fetched
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
];

// Page paths we prefer to follow if found
const RELEVANT_PATHS = [
  /\/about/i, /\/docs/i, /\/whitepaper/i, /\/how/i, /\/product/i,
  /\/features/i, /\/roadmap/i, /\/team/i, /\/litepaper/i, /\/learn/i,
  /readme/i,
];

export async function crawl(url: string): Promise<CrawledData> {
  try {
    const isGithub = /github\.com/i.test(url);
    const allPages: { url: string; text: string; html: string }[] = [];

    // 1. Always fetch the main page first
    const main = await fetchPage(url);
    if (main) allPages.push({ url, ...main });

    // 2. If GitHub, also fetch the raw README
    if (isGithub) {
      const m = url.match(/github\.com\/([^\/]+)\/([^\/\?#]+)/i);
      if (m) {
        const [, owner, repo] = m;
        const cleanRepo = repo.replace(/\.git$/, "");
        const readmeUrls = [
          `https://raw.githubusercontent.com/${owner}/${cleanRepo}/main/README.md`,
          `https://raw.githubusercontent.com/${owner}/${cleanRepo}/master/README.md`,
        ];
        for (const ru of readmeUrls) {
          const r = await fetchPage(ru);
          if (r && r.text.length > 100) {
            allPages.push({ url: ru, ...r });
            break;
          }
        }
      }
    }

    // 3. Find relevant subpage links from the main page
    if (main && !isGithub) {
      const baseOrigin = new URL(url).origin;
      const internalLinks = findInternalLinks(main.html, baseOrigin);
      const relevant = internalLinks
        .filter((l) => RELEVANT_PATHS.some((p) => p.test(l)))
        .slice(0, 4); // cap at 4 subpages

      // Fetch them in parallel
      const subPages = await Promise.all(relevant.map(fetchPage));
      relevant.forEach((u, i) => {
        const p = subPages[i];
        if (p && p.text.length > 100) allPages.push({ url: u, ...p });
      });
    }

    // 4. Combine everything
    if (allPages.length === 0) {
      return emptyResult(url, "no pages fetched");
    }

    return combinePages(url, allPages, isGithub);
  } catch (err: any) {
    return emptyResult(url, err.message || "fetch failed");
  }
}

async function fetchPage(url: string): Promise<{ text: string; html: string } | null> {
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; QuantumGuard-Crawler/1.0)",
        "Accept": "text/html,text/plain,application/json,*/*",
      },
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) return null;
    const html = await res.text();
    const text = stripHtml(html);
    return { text, html };
  } catch {
    return null;
  }
}

function findInternalLinks(html: string, baseOrigin: string): string[] {
  const matches = html.match(/href=["']([^"']+)["']/gi) || [];
  const links = new Set<string>();
  for (const m of matches) {
    const href = m.replace(/^href=["']/i, "").replace(/["']$/, "");
    try {
      let abs: string;
      if (href.startsWith("http")) {
        abs = href;
      } else if (href.startsWith("/")) {
        abs = baseOrigin + href;
      } else {
        continue;
      }
      const u = new URL(abs);
      if (u.origin === baseOrigin) links.add(abs);
    } catch {}
  }
  return Array.from(links);
}

function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function combinePages(rootUrl: string, pages: { url: string; text: string; html: string }[], isGithub: boolean): CrawledData {
  const main = pages[0];

  // Title
  const titleMatch = main.html.match(/<title[^>]*>([^<]+)<\/title>/i);
  let title = titleMatch ? titleMatch[1].trim() : "";
  if (!title && isGithub) {
    const h = main.html.match(/^#\s+(.+)$/m);
    if (h) title = h[1].trim();
  }

  // Description
  const descMatch =
    main.html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i) ||
    main.html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+name=["']description["']/i) ||
    main.html.match(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i);
  const description = descMatch ? descMatch[1].trim() : "";

  // Combined body — concatenate page text, labelled, capped at 12k total chars
  const PER_PAGE_CAP = 3000;
  const TOTAL_CAP = 12000;
  let bodyText = "";
  for (const p of pages) {
    const slug = new URL(p.url).pathname || "/";
    const chunk = `\n\n[PAGE: ${slug}]\n${p.text.slice(0, PER_PAGE_CAP)}`;
    if (bodyText.length + chunk.length > TOTAL_CAP) break;
    bodyText += chunk;
  }
  bodyText = bodyText.trim();

  // Aggregate addresses + links + tech hints across all pages
  const allHtml = pages.map((p) => p.html).join(" ");
  const allText = pages.map((p) => p.text).join(" ").toLowerCase();

  const addressMatches = allHtml.match(/0x[a-fA-F0-9]{40}/g) || [];
  const foundAddresses = [...new Set(addressMatches.map((a) => a.toLowerCase()))];

  const linkMatches = allHtml.match(/https?:\/\/[^\s"'<>)]+/g) || [];
  const links = [...new Set(linkMatches)].slice(0, 50);

  const techHints = TECH_KEYWORDS.filter((k) => allText.includes(k));

  return {
    url: rootUrl,
    title,
    description,
    bodyText,
    pagesCrawled: pages.map((p) => p.url),
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
