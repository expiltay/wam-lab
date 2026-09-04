/* Simple static-site builder for the WAM Lab site.
   Each src/<name>.html holds just the <main> content for a page.
   This script wraps every fragment in the shared <head>, header nav,
   and footer, then writes a complete standalone <name>.html to the repo
   root (which is what GitHub Pages serves).

   Usage:  node build.js
   Edit content in the src/ files, then re-run this command.            */

const fs = require("fs");
const path = require("path");

const BASE = "https://www.wam-lab.com";   // used for canonical URLs + sitemap
const canonicalFor = (slug) => slug === "index" ? BASE + "/" : BASE + "/" + slug + ".html";

const SOCIAL = {
  linkedin: "https://www.linkedin.com/in/louistay/",
  bluesky:  "https://bsky.app/profile/louistay.bsky.social",
  twitter:  "https://twitter.com/LouisTaySC",
};
const SAME_AS = [
  SOCIAL.linkedin, SOCIAL.bluesky, SOCIAL.twitter,
  "https://scholar.google.com/citations?hl=en&user=5_1xpscAAAAJ",
  "https://www.researchgate.net/profile/Louis_Tay",
  "https://hhs.purdue.edu/directory/louis-tay/",
  "https://louistay.ai",
];
const ICON = {
  linkedin: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.45 20.45h-3.56v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.13 1.45-2.13 2.94v5.67H9.35V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.45v6.29zM5.34 7.43a2.06 2.06 0 1 1 0-4.13 2.06 2.06 0 0 1 0 4.13zM7.12 20.45H3.56V9h3.56v11.45zM22.22 0H1.77C.79 0 0 .77 0 1.72v20.56C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.72V1.72C24 .77 23.2 0 22.22 0z"/></svg>',
  bluesky:  '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5.07 3.16c2.69 2.02 5.58 6.11 6.64 8.31.06.13.11.24.16.34.05-.1.1-.21.16-.34 1.06-2.2 3.95-6.29 6.64-8.31C20.81 1.7 23 .53 23 3.04c0 .5-.29 4.21-.46 4.81-.59 2.09-2.72 2.62-4.62 2.3 3.32.56 4.16 2.43 2.34 4.3-3.46 3.55-4.97-.89-5.36-2.02-.07-.21-.1-.3-.1-.22 0-.08-.03.01-.1.22-.39 1.13-1.9 5.57-5.36 2.02-1.82-1.87-.98-3.74 2.34-4.3-1.9.32-4.03-.21-4.62-2.3C1.29 7.25 1 3.54 1 3.04 1 .53 3.19 1.7 5.07 3.16z"/></svg>',
  twitter:  '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>',
};

// Per-page JSON-LD structured data (helps search engines + AI answer engines).
function structuredData(slug) {
  const blocks = [];
  if (slug === "index") {
    blocks.push({
      "@context": "https://schema.org",
      "@graph": [
        {
          "@type": ["Organization", "ResearchOrganization"],
          "@id": BASE + "/#lab",
          "name": "Well-Being, AI, and Measurement Lab",
          "alternateName": "WAM Lab",
          "url": BASE + "/",
          "logo": BASE + "/images/wamlab-logo.png",
          "description": "An interdisciplinary research lab at Purdue University studying well-being, psychological measurement, data science, and AI conversational agents.",
          "parentOrganization": { "@type": "CollegeOrUniversity", "name": "Purdue University" },
          "founder": { "@type": "Person", "name": "Louis Tay" },
          "sameAs": [SOCIAL.linkedin, SOCIAL.bluesky, SOCIAL.twitter]
        },
        { "@type": "WebSite", "@id": BASE + "/#website", "url": BASE + "/", "name": "WAM Lab", "publisher": { "@id": BASE + "/#lab" } }
      ]
    });
  } else if (slug === "people") {
    blocks.push({
      "@context": "https://schema.org",
      "@type": "Person",
      "name": "Louis Tay",
      "jobTitle": "William C. Byham Professor of Industrial-Organizational Psychology",
      "affiliation": { "@type": "CollegeOrUniversity", "name": "Purdue University" },
      "worksFor": { "@type": "Organization", "name": "Well-Being, AI, and Measurement Lab" },
      "image": BASE + "/images/louis-tay.webp",
      "url": "https://louistay.ai",
      "sameAs": SAME_AS
    });
  } else if (slug === "publications") {
    const pubs = readPublications();
    blocks.push({
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      "name": "Publications — WAM Lab",
      "url": canonicalFor("publications"),
      "about": { "@type": "Person", "name": "Louis Tay" },
      "isPartOf": { "@type": "WebSite", "name": "WAM Lab", "url": BASE + "/" }
    });
    blocks.push({
      "@context": "https://schema.org",
      "@type": "ItemList",
      "name": "Publications by the WAM Lab",
      "itemListElement": pubs.map((p, i) => ({
        "@type": "ListItem",
        "position": i + 1,
        "item": Object.assign(
          { "@type": "ScholarlyArticle", "name": p.title, "datePublished": String(p.year || "") },
          p.venue ? { "isPartOf": { "@type": "Periodical", "name": p.venue.replace(/,?\s*\d+(\(\d+\))?.*$/, "").trim() || p.venue } } : {},
          p.url ? { "url": p.url } : {},
          p.doi ? { "sameAs": "https://doi.org/" + p.doi } : {},
          (p.tags && p.tags.length) ? { "keywords": p.tags.join(", ") } : {},
          { "author": { "@type": "Person", "name": "Louis Tay" } }
        )
      }))
    });
  }
  return blocks.map(b => `<script type="application/ld+json">\n${JSON.stringify(b, null, 2)}\n</script>`).join("\n");
}

