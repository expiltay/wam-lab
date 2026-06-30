/* fetch-publications.js — pull the latest papers for Louis Tay and merge any new
   ones into publications.json (de-duplicated by DOI/title). Used by
   .github/workflows/update-publications.yml, which then runs build.js and opens
   a pull request for review — so a human approves before anything is published.

   Google Scholar has no official API and blocks scraping, so this supports two
   reliable sources (auto-selected):

     1. SerpAPI Google Scholar Author API  (reads your exact Scholar profile)
        - Set repo secret  SERPAPI_KEY     (https://serpapi.com — free tier is
          plenty for a weekly check)
        - Optional var     PUBS_SCHOLAR_ID (defaults to your profile below)

     2. OpenAlex by ORCID  (free, no API key)
        - Set repo variable PUBS_ORCID = 0000-0000-0000-0000

   If neither is configured, the script no-ops cleanly.

   Runs on Node 20+ (global fetch). Zero dependencies.                        */

const fs = require("fs");
const path = require("path");

const SERPAPI_KEY = (process.env.SERPAPI_KEY || "").trim();
const SCHOLAR_ID = (process.env.PUBS_SCHOLAR_ID || "5_1xpscAAAAJ").trim();
const ORCID = (process.env.PUBS_ORCID || "").trim();
const MAX = parseInt(process.env.PUBS_MAX || "50", 10);

const pubsPath = path.join(__dirname, "..", "publications.json");

const normTitle = (t) => String(t || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
const normDoi = (d) => String(d || "").toLowerCase().replace(/^https?:\/\/(dx\.)?doi\.org\//, "").replace(/\/+$/, "");

async function fromSerpApi() {
  const url = "https://serpapi.com/search.json?engine=google_scholar_author"
    + "&author_id=" + encodeURIComponent(SCHOLAR_ID)
    + "&sort=pubdate&num=100&api_key=" + encodeURIComponent(SERPAPI_KEY);
  const res = await fetch(url);
  if (!res.ok) throw new Error("SerpAPI request failed: " + res.status);
  const data = await res.json();
  const arts = data.articles || [];
  return arts.map(a => ({
    title: (a.title || "").trim(),
    authors: (a.authors || "").trim(),
    year: parseInt(a.year, 10) || "",
    venue: (a.publication || "").trim(),
    url: a.link || "",
    doi: "",
    tags: []
  })).filter(p => p.title);
}

async function fromOpenAlex() {
  const url = "https://api.openalex.org/works?filter=author.orcid:" + encodeURIComponent(ORCID)
    + "&sort=publication_date:desc&per-page=" + Math.min(MAX, 200) + "&mailto=stay@purdue.edu";
  const res = await fetch(url, { headers: { "User-Agent": "wam-lab-pubs-bot (mailto:stay@purdue.edu)" } });
  if (!res.ok) throw new Error("OpenAlex request failed: " + res.status);
  const data = await res.json();
  return (data.results || []).map(w => {
    const doi = normDoi(w.doi || (w.ids && w.ids.doi) || "");
    const src = (w.primary_location && w.primary_location.source && w.primary_location.source.display_name)
      || (w.host_venue && w.host_venue.display_name) || "";
    const authors = (w.authorships || []).map(a => a.author && a.author.display_name).filter(Boolean).join(", ");
    return {
      title: (w.title || w.display_name || "").trim(),
      authors,
      year: w.publication_year || "",
      venue: src,
      url: doi ? "https://doi.org/" + doi : ((w.primary_location && w.primary_location.landing_page_url) || ""),
      doi,
      tags: []
    };
  }).filter(p => p.title);
}

async function main() {
  let source, fetched;
  if (SERPAPI_KEY) { source = "SerpAPI (Google Scholar)"; fetched = await fromSerpApi(); }
  else if (ORCID) { source = "OpenAlex (ORCID " + ORCID + ")"; fetched = await fromOpenAlex(); }
  else { console.log("No source configured (set SERPAPI_KEY or PUBS_ORCID) — nothing to do."); return; }

  const existing = JSON.parse(fs.readFileSync(pubsPath, "utf8"));
  const seenTitles = new Set(existing.map(p => normTitle(p.title)));
  const seenDois = new Set(existing.map(p => normDoi(p.doi)).filter(Boolean));

  const fresh = [];
  for (const p of fetched) {
    const nt = normTitle(p.title);
    const nd = normDoi(p.doi);
    if (seenTitles.has(nt) || (nd && seenDois.has(nd))) continue;
    seenTitles.add(nt); if (nd) seenDois.add(nd);
    fresh.push(p);
    if (fresh.length >= MAX) break;
  }

  if (!fresh.length) { console.log("Up to date — no new publications from " + source + "."); return; }
  const updated = fresh.concat(existing);   // build.js sorts by year for display
  fs.writeFileSync(pubsPath, JSON.stringify(updated, null, 2) + "\n");
  console.log("Source: " + source);
  console.log("Added " + fresh.length + " new publication(s):");
  fresh.forEach(p => console.log("  + (" + (p.year || "n.d.") + ") " + p.title));
}

main().catch(e => { console.error(e); process.exit(1); });
