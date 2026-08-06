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
  { title: "Slide Decks",                  href: "/decks/",        sub: "Presentations and talks" }, 
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
/* =================================================================
   AUTH  (Supabase) — accounts unlock the personal layer
   Loads the Supabase client, adds a "Log in" control to the header,
   and a small sign-in modal. Content stays public; signing in only
   unlocks favorites / recents / profile. The publishable key below
   is meant to be public — row-level security is what guards data.
   Exposes: window.sb (client), window.sbReady (Promise) for pages.
   ================================================================= */
(() => {
  const SUPABASE_URL = "https://pxustifbonzhldrepcyp.supabase.co";
  const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_XmuebDlA0AtVPpFxQCfaUA_3mR-1S3n";

  // resolves once the client exists AND the first session check is done,
  // so page code can safely `await window.sbReady` before using window.sb
  let _resolveReady;
  window.sbReady = new Promise(r => { _resolveReady = r; });

  /* ---- scoped styles (cauth- prefix => no global class clash) ---- */
  const style = document.createElement("style");
  style.textContent = `
    #cauthWrap{display:inline-flex;align-items:center;gap:.4em}
    .cauth-who{font-size:.82em;opacity:.8;max-width:16ch;overflow:hidden;
      text-overflow:ellipsis;white-space:nowrap}
    .cauth-btn{font:inherit;cursor:pointer;border:1px solid var(--line,#cbd3d3);
      background:transparent;color:inherit;border-radius:999px;padding:.28em .8em;white-space:nowrap}
    .cauth-btn:hover{background:rgba(133,204,204,.18)}
    .cauth-scrim{position:fixed;inset:0;background:rgba(0,0,0,.45);display:none;
      align-items:center;justify-content:center;z-index:1000}
    .cauth-scrim.open{display:flex}
    .cauth-modal{background:var(--bg,#FAF7F0);color:var(--fg,#1a1a1a);border-radius:14px;
      padding:1.4rem;width:min(92vw,340px);box-shadow:0 14px 46px rgba(0,0,0,.32)}
    .cauth-modal h2{margin:.1rem 0 1rem;font-size:1.15rem}
    .cauth-field{display:block;margin:.55rem 0;font-size:.9em}
    .cauth-field input{width:100%;box-sizing:border-box;margin-top:.25em;padding:.6em .7em;
      border:1px solid var(--line,#cbd3d3);border-radius:8px;font:inherit;background:#fff;color:#111}
    .cauth-actions{display:flex;gap:.5rem;margin-top:1rem}
    .cauth-actions button{flex:1;padding:.62em;border-radius:8px;font:inherit;cursor:pointer}
    .cauth-primary{background:var(--accent,#85CCCC);border:none;color:#0a2b2b;font-weight:600}
    .cauth-primary:disabled{opacity:.6;cursor:default}
    .cauth-cancel{background:transparent;border:1px solid var(--line,#cbd3d3);color:inherit}
    .cauth-msg{min-height:1.2em;margin-top:.6rem;font-size:.84em;color:#c0392b}
  `;
  document.head.appendChild(style);

  /* ---- header control, inserted just before the theme button ---- */
  const wrap = document.createElement("span");
  wrap.id = "cauthWrap";
  wrap.innerHTML =
    `<span class="cauth-who" id="cauthWho" hidden></span>` +
    `<button class="cauth-btn" id="cauthBtn" type="button">Log in</button>`;
  const themeBtn = document.getElementById("themeBtn");
  if (themeBtn && themeBtn.parentNode) themeBtn.parentNode.insertBefore(wrap, themeBtn);

  /* ---- sign-in modal ---- */
  const scrim = document.createElement("div");
  scrim.className = "cauth-scrim"; scrim.id = "cauthScrim";
  scrim.innerHTML = `
    <div class="cauth-modal" role="dialog" aria-modal="true" aria-labelledby="cauthTitle">
      <h2 id="cauthTitle">Sign in</h2>
      <label class="cauth-field">Email
        <input id="cauthEmail" type="email" autocomplete="username" autocapitalize="off" spellcheck="false">
      </label>
      <label class="cauth-field">Password
        <input id="cauthPass" type="password" autocomplete="current-password">
      </label>
      <div class="cauth-msg" id="cauthMsg" role="alert"></div>
      <div class="cauth-actions">
        <button class="cauth-cancel" id="cauthCancel" type="button">Cancel</button>
        <button class="cauth-primary" id="cauthSubmit" type="button">Sign in</button>
      </div>
    </div>`;
  document.body.appendChild(scrim);

  const $ = id => document.getElementById(id);
  const openModal  = () => { $("cauthMsg").textContent = ""; scrim.classList.add("open"); $("cauthEmail").focus(); };
  const closeModal = () => scrim.classList.remove("open");
  $("cauthCancel").onclick = closeModal;
  scrim.addEventListener("click", e => { if (e.target === scrim) closeModal(); });
  document.addEventListener("keydown", e => { if (e.key === "Escape") closeModal(); });

  function paint(session) {
    const who = $("cauthWho"), btn = $("cauthBtn");
    if (session && session.user) {
      who.textContent = session.user.email || "signed in";
      who.hidden = false; btn.textContent = "Log out";
    } else {
      who.hidden = true; btn.textContent = "Log in";
    }
  }

  /* ---- load supabase-js, then wire it all up ---- */
  const libEl = document.createElement("script");
  libEl.src = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2";
  libEl.onload = async () => {
    const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
    window.sb = sb;

    const { data: { session } } = await sb.auth.getSession();
    paint(session);
    _resolveReady(sb);
    sb.auth.onAuthStateChange((_evt, s) => paint(s));

    $("cauthBtn").onclick = async () => {
      const { data: { session } } = await sb.auth.getSession();
      if (session) await sb.auth.signOut();   // signed in  -> sign out
      else openModal();                        // signed out -> show form
    };

    async function doLogin() {
      const email = $("cauthEmail").value.trim();
      const pass  = $("cauthPass").value;
      const msg   = $("cauthMsg");
      if (!email || !pass) { msg.textContent = "Enter your email and password."; return; }
      $("cauthSubmit").disabled = true; msg.textContent = "Signing in\u2026";
      const { error } = await sb.auth.signInWithPassword({ email, password: pass });
      $("cauthSubmit").disabled = false;
      if (error) { msg.textContent = error.message || "Sign-in failed."; return; }
      $("cauthPass").value = ""; closeModal();
    }
    $("cauthSubmit").onclick = doLogin;
    $("cauthPass").addEventListener("keydown", e => { if (e.key === "Enter") doLogin(); });
  };
  libEl.onerror = () => { const b = $("cauthBtn"); if (b) { b.title = "Sign-in unavailable (library failed to load)"; } };
  document.head.appendChild(libEl);
})();
