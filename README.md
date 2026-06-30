# WAM Lab — wam-lab.com

Static recreation of the **Well-Being AND Measurement Lab** website
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