// page slug -> { title, desc }  (title/desc go into <head>)
const PAGES = {
  index:        { title: "WAM Lab — Well-Being, AI, and Measurement Lab | Purdue University",
                  desc:  "The WAM Lab, directed by Louis Tay at Purdue University, pioneers cross-disciplinary research at the nexus of well-being scholarship, advanced measurement methods, and AI conversational agent design." },
  research:     { title: "Research | WAM Lab", desc: "Research highlights from the Well-Being, AI, and Measurement Lab: taxonomies, continuum specification, data science & AI, measurement & methodology, and well-being." },
  people:       { title: "People | WAM Lab", desc: "Meet the director, graduate students, postdocs, staff, and alumni of the WAM Lab at Purdue University." },
  publications: { title: "Publications | WAM Lab", desc: "Peer-reviewed publications from the Well-Being, AI, and Measurement Lab." },
  news:         { title: "News | WAM Lab", desc: "Media coverage of research from the Well-Being, AI, and Measurement Lab." },
  resources:    { title: "Scales & Measures (SETPOINT, CABIN, CAPTION, CIT/BIT, HELPS, RAISE) | WAM Lab", desc: "Free, validated psychological scales from Louis Tay's lab at Purdue: SETPOINT & CABIN vocational interests, CAPTION situation taxonomy, Comprehensive & Brief Inventory of Thriving (CIT/BIT), HELPS help-seeking beliefs, RAISE arts-engagement, ALI, Subjective Underemployment Scale, plus IRT measurement-equivalence tools. Each lists its dimensions and a downloadable instrument." },
  writing:      { title: "Writing | WAM Lab", desc: "Articles and essays by Louis Tay on graduate training, publishing, mentoring, well-being, and experience sampling." },
  talks:        { title: "Talks | WAM Lab", desc: "Selected talks and webinars by Louis Tay on assessing well-being, big data, machine learning bias, and experience sampling." },
  books:        { title: "Books | WAM Lab", desc: "Edited handbooks and volumes by Louis Tay on positive psychology, well-being, the positive humanities, big data, and measurement." },
  ema:          { title: "ExpiWell — Experience Sampling (ESM) & Ecological Momentary Assessment (EMA) Platform | WAM Lab", desc: "ExpiWell is a leading experience sampling method (ESM) and ecological momentary assessment (EMA) platform, co-founded by Dr. Louis Tay and Justin Rahimi. Run adaptive mobile diary studies with smart scheduling, notifications, wearable & sensor integration, geofencing, real-time analytics, and participant payments — used by 7,000+ researchers across 1,000+ institutions in 20+ countries." },
  "404":        { title: "Page Not Found | WAM Lab", desc: "Page not found." },
};

const NAV = [
  ["research.html", "Research"],
  ["people.html", "People"],
  ["publications.html", "Publications"],
  ["resources.html", "Resources"],
  ["talks.html", "Talks"],
  ["books.html", "Books"],
  ["ema.html", "EMA"],
];

const headerHTML = `<header class="site-header">
  <div class="wrap nav">
    <a class="brand" href="index.html"><img src="images/wamlab-logo.png" width="280" height="58" alt="WAM Lab — Well-Being, AI, and Measurement Lab"></a>
    <button class="nav-toggle" aria-label="Toggle menu" aria-expanded="false" onclick="var n=document.getElementById('nav');this.setAttribute('aria-expanded',n.classList.toggle('open'))"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 6h18M3 12h18M3 18h18" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none"/></svg></button>
    <ul class="nav-links" id="nav">
${NAV.map(([href, label]) => `      <li><a href="${href}">${label}</a></li>`).join("\n")}
    </ul>
  </div>
</header>`;

