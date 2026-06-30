/* fetch-news.js — pull new media coverage from a Google Alerts RSS/Atom feed
   and merge it into news.json (newest first), de-duplicated by URL.

   Used by .github/workflows/update-news.yml. The workflow then runs build.js
   and opens a pull request, so a human approves before anything goes live.

   Config (environment variables):
     NEWS_FEED_URL   (required)  the Google Alerts feed URL  -> repo secret
     NEWS_KEYWORDS   (optional)  comma-separated allow-list; an item is kept only
                                 if its title/url contains one of these. Default
                                 list below. Set to "*" to disable filtering.
     NEWS_MAX        (optional)  max new items to add per run (default 25)

   Runs on Node 20+ (uses global fetch). Zero dependencies.                  */

const fs = require("fs");
const path = require("path");

const FEED = process.env.NEWS_FEED_URL && process.env.NEWS_FEED_URL.trim();
const MAX = parseInt(process.env.NEWS_MAX || "25", 10);
const DEFAULT_KEYWORDS = [
  "tay", "well-being", "wellbeing", "happiness", "flourish", "purdue",
  "measurement", "expiwell", "character strength", "life satisfaction",
  "subjective well-being", "vocational interest"
];
const KW_RAW = (process.env.NEWS_KEYWORDS || "").trim();
const KEYWORDS = KW_RAW === "*" ? null
  : (KW_RAW ? KW_RAW.split(",").map(s => s.trim().toLowerCase()).filter(Boolean) : DEFAULT_KEYWORDS);

const newsPath = path.join(__dirname, "..", "news.json");

function decodeEntities(s) {
  return String(s)
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"').replace(/&#0?39;|&apos;/g, "'")
    .replace(/&#x27;/gi, "'").replace(/&nbsp;/g, " ")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(parseInt(n, 10)))
    .replace(/&amp;/g, "&");
}
function stripTags(s) { return String(s).replace(/<[^>]+>/g, ""); }
function clean(s) { return decodeEntities(stripTags(decodeEntities(s))).replace(/\s+/g, " ").trim(); }

// Normalize a URL for dedupe: drop protocol, www, query, trailing slash, lowercase.
function normUrl(u) {
  try {
    const x = new URL(u);
    return (x.host.replace(/^www\./, "") + x.pathname.replace(/\/+$/, "")).toLowerCase();
  } catch { return String(u).toLowerCase().replace(/\/+$/, ""); }
}
function realUrl(href) {
  const h = decodeEntities(href);
  const m = h.match(/[?&]url=([^&]+)/);
  return m ? decodeURIComponent(m[1]) : h;
}
function sourceFromUrl(u) {
  try { return new URL(u).host.replace(/^www\./, ""); } catch { return ""; }
}
function monthYear(iso) {
  const d = new Date(iso);
  if (isNaN(d)) return "";
  return d.toLocaleString("en-US", { month: "long", year: "numeric", timeZone: "UTC" });
}
function matchesKeywords(title, url) {
  if (!KEYWORDS) return true;
  const hay = (title + " " + url).toLowerCase();
  return KEYWORDS.some(k => hay.includes(k));
}

function parseFeed(xml) {
  const out = [];
  // Atom <entry> (Google Alerts) ...
  const blocks = xml.match(/<entry[\s\S]*?<\/entry>/g) || [];
  for (const b of blocks) {
    const title = clean((b.match(/<title[^>]*>([\s\S]*?)<\/title>/) || [])[1] || "");
    const hrefM = b.match(/<link[^>]*href="([^"]+)"/);
    const pub = (b.match(/<published>([\s\S]*?)<\/published>/) || b.match(/<updated>([\s\S]*?)<\/updated>/) || [])[1] || "";
    if (!title || !hrefM) continue;
    const url = realUrl(hrefM[1]);
    out.push({ title, url, source: sourceFromUrl(url), date: monthYear(pub) || "" });
  }
  // RSS <item> fallback (in case a classic RSS feed is used) ...
  if (!out.length) {
    const items = xml.match(/<item[\s\S]*?<\/item>/g) || [];
    for (const b of items) {
      const title = clean((b.match(/<title>([\s\S]*?)<\/title>/) || [])[1] || "");
      const link = clean((b.match(/<link>([\s\S]*?)<\/link>/) || [])[1] || "");
      const pub = (b.match(/<pubDate>([\s\S]*?)<\/pubDate>/) || [])[1] || "";
      if (!title || !link) continue;
      const url = realUrl(link);
      out.push({ title, url, source: sourceFromUrl(url), date: monthYear(pub) || "" });
    }
  }
  return out;
}

async function main() {
  if (!FEED) { console.log("No NEWS_FEED_URL set — nothing to do. (Add it as a repo secret to enable.)"); return; }
  const existing = JSON.parse(fs.readFileSync(newsPath, "utf8"));
  const seen = new Set(existing.map(it => normUrl(it.url)));

  const res = await fetch(FEED, { headers: { "User-Agent": "wam-lab-news-bot" } });
  if (!res.ok) { console.error("Feed fetch failed:", res.status); process.exit(1); }
  const xml = await res.text();

  const parsed = parseFeed(xml);
  const fresh = [];
  for (const it of parsed) {
    const key = normUrl(it.url);
    if (seen.has(key)) continue;
    if (!matchesKeywords(it.title, it.url)) { console.log("skip (no keyword):", it.title); continue; }
    seen.add(key);
    fresh.push(it);
    if (fresh.length >= MAX) break;
  }

  if (!fresh.length) { console.log("No new items found."); return; }
  const updated = fresh.concat(existing);            // newest first
  fs.writeFileSync(newsPath, JSON.stringify(updated, null, 2) + "\n");
  console.log("Added " + fresh.length + " item(s):");
  fresh.forEach(it => console.log("  + " + it.title + "  [" + it.source + "]"));
}

main().catch(e => { console.error(e); process.exit(1); });
