/* Simple static-site builder for the WAM Lab site.
   Each src/<name>.html holds just the <main> content for a page.
   This script wraps every fragment in the shared <head>, header nav,
   and footer, then writes a complete standalone <name>.html to the repo
   root (which is what GitHub Pages serves).

   Usage:  node build.js
   Edit content in the src/ files, then re-run this command.            */

const fs = require("fs");
const path = require("path");

// page slug -> { title, desc }  (title/desc go into <head>)
const PAGES = {
  index:        { title: "WAM Lab — Well-Being AND Measurement Lab | Purdue University",
                  desc:  "The WAM Lab, directed by Louis Tay at Purdue University, pioneers cross-disciplinary research at the nexus of well-being scholarship, advanced measurement methods, and AI conversational agent design." },
  research:     { title: "Research | WAM Lab", desc: "Research highlights from the Well-Being and Measurement Lab: taxonomies, continuum specification, data science & AI, measurement & methodology, and well-being." },
  join:         { title: "Join the Lab | WAM Lab", desc: "Opportunities for undergraduate and prospective graduate students to join the WAM Lab at Purdue University." },
  people:       { title: "People | WAM Lab", desc: "Meet the director, graduate students, postdocs, staff, and alumni of the WAM Lab at Purdue University." },
  publications: { title: "Publications | WAM Lab", desc: "Peer-reviewed publications from the Well-Being and Measurement Lab." },
  news:         { title: "News | WAM Lab", desc: "Media coverage of research from the Well-Being and Measurement Lab." },
  resources:    { title: "Resources | WAM Lab", desc: "Validated measures, scales, and methodological materials shared by the WAM Lab." },
  writing:      { title: "Writing | WAM Lab", desc: "Articles and essays by Louis Tay on graduate training, publishing, mentoring, well-being, and experience sampling." },
  talks:        { title: "Talks | WAM Lab", desc: "Selected talks and webinars by Louis Tay on assessing well-being, big data, machine learning bias, and experience sampling." },
  books:        { title: "Books | WAM Lab", desc: "Edited handbooks and volumes by Louis Tay on positive psychology, well-being, the positive humanities, big data, and measurement." },
  ema:          { title: "Ecological Momentary Assessment | WAM Lab", desc: "ExpiWell — the experience sampling and ecological momentary assessment platform created by Dr. Louis Tay." },
  "404":        { title: "Page Not Found | WAM Lab", desc: "Page not found." },
};

const NAV = [
  ["research.html", "Research"],
  ["join.html", "Join"],
  ["people.html", "People"],
  ["publications.html", "Publications"],
  ["news.html", "News"],
  ["resources.html", "Resources"],
  ["writing.html", "Writing"],
  ["talks.html", "Talks"],
  ["books.html", "Books"],
  ["ema.html", "EMA"],
];

const headerHTML = `<header class="site-header">
  <div class="wrap nav">
    <a class="brand" href="index.html"><img src="images/wamlab-logo.png" alt="WAM Lab — Well-Being and Measurement Lab"></a>
    <button class="nav-toggle" aria-label="Toggle menu" onclick="document.getElementById('nav').classList.toggle('open')">&#9776;</button>
    <ul class="nav-links" id="nav">
${NAV.map(([href, label]) => `      <li><a href="${href}">${label}</a></li>`).join("\n")}
    </ul>
  </div>
</header>`;

const footerHTML = `<footer class="site-footer">
  <div class="wrap footer-grid">
    <div>
      <h4>Well-Being AND Measurement Lab</h4>
      <p>Director: Louis Tay<br>Department of Psychological Sciences<br>Purdue University<br>703 Third Street<br>West Lafayette, IN 47906-2081 USA</p>
      <p>Campus: Psychological Sciences, Room 2120</p>
    </div>
    <div>
      <h4>Contact</h4>
      <p>Email: <a href="mailto:stay@purdue.edu">stay@purdue.edu</a><br>Phone: (765) 494-0715</p>
      <p><a href="https://www.purdue.edu/hhs/psy/directory/faculty/Tay_Louis.html" target="_blank" rel="noopener">Purdue Faculty Page</a></p>
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
    <span>&copy; 2025 The Well-Being and Measurement Lab</span>
    <span>Purdue University · West Lafayette, IN</span>
  </div>
</footer>`;

const activeScript = `<script>
(function(){var p=(location.pathname.split('/').pop()||'index.html');
document.querySelectorAll('.nav-links a').forEach(function(a){if(a.getAttribute('href')===p)a.classList.add('active');});})();
</script>`;

function page(slug, meta, main) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${meta.title}</title>
<meta name="description" content="${meta.desc.replace(/"/g, "&quot;")}">
<link rel="icon" href="images/social-icon.png">
<meta property="og:title" content="${meta.title}">
<meta property="og:image" content="images/social-icon.png">
<meta name="twitter:card" content="summary">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700&family=Mulish:ital,wght@0,400;0,600;0,700;1,400&display=swap" rel="stylesheet">
<link rel="stylesheet" href="css/style.css">
</head>
<body>
${headerHTML}
${main.trim()}
${footerHTML}
${activeScript}
</body>
</html>
`;
}

const srcDir = path.join(__dirname, "src");
let built = 0;
for (const slug of Object.keys(PAGES)) {
  const fragPath = path.join(srcDir, slug + ".html");
  if (!fs.existsSync(fragPath)) { console.warn("MISSING fragment:", fragPath); continue; }
  const main = fs.readFileSync(fragPath, "utf8");
  fs.writeFileSync(path.join(__dirname, slug + ".html"), page(slug, PAGES[slug], main));
  console.log("built", slug + ".html");
  built++;
}
console.log("Done. " + built + " pages built.");