const footerHTML = `<footer class="site-footer">
  <div class="wrap footer-grid">
    <div>
      <h4>Well-Being, AI, and Measurement Lab</h4>
      <p>Director: Louis Tay<br>Department of Psychological Sciences<br>Purdue University<br>703 Third Street<br>West Lafayette, IN 47906-2081 USA</p>
      <p>Campus: Psychological Sciences, Room 2120</p>
    </div>
    <div>
      <h4>Contact</h4>
      <p>Email: <a href="mailto:stay@purdue.edu">stay@purdue.edu</a><br>Phone: (765) 494-0715</p>
      <p><a href="https://hhs.purdue.edu/directory/louis-tay/" target="_blank" rel="noopener">Purdue Faculty Page</a> &middot; <a href="https://louistay.ai" target="_blank" rel="noopener">louistay.ai</a></p>
      <p class="footer-social">
        <a href="${SOCIAL.linkedin}" target="_blank" rel="noopener" aria-label="LinkedIn">${ICON.linkedin}</a>
        <a href="${SOCIAL.bluesky}" target="_blank" rel="noopener" aria-label="Bluesky">${ICON.bluesky}</a>
        <a href="${SOCIAL.twitter}" target="_blank" rel="noopener" aria-label="X (Twitter)">${ICON.twitter}</a>
      </p>
    </div>
    <div class="footer-nav">
      <h4>Explore</h4>
      <ul>
        <li><a href="index.html">Home</a></li>
${NAV.map(([href, label]) => `        <li><a href="${href}">${label}</a></li>`).join("\n")}
      </ul>
    </div>
  </div>
  <div class="wrap footer-bottom">
    <span>&copy; 2025 The Well-Being, AI, and Measurement Lab</span>
    <span>Purdue University · West Lafayette, IN</span>
  </div>
</footer>`;

const activeScript = `<script>
(function(){var p=(location.pathname.split('/').pop()||'index.html');
document.querySelectorAll('.nav-links a').forEach(function(a){if(a.getAttribute('href')===p){a.classList.add('active');a.setAttribute('aria-current','page');}});})();
</script>`;

