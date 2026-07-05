/* =================================================================
   COLLATERA — shared site chrome
   Builds the header, the hamburger nav menu, and the dev banner on
   every page from ONE place. To add a section or rename a nav item,
   edit the SECTIONS list below and every page updates automatically.

   Each page sets its own title before loading this file, e.g.:
       <script>window.COLLATERA_SECTION = "Reference Image Library";</script>
       <script src="/assets/site.js"></script>
   ================================================================= */

/* ---- The four sections. Edit here to change the nav everywhere. ---- */
const SECTIONS = [
  { title: "About",                        href: "/about/",        sub: "The project, in brief" },
  { title: "Reference Image Library",      href: "/ref-images/",   sub: "Clinical reference images" },
  { title: "Guideline Repository",         href: "/guidelines/",   sub: "Society guideline links" },
  { title: "How To Guides",                href: "/how-to/",       sub: "Walkthroughs and how-tos" },
  { title: "Self-Education Resource Hub",  href: "/self-educate/", sub: "Learning resources" },
  { title: "Reportable (demo)",            href: "/reportabledev/",sub: "Project demo — reporting duty lookup", dev: true }
];

/* Disclaimer text shown in the strip under the header */
const DEV_BANNER_TEXT = "Personal website · in development · for internal use";

const SECTION = (window.COLLATERA_SECTION || "").trim();

/* favicon (the logo) for the browser tab */
(() => {
  const fav = document.createElement("link");
  fav.rel = "icon"; fav.type = "image/png"; fav.href = "/assets/favicon.png";
  document.head.appendChild(fav);
})();

/* normalise the current path so we can mark the active nav item */
function currentPath() {
  let p = location.pathname;
  if (!p.endsWith("/")) p = p.replace(/index\.html$/, "");
  if (!p.endsWith("/")) p += "/";
  return p;
}
const HERE = currentPath();

/* ---- build the header ---- */
const header = document.createElement("header");
header.innerHTML = `
  <div class="header-inner">
    <div class="header-top">
      <button class="menu-btn" id="menuBtn" aria-label="Open menu" aria-haspopup="true" aria-expanded="false">&#9776;</button>
      <div class="brand-group">
        <a class="brand" href="/ref-images/"><span class="brand-c">C</span>ollatera</a>
        ${SECTION ? `<span class="section-title">${SECTION}</span>` : ""}
      </div>
      <span class="spacer"></span>
      <button class="theme-btn" id="themeBtn" title="Switch light / dark" aria-label="Switch light or dark mode">&#9680;</button>
      <a class="upload-btn" href="https://collatera.org/4f5bqdxxo937e7/" title="Upload" aria-label="Upload an image">+</a>
      <img class="brandmark" src="/assets/collatera-logo.png" alt="Collatera logo">
    </div>
  </div>`;

/* ---- build the dev banner ---- */
const banner = document.createElement("div");
banner.className = "dev-banner";
banner.textContent = DEV_BANNER_TEXT;

/* ---- build the slide-in nav panel ---- */
const scrim = document.createElement("div");
scrim.className = "nav-scrim";
scrim.id = "navScrim";

const nav = document.createElement("nav");
nav.className = "nav-panel";
nav.id = "navPanel";
nav.setAttribute("aria-label", "Sections");
nav.innerHTML = `
  <div class="nav-head">
    <a class="brand" href="/ref-images/"><span class="brand-c">C</span>ollatera</a>
    <button class="nav-close" id="navClose" aria-label="Close menu">&#10005;</button>
  </div>
  ${SECTIONS.map((s, i) => {
    const active = s.href === HERE ? ' aria-current="page"' : "";
    const divider = s.dev && !SECTIONS[i - 1]?.dev ? '<div class="nav-divider"></div>' : "";
    return `${divider}<a class="nav-link" href="${s.href}"${active}>${s.title}
      <span class="nl-sub">${s.sub}</span></a>`;
  }).join("")}
`;

/* ---- insert everything at the very top of the page, in order ---- */
document.body.insertBefore(banner, document.body.firstChild);
document.body.insertBefore(header, banner);
document.body.appendChild(scrim);
document.body.appendChild(nav);

/* ---- menu open / close ---- */
const menuBtn = document.getElementById("menuBtn");
function openMenu()  { nav.classList.add("open"); scrim.classList.add("open"); menuBtn.setAttribute("aria-expanded","true"); }
function closeMenu() { nav.classList.remove("open"); scrim.classList.remove("open"); menuBtn.setAttribute("aria-expanded","false"); }
menuBtn.onclick = openMenu;
document.getElementById("navClose").onclick = closeMenu;
scrim.onclick = closeMenu;
document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeMenu(); });

/* ---- theme toggle (light <-> dark, remembers choice for the session) ---- */
const root = document.documentElement;
root.setAttribute("data-theme", "auto");
document.getElementById("themeBtn").onclick = () => {
  const cur = root.getAttribute("data-theme");
  root.setAttribute("data-theme", cur === "dark" ? "light" : "dark");
};

/* =================================================================
   VIEW TRACKING  (per-device, stored in this browser only)
   Records how often and how recently each item is opened, so the
   library and guidelines can float your most-used items to the top.
   This data never leaves the device; "Clear" wipes it.
   ================================================================= */
const VIEWS_KEY = "collatera_views_v1";
window.CollateraViews = {
  all() {
    try { return JSON.parse(localStorage.getItem(VIEWS_KEY)) || {}; }
    catch { return {}; }
  },
  record(id) {
    if (!id) return;
    const d = this.all();
    const e = d[id] || { c: 0, t: 0 };
    e.c += 1; e.t = Date.now();
    d[id] = e;
    try { localStorage.setItem(VIEWS_KEY, JSON.stringify(d)); } catch {}
  },
  // blended score: view count plus a recency boost that decays over days
  score(e) {
    if (!e) return 0;
    const days = (Date.now() - e.t) / 86400000;
    return e.c + (1 / (1 + days)) * 2;
  },
  clear() { try { localStorage.removeItem(VIEWS_KEY); } catch {} }
};
