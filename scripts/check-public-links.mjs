const DEFAULT_SEEDS = [
  "https://www.goodaba.com/",
  "https://www.goodaba.com/pricing",
  "https://www.goodaba.com/jobs",
  "https://www.goodaba.com/jobs/search",
  "https://www.goodaba.com/jobs/employers",
  "https://www.findabatherapy.org/provider/foundations-autism",
];

const MAX_PAGES = Number.parseInt(process.env.PUBLIC_LINK_AUDIT_MAX_PAGES ?? "80", 10);
const REQUEST_TIMEOUT_MS = Number.parseInt(
  process.env.PUBLIC_LINK_AUDIT_TIMEOUT_MS ?? "10000",
  10
);

function parseSeeds(argv) {
  const seeds = [];

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === "--seed") {
      const value = argv[index + 1];
      if (!value) {
        throw new Error("Expected a URL after --seed");
      }
      seeds.push(value);
      index += 1;
    }
  }

  if (seeds.length > 0) return seeds;

  const envSeeds = process.env.PUBLIC_LINK_AUDIT_SEEDS
    ?.split(",")
    .map((seed) => seed.trim())
    .filter(Boolean);

  if (envSeeds && envSeeds.length > 0) return envSeeds;
  return DEFAULT_SEEDS;
}

function normalizeUrl(value) {
  const url = new URL(value);
  url.hash = "";
  return url.toString();
}

function shouldSkip(url) {
  if (!/^https?:$/.test(url.protocol)) return true;
  if (url.pathname.startsWith("/auth/")) return true;
  if (url.pathname.startsWith("/dashboard")) return true;
  if (url.pathname.startsWith("/api/")) return true;
  if (url.pathname.startsWith("/_next/")) return true;
  if (url.pathname === "/favicon.ico") return true;
  return false;
}

function extractLinks(html, baseUrl, allowedHosts) {
  const links = new Set();
  const hrefPattern = /href=["']([^"'#]+)["']/gi;

  for (const match of html.matchAll(hrefPattern)) {
    try {
      const url = new URL(match[1], baseUrl);
      if (!allowedHosts.has(url.hostname)) continue;
      if (shouldSkip(url)) continue;
      links.add(normalizeUrl(url));
    } catch {
      continue;
    }
  }

  return [...links];
}

async function fetchPage(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    return await fetch(url, {
      redirect: "follow",
      headers: { "user-agent": "Codex public link audit" },
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
}

async function main() {
  const seeds = parseSeeds(process.argv.slice(2)).map(normalizeUrl);
  const allowedHosts = new Set(seeds.map((seed) => new URL(seed).hostname));
  const queue = [...seeds];
  const visited = new Set();
  const failures = [];

  for (let index = 0; index < queue.length && visited.size < MAX_PAGES; index += 1) {
    const current = queue[index];
    if (visited.has(current)) continue;
    visited.add(current);

    let response;
    try {
      response = await fetchPage(current);
    } catch (error) {
      failures.push({
        url: current,
        status: error?.name === "AbortError" ? "TIMEOUT" : "ERR",
        detail: error instanceof Error ? error.message : String(error),
      });
      continue;
    }

    if (!response.ok) {
      failures.push({
        url: current,
        status: response.status,
        finalUrl: response.url,
      });
      continue;
    }

    const contentType = response.headers.get("content-type") ?? "";
    if (!contentType.includes("text/html")) continue;

    const html = await response.text();
    for (const link of extractLinks(html, response.url, allowedHosts)) {
      if (!visited.has(link) && !queue.includes(link) && queue.length < MAX_PAGES * 4) {
        queue.push(link);
      }
    }
  }

  if (failures.length > 0) {
    console.error("Broken public links found:\n");
    for (const failure of failures) {
      const parts = [failure.url, `status=${failure.status}`];
      if (failure.finalUrl) parts.push(`final=${failure.finalUrl}`);
      if (failure.detail) parts.push(`detail=${failure.detail}`);
      console.error(`- ${parts.join(" | ")}`);
    }
    process.exit(1);
  }

  console.log(
    `Public link audit passed. Checked ${visited.size} pages across ${allowedHosts.size} host(s).`
  );
}

await main();