function page(slug, meta, main) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${meta.title}</title>
<meta name="description" content="${meta.desc.replace(/"/g, "&quot;")}">
<meta name="author" content="Louis Tay">
<meta name="robots" content="index, follow, max-image-preview:large">
<meta name="theme-color" content="#10243f">
<link rel="canonical" href="${canonicalFor(slug)}">
<link rel="icon" href="images/social-icon.png">
<link rel="apple-touch-icon" href="images/social-icon.png">
<meta property="og:type" content="website">
<meta property="og:site_name" content="WAM Lab — Well-Being, AI, and Measurement Lab">
<meta property="og:title" content="${meta.title}">
<meta property="og:description" content="${meta.desc.replace(/"/g, "&quot;")}">
<meta property="og:url" content="${canonicalFor(slug)}">
<meta property="og:image" content="${BASE}/images/social-icon.png">
<meta name="twitter:card" content="summary">
<meta name="twitter:title" content="${meta.title}">
<meta name="twitter:description" content="${meta.desc.replace(/"/g, "&quot;")}">
<meta name="twitter:image" content="${BASE}/images/social-icon.png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700&family=Mulish:ital,wght@0,400;0,600;0,700;1,400&display=swap" rel="stylesheet">
<link rel="stylesheet" href="css/style.css">
${structuredData(slug)}
</head>
<body>
<a class="skip-link" href="#main">Skip to content</a>
${headerHTML}
<main id="main">
${main.trim()}
</main>
${footerHTML}
${activeScript}
</body>
</html>
`;
}

function esc(s) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

// Render the News page entries from news.json (single source of truth).
function renderNews() {
  const file = path.join(__dirname, "news.json");
  if (!fs.existsSync(file)) return "";
  let items;
  try { items = JSON.parse(fs.readFileSync(file, "utf8")); }
  catch (e) { console.warn("news.json parse error:", e.message); return ""; }
  return items.map(function (it) {
    return `      <div class="entry"><h3><a href="${esc(it.url)}" target="_blank" rel="noopener">${esc(it.title)}</a></h3>` +
           `<p class="cite"><span class="src">${esc(it.source)}</span> &middot; ${esc(it.date)}</p></div>`;
  }).join("\n\n");
}

function readPublications() {
  const file = path.join(__dirname, "publications.json");
  if (!fs.existsSync(file)) return [];
  let arr;
  try { arr = JSON.parse(fs.readFileSync(file, "utf8")); }
  catch (e) { console.warn("publications.json parse error:", e.message); return []; }
  // newest year first; preserve array order within a year
  return arr.map((p, i) => ({ ...p, _i: i }))
    .sort((a, b) => (b.year || 0) - (a.year || 0) || a._i - b._i);
}

function renderPublications() {
  return readPublications().map(function (p) {
    const y = p.year || "";
    const titleHtml = p.url
      ? `<a href="${esc(p.url)}" target="_blank" rel="noopener">${esc(p.title)}</a>`
      : esc(p.title);
    const cite = `${esc(p.authors || "")} (${y}). <em>${esc(p.venue || "")}.</em>`;
    const tagText = (p.tags || []).map(t => " &middot; " + esc(t)).join("");
    const tagAttr = (p.tags || []).map(esc).join("|");
    return `      <div class="entry" data-year="${y}" data-tags="${tagAttr}">\n` +
           `        <h3>${titleHtml}</h3>\n` +
           `        <p class="cite">${cite}</p>\n` +
           `        <p class="tags"><span class="yr">${y}</span>${tagText}</p>\n` +
           `      </div>`;
  }).join("\n\n");
}

function renderRecentPublications(n) {
  return readPublications().slice(0, n || 3).map(function (p) {
    const titleHtml = p.url
      ? `<a href="${esc(p.url)}" target="_blank" rel="noopener">${esc(p.title)}</a>`
      : esc(p.title);
    const cite = `${esc(p.authors || "")} (${p.year || ""}). <em>${esc(p.venue || "")}.</em>`;
    const meta = p.doi ? `${p.year} &middot; DOI: ${esc(p.doi)}` : `${p.year || ""}`;
    return `      <article class="card"><div class="body">\n` +
           `        <h3>${titleHtml}</h3>\n` +
           `        <p class="cite">${cite}</p>\n` +
           `        <p class="meta">${meta}</p>\n` +
           `      </div></article>`;
  }).join("\n");
}

function renderPubYearFilter() {
  const years = [...new Set(readPublications().map(p => p.year).filter(Boolean))].sort((a, b) => b - a);
  return [`          <button data-val="all" class="active">All</button>`]
    .concat(years.map(y => `          <button data-val="${y}">${y}</button>`)).join("\n");
}
function renderPubTopicFilter() {
  const topics = [...new Set(readPublications().flatMap(p => p.tags || []))].sort();
  return [`          <button data-val="all" class="active">All</button>`]
    .concat(topics.map(t => `          <button data-val="${esc(t)}">${esc(t)}</button>`)).join("\n");
}

const srcDir = path.join(__dirname, "src");
let built = 0;
for (const slug of Object.keys(PAGES)) {
  const fragPath = path.join(srcDir, slug + ".html");
  if (!fs.existsSync(fragPath)) { console.warn("MISSING fragment:", fragPath); continue; }
  let main = fs.readFileSync(fragPath, "utf8");
  if (main.includes("<!--NEWS_ITEMS-->")) main = main.replace("<!--NEWS_ITEMS-->", renderNews());
  if (main.includes("<!--PUBLICATION_ITEMS-->")) main = main.replace("<!--PUBLICATION_ITEMS-->", renderPublications());
  if (main.includes("<!--PUB_YEAR_FILTER-->")) main = main.replace("<!--PUB_YEAR_FILTER-->", renderPubYearFilter());
  if (main.includes("<!--PUB_TOPIC_FILTER-->")) main = main.replace("<!--PUB_TOPIC_FILTER-->", renderPubTopicFilter());
  if (main.includes("<!--RECENT_PUBLICATIONS-->")) main = main.replace("<!--RECENT_PUBLICATIONS-->", renderRecentPublications(3));
  // Lazy-load images that don't already declare a loading strategy (perf / Core Web Vitals).
  main = main.replace(/<img (?![^>]*\bloading=)/gi, '<img loading="lazy" decoding="async" ');
  fs.writeFileSync(path.join(__dirname, slug + ".html"), page(slug, PAGES[slug], main));
  console.log("built", slug + ".html");
  built++;
}
console.log("Done. " + built + " pages built.");

// ---- sitemap.xml (skip the 404 page) ----
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${Object.keys(PAGES).filter(s => s !== "404").map(s =>
  `  <url><loc>${canonicalFor(s)}</loc></url>`).join("\n")}
</urlset>
`;
fs.writeFileSync(path.join(__dirname, "sitemap.xml"), sitemap);
console.log("wrote sitemap.xml");
