# WAM Lab — wam-lab.com

Static recreation of the **Well-Being, AI, and Measurement Lab** website
(directed by Louis Tay, Purdue University), rebuilt from the original
Squarespace site for hosting on **GitHub Pages**.

## Structure

```
.
├── index.html, research.html, … ema.html   ← built pages (served by GitHub Pages)
├── css/style.css                            ← all styling
├── images/                                  ← logo, headshots, book covers, etc.
├── src/                                     ← page CONTENT fragments (edit these)
├── build.js                                 ← wraps fragments in shared header/footer
├── CNAME                                    ← custom domain (www.wam-lab.com)
└── .nojekyll                                ← tell Pages to serve files as-is
```

## Editing the site

The shared header, footer, and `<head>` live **only** in `build.js`. Each page's
body content lives in `src/<page>.html`. To make a change:

1. Edit the relevant file in `src/` (or `css/style.css`).
2. Rebuild the pages:
   ```
   node build.js
   ```
3. Commit and push. GitHub Pages redeploys automatically.

To preview locally before pushing:
```
npx serve .        # or:  python -m http.server 8000
```

## Keeping the News page updated

News items live in **`news.json`** (newest first) — the single source of truth.
`build.js` renders them into `news.html`. To add one by hand, add a block:

```json
{ "title": "...", "url": "https://...", "source": "Outlet name", "date": "Month YYYY" }
```
then run `node build.js`. (You can edit `news.json` directly on github.com and the
weekly Action will rebuild — or rebuild locally.)

**Automatic updates (with approval):** the workflow `.github/workflows/update-news.yml`
runs weekly, checks a Google Alerts feed, merges new matches into `news.json`,
rebuilds, and opens a **pull request** for review. Nothing publishes until you merge.
One-time setup (after the repo is on GitHub) is documented at the top of that YAML file:
create a Google Alert → RSS feed, save it as the `NEWS_FEED_URL` repo secret, and
allow Actions to open PRs. You can also trigger it any time from the **Actions** tab.

## Keeping the Publications page updated

Publications live in **`publications.json`** (one object per paper). `build.js`
renders the list, the year-filter buttons, and `ScholarlyArticle` structured data
from it. Add a paper by hand:

```json
{ "title": "...", "authors": "...", "year": 2026, "venue": "Journal, vol(issue)", "url": "https://doi.org/...", "doi": "10.xxxx/...", "tags": ["Well-being"] }
```
then `node build.js`.

**Automatic updates (with approval):** `.github/workflows/update-publications.yml`
runs weekly, pulls the latest papers from **Google Scholar (via SerpAPI)** or
**OpenAlex (via ORCID)**, merges new ones into `publications.json`, rebuilds, and
opens a **pull request** for review. Setup is documented at the top of that YAML
file (add a `SERPAPI_KEY` secret for Scholar, or a `PUBS_ORCID` variable for the
free OpenAlex route). Google Scholar has no official API and blocks scraping, so
one of these two sources is required.

## SEO & AI optimization

Built in across every page: unique titles/descriptions, canonical URLs, Open
Graph + Twitter cards, `sitemap.xml`, `robots.txt`, an `llms.txt` site summary
for AI assistants, and JSON-LD structured data (Organization + WebSite on the
home page, Person on People, SoftwareApplication + FAQ on EMA, ItemList of scales
on Resources, and ScholarlyArticle list on Publications). Accessibility: one
`<h1>` and one `<main>` landmark per page, a skip link, `aria-current` nav,
keyboard focus styles, descriptive alt text, and lazy-loaded images.

## Notes

- **Fonts:** `Cairo` (matches the original nav/titles) + `Mulish` (a free
  stand-in for the original Proxima Nova body font), loaded from Google Fonts.
- **Colors:** brand blue `#4aa1e3`, navy `#001b5e`, light band `#eceff4`.
- **Downloadable resources** (PDFs/scales on the *Resources* page) still point to
  the original Squarespace file store (`louis-tay.squarespace.com/s/…`). If the
  Squarespace subscription is cancelled, download those files and place them in a
  local `/s/` folder, then update the links in `src/resources.html`.
- **Publications** shows the 20 most-recent entries (matching the original site's
  default view). Add more by copying an `.entry` block in `src/publications.html`.

## Deploying to GitHub Pages

See the chat instructions, or in short:
1. `gh auth login`
2. `gh repo create wam-lab --public --source=. --remote=origin --push`
3. Enable Pages (Settings → Pages → Deploy from branch `main` / root).
4. Point DNS for `wam-lab.com` at GitHub Pages (see chat for the exact records).
