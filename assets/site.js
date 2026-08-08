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
const DEV_BANNER_TEXT = "";

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
      <button class="menu-btn is-brand" id="menuBtn" aria-label="Open menu" aria-haspopup="true" aria-expanded="false"><img class="menu-logo" src="/assets/collatera-logo-v2.png" alt=""><span class="brand"><span class="brand-c">C</span>ollatera</span><span class="menu-chev" aria-hidden="true">&#8964;</span></button>
      <div class="brand-group">
        ${SECTION ? `<span class="section-title">${SECTION}</span>` : ""}
      </div>
      <span class="spacer"></span>
      <button class="theme-btn" id="themeBtn" title="Switch light / dark" aria-label="Switch light or dark mode">&#9680;</button>
      <span class="cauth-slot" id="cauthSlot" aria-hidden="true"></span>
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
if (DEV_BANNER_TEXT) {
  document.body.insertBefore(banner, document.body.firstChild);
  document.body.insertBefore(header, banner);
} else {
  document.body.insertBefore(header, document.body.firstChild);
}
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
const THEME_KEY = "collatera_theme";
let savedTheme = null;
try { savedTheme = localStorage.getItem(THEME_KEY); } catch {}
root.setAttribute("data-theme", savedTheme || "auto");
document.getElementById("themeBtn").onclick = () => {
  const cur = root.getAttribute("data-theme");
  const next = cur === "dark" ? "light" : "dark";
  root.setAttribute("data-theme", next);
  try { localStorage.setItem(THEME_KEY, next); } catch {}
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
   ACCOUNT  (Supabase) — sign-in + profile dropdown
   The logo in the header is the account button. Signed out it offers
   Sign in; signed in it opens a panel with the editable profile
   (position / title / bio), change password, clear recent history,
   and sign out. The upload link is shown to the admin account only.
   Content stays public; signing in unlocks the personal layer.
   The publishable key is meant to be public — RLS guards the data.
   Exposes: window.sb, window.sbReady, window.collateraUser
   ================================================================= */
(() => {
  const SUPABASE_URL = "https://pxustifbonzhldrepcyp.supabase.co";
  const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_XmuebDlA0AtVPpFxQCfaUA_3mR-1S3n";
  const ADMIN_EMAIL   = "jdmca90@gmail.com";
  const UPLOAD_URL    = "https://collatera.org/4f5bqdxxo937e7/";
  const POSITIONS     = ["Fellow","Resident","Medical Student","Cardiologist","Hospitalist","Attending"];
  const BIO_MAX = 300, TITLE_MAX = 40;

  let _resolveReady;
  window.sbReady = new Promise(r => { _resolveReady = r; });
  window.collateraUser = null;

  /* ---- scoped styles (cauth- prefix; no global class clash) ---- */
  const style = document.createElement("style");
  style.textContent = `
    .menu-btn.is-brand{display:inline-flex;align-items:center;gap:.42em;
      width:auto;height:auto;padding:.2em .6em .2em .2em;background:transparent;
      border-color:transparent;border-radius:999px}
    .menu-btn.is-brand:hover{background:var(--accent-tint);border-color:transparent}
    .menu-btn.is-brand .brand{font-size:1.95em;line-height:1;color:var(--brand);
      font-variant-caps:small-caps;letter-spacing:.005em;font-weight:600}
    .menu-chev{font-size:.72em;opacity:.55;margin-left:-.1em}
    .menu-logo{width:2.6em;height:2.6em;border-radius:50%;display:block;flex:none;
      border:var(--logo-ring-w,2.5px) solid var(--logo-ring,#A8455C);box-sizing:border-box}
    .cauth-slot{display:inline-block;width:11.5em;height:2.4em;vertical-align:middle}
    .cauth-cluster{position:fixed;top:.55rem;z-index:4000;
      right:max(.9rem,calc((100vw - 1180px) / 2 + 20px));
      display:flex;align-items:flex-start;gap:.55rem}
    .cauth-cluster .theme-btn{flex:none;margin-top:.15rem}
    .cauth-box{position:relative;width:max-content;max-width:min(88vw,340px);
      background:var(--acct,#1B5E85);
      border:2px solid var(--acct-edge2,#FAD8E9);border-radius:14px;
      box-shadow:0 0 0 1.5px var(--acct-open,#0F3A54),0 2px 8px rgba(0,0,0,.22);
      overflow:hidden;text-align:left;
      transition:border-radius .18s ease,border-width .2s ease,background .18s ease,
                 width .22s cubic-bezier(.22,.61,.36,1)}
    .cauth-box.open{background:var(--acct-open,#0F3A54);
      border-width:7px;border-color:var(--acct-edge,#FAD8E9);border-radius:18px;
      width:min(88vw,340px);
      box-shadow:0 0 0 1.5px var(--acct-open,#0F3A54),0 18px 50px rgba(0,0,0,.42)}
    .cauth-x{display:none;position:absolute;top:.15rem;right:.35rem;z-index:2;
      background:none;border:none;color:#fff;font:inherit;font-weight:700;
      font-size:2.4rem;line-height:.8;cursor:pointer;padding:.05em .2em;
      border-radius:10px}
    .cauth-x:hover{background:var(--acct-hover,rgba(255,255,255,.14))}
    .cauth-box.open .cauth-x{display:block}
    .cauth-box{border-radius:16px}
    .cauth-box.open .cauth-pill{border-radius:11px 11px 0 0}
    .cauth-box.open .cauth-panel{border-radius:0 0 11px 11px}
    .cauth-pill{display:flex;flex-direction:column;align-items:center;justify-content:center;
      gap:.05em;width:auto;box-sizing:border-box;padding:.42em .85em;cursor:pointer;
      background:none;border:none;color:var(--acct-ink,#fff);font:inherit;line-height:1.2}
    .cauth-box.open .cauth-pill{width:100%;padding:1.25em 1.9em .55em;cursor:default;pointer-events:none}
    .cauth-pill:focus-visible{outline:2px solid var(--acct-edge,#FAD8E9);outline-offset:-4px}
    .cauth-pill-lead{display:none}
    .cauth-box.open .cauth-pill-lead,
    .cauth-box.is-out .cauth-pill-lead{display:inline;font-style:normal;
      font-weight:700;font-size:.95em}
    .cauth-box.is-out.open .cauth-pill-lead{font-size:1.1em;color:var(--acct-user,#F49E9E)}
    .cauth-pill-email{font-size:.9em;font-weight:700;letter-spacing:-.005em;
      font-family:"Avenir Next Condensed","Roboto Condensed","Hanken Grotesk",system-ui,sans-serif;
      max-width:14em;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
    .cauth-box.open .cauth-pill-email{max-width:none;font-size:1.18em;
      white-space:normal;overflow-wrap:anywhere}

    .cauth-panel{display:block;color:var(--acct-ink,#fff);text-align:left;
      width:0;padding:0;max-height:0;opacity:0;overflow:hidden;pointer-events:none;
      transition:max-height .26s cubic-bezier(.22,.61,.36,1),opacity .18s ease,padding .26s ease}
    .cauth-panel.open{width:auto;max-height:70vh;opacity:1;pointer-events:auto;
      overflow-y:auto;padding:.2rem 1.1rem 1.2rem}
    .cauth-email{font-size:.86em;color:var(--muted,#6B6860);word-break:break-all;margin-bottom:.8rem}
    .cauth-avatarwrap{display:flex;justify-content:center;margin:.2rem 0 1.1rem}
    .cauth-avatar{width:66px;height:66px;border-radius:50%;
      border:3px solid var(--acct-edge,#FAD8E9);background:rgba(255,255,255,.10);
      background-size:cover;background-position:center;
      display:flex;align-items:center;justify-content:center;
      font-size:3.1rem;line-height:1;color:var(--acct-edge,#FAD8E9);overflow:hidden}
    .cauth-avatar::after{content:"\\1F464";opacity:.5;transform:translateY(.08em) scale(1.15)}
    .cauth-avatar.has-img::after{content:""}
    .cauth-row[hidden]{display:none}
    .cauth-row{display:grid;grid-template-columns:4.4em 1fr;align-items:baseline;
      column-gap:.5em;margin:.45rem 0}
    .cauth-row-bio{align-items:start}
    .cauth-row-bio .cauth-inlbl{padding-top:.1em}
    .cauth-inlbl{font-size:.95em;color:var(--acct-lbl,#F0B8D4);text-align:right;
      letter-spacing:.01em;line-height:1.35}
    .cauth-panel input,.cauth-panel textarea{width:100%;min-width:0;box-sizing:border-box;
      background:var(--acct-field,rgba(255,255,255,.13));
      border:1px solid var(--acct-line,rgba(255,255,255,.32));
      color:var(--acct-val,#8ECBF2);border-radius:8px;padding:.34em .5em;
      font:inherit;font-size:1.02em}
    .cauth-panel #cauthPos{font-weight:700}
    .cauth-panel textarea{resize:vertical;min-height:1.4em;line-height:1.35}
    .cauth-panel input::placeholder,.cauth-panel textarea::placeholder{
      color:var(--acct-mute,rgba(255,255,255,.5));font-weight:400}
    .cauth-panel input[readonly],.cauth-panel textarea[readonly]{background:transparent;
      border-color:transparent;padding:0;cursor:default;resize:none;height:auto;min-height:0}
    .cauth-edit{display:none}
    .cauth-lbl{display:block;font-size:.78em;color:var(--muted,#6B6860);margin:.6rem 0 .2rem}
    .cauth-panel select,.cauth-panel input,.cauth-panel textarea{width:100%;box-sizing:border-box;
      padding:.5em .6em;border:1px solid var(--border,#D8D4CC);border-radius:8px;font:inherit;
      background:var(--surface,#F0EDE6);color:var(--ink,#2E2C2A)}
    .cauth-panel textarea{resize:vertical;min-height:4.2em}
    .cauth-count{font-size:.72em;color:rgba(255,255,255,.7);text-align:right;margin-top:.15rem}
    .cauth-save{margin-top:.7rem;width:100%;padding:.55em;border:none;border-radius:8px;
      background:var(--acct-lbl,#F0B8D4);color:var(--acct-open,#0F3A54);font:inherit;font-weight:700;cursor:pointer}
    .cauth-save:disabled{opacity:.6;cursor:default}
    .cauth-rule{border:none;height:1px;margin:1.1rem 0 .8rem;
      background:linear-gradient(to right,transparent,var(--acct-edge,#FAD8E9),transparent);
      opacity:.75}
    .cauth-link{display:block;width:100%;text-align:left;background:none;border:none;font:inherit;
      color:var(--acct-val,#8ECBF2);padding:.22em .5em;cursor:pointer;text-decoration:none;border-radius:6px;font-size:.9em}
    .cauth-link:hover{background:var(--acct-hover,rgba(255,255,255,.14));color:var(--acct-ink,#fff)}
    .cauth-admin{color:var(--acct-admin,#F49E9E);font-weight:600}
    .cauth-admin:hover{color:var(--acct-admin,#F49E9E)}
    .cauth-rule-admin{margin:.55rem 0 .5rem;
      background:linear-gradient(to right,transparent,var(--acct-admin,#F49E9E),transparent)}
    .cauth-note{font-size:.78em;min-height:1.1em;margin-top:.4rem}
    .cauth-note.ok{color:var(--acct-ok,#BFEBC8)} .cauth-note.err{color:var(--acct-err,#FFC9C9)}

  `;
  document.head.appendChild(style);

  /* the account box is appended to <body> so no ancestor stacking context
     (the header uses z-index + backdrop-filter) can paint over or clip it */
  const clusterEl = document.createElement("div");
  clusterEl.className = "cauth-cluster";
  clusterEl.id = "cauthCluster";
  document.body.appendChild(clusterEl);

  const boxEl = document.createElement("span");
  boxEl.className = "cauth-box";
  boxEl.id = "cauthBox";
  boxEl.innerHTML =
    '<button class="cauth-pill" id="cauthAvatarBtn" aria-haspopup="true" aria-expanded="false">' +
      '<span class="cauth-pill-lead" id="cauthPillLead">Sign in</span>' +
      '<span class="cauth-pill-email" id="cauthPillEmail" hidden></span>' +
    '</button>' +
    '<button class="cauth-x" id="cauthClose" type="button" aria-label="Close">&times;</button>';
  clusterEl.appendChild(boxEl);

  const _tb = document.getElementById("themeBtn");
  if (_tb) clusterEl.insertBefore(_tb, boxEl);

  const $ = id => document.getElementById(id);
  const avatarBtn = $("cauthAvatarBtn");
  /* collapsed shows a shortened address; expanded shows it in full */
  function paintEmail(){
    const el = document.getElementById("cauthPillEmail");
    const u = window.collateraUser;
    if (!el || !u) return;
    const em = u.email || "";
    const open = document.getElementById("cauthBox")?.classList.contains("open");
    el.textContent = (!open && em.length > 25) ? em.slice(0, 20) + "\u2026" : em;
    el.title = em;
  }

  /* pill wording depends on auth state and whether the panel is open */
  function paintLead(forceOpen){
    const lead = $("cauthPillLead"); if (!lead) return;
    const bx = document.getElementById("cauthBox");
    const open = forceOpen !== undefined ? forceOpen : bx?.classList.contains("open");
    const narrow = window.matchMedia("(max-width: 720px)").matches;
    if (!window.collateraUser) lead.textContent = open ? "Not currently signed in" : "Sign in";
    else lead.textContent = open ? "User:" : (narrow ? "User" : "");
  }

  /* ---- the dropdown panel ---- */
  const panel = document.createElement("div");
  panel.className = "cauth-panel";
  panel.id = "cauthPanel";
  panel.innerHTML = `
    <div id="cauthOut">
      <div class="cauth-row">
        <label class="cauth-inlbl" for="cauthEmail">Email:</label>
        <input id="cauthEmail" type="email" autocomplete="username"
               autocapitalize="off" spellcheck="false" placeholder="you@example.com">
      </div>
      <div class="cauth-row">
        <label class="cauth-inlbl" for="cauthPass">Password:</label>
        <input id="cauthPass" type="password" autocomplete="current-password" placeholder="">
      </div>
      <button class="cauth-save" id="cauthSubmit" type="button">Sign in</button>
      <div class="cauth-note" id="cauthMsg" role="alert"></div>
    </div>
    <div id="cauthIn" hidden>
      <div class="cauth-avatarwrap">
        <div class="cauth-avatar" id="cauthAvatar" aria-hidden="true"></div>
      </div>
      <div class="cauth-row">
        <label class="cauth-inlbl" for="cauthPos">Position:</label>
        <input id="cauthPos" list="cauthPosList" maxlength="${TITLE_MAX}" autocomplete="off"
               placeholder="&lt;none&gt;">
      </div>
      <datalist id="cauthPosList">
        ${POSITIONS.map(p => `<option value="${p}"></option>`).join("")}
      </datalist>
      <div class="cauth-row cauth-row-bio">
        <label class="cauth-inlbl" for="cauthBio">Bio:</label>
        <textarea id="cauthBio" maxlength="${BIO_MAX}" rows="2" placeholder="&lt;none&gt;"></textarea>
      </div>
      <div class="cauth-count" id="cauthBioCount">0 / ${BIO_MAX}</div>
      <div class="cauth-row" id="cauthPwRow" hidden>
        <label class="cauth-inlbl" for="cauthPw">New password:</label>
        <input id="cauthPw" type="password" autocomplete="new-password"
               placeholder="leave blank to keep current">
      </div>
      <button class="cauth-save" id="cauthSave" type="button">Save changes</button>
      <div class="cauth-note" id="cauthNote"></div>
      <hr class="cauth-rule">
      <div id="cauthAdmin" hidden>
        <a class="cauth-link cauth-admin" id="cauthReview" href="/review/">Review queue</a>
        <a class="cauth-link cauth-admin" id="cauthUpload" href="${UPLOAD_URL}">Upload an image</a>
        <hr class="cauth-rule cauth-rule-admin">
      </div>
      <button class="cauth-link" id="cauthEditBtn" type="button">Edit profile / password</button>
      <a class="cauth-link" id="cauthSubmit2" href="/submit/">Submit to the library</a>
      <button class="cauth-link" id="cauthClearBtn" type="button">Clear Recently Viewed</button>
      <button class="cauth-link" id="cauthOutBtn" type="button">Sign out</button>
    </div>`;
  boxEl.appendChild(panel);


  /* the submit link carries a hint about where the person came from */
  function tagSubmitLink(){
    const a = $("cauthSubmit2"); if (!a) return;
    const p = location.pathname;
    const kind = p.startsWith("/decks") ? "deck"
               : p.startsWith("/guidelines") ? "guideline"
               : p.startsWith("/self-educate") ? "resource"
               : "image";
    a.href = "/submit/?kind=" + kind;
  }

  const box = () => document.getElementById("cauthBox");
  const openPanel  = () => {
    tagSubmitLink();
    box().classList.add("open");
    paintLead(true);
    paintEmail();
    panel.classList.add("open");
    avatarBtn?.setAttribute("aria-expanded","true");
  };
  const closePanel = () => {
    box().classList.remove("open");
    paintLead(false);
    paintEmail();
    panel.classList.remove("open");
    setEditing(false);
    avatarBtn?.setAttribute("aria-expanded","false");
  };

  if (avatarBtn) avatarBtn.onclick = (e) => {
    e.stopPropagation();
    box().classList.contains("open") ? closePanel() : openPanel();
  };
  document.addEventListener("click", (e) => {
    const b = box();
    if (b && b.classList.contains("open") && !b.contains(e.target)) closePanel();
  });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") closePanel(); });
  $("cauthClose").onclick = (e) => { e.stopPropagation(); closePanel(); };

  const bioEl = $("cauthBio"), noteEl = $("cauthNote");

  /* fields are read-only until Edit is pressed; Save returns them to locked */
  function setEditing(on){
    const pos = $("cauthPos");
    if (!pos) return;
    [pos, bioEl].forEach(el => { el.readOnly = !on; });
    pos.setAttribute("list", on ? "cauthPosList" : "");
    $("cauthSave").style.display  = on ? "" : "none";
    $("cauthPwRow").hidden = !on;
    if (!on) $("cauthPw").value = "";
    $("cauthBioCount").style.display = on ? "" : "none";
    $("cauthEditBtn").style.display = on ? "none" : "";
    $("cauthEditBtn").textContent = "Edit profile / password";
    if (on) pos.focus();
  }
  bioEl.addEventListener("input", () => { $("cauthBioCount").textContent = `${bioEl.value.length} / ${BIO_MAX}`; });
  function note(msg, ok){ noteEl.textContent = msg; noteEl.className = "cauth-note " + (ok ? "ok" : "err"); }

  /* ---- paint signed-in / signed-out state ---- */
  async function paint(sb, session){
    const user = session?.user || null;
    window.collateraUser = user;
    const pmail = $("cauthPillEmail");
    box()?.classList.toggle("is-out", !user);
    if (user) { pmail.hidden = false; }
    else      { pmail.textContent = ""; pmail.hidden = true; }
    paintLead();
    paintEmail();
    $("cauthOut").hidden = !!user;
    $("cauthIn").hidden  = !user;
    if (!user) return;
    $("cauthAdmin").hidden = (user.email !== ADMIN_EMAIL);
    const { data } = await sb.from("profiles")
      .select("title, position, bio").eq("user_id", user.id).maybeSingle();
    $("cauthPos").value = data?.position || data?.title || "";
    bioEl.value           = data?.bio || "";
    $("cauthBioCount").textContent = `${bioEl.value.length} / ${BIO_MAX}`;
    note("", true);
    setEditing(false);
  }

  /* ---- load supabase-js, then wire everything ---- */
  const libEl = document.createElement("script");
  libEl.src = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2";
  libEl.onload = async () => {
    const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
    window.sb = sb;
    const { data: { session } } = await sb.auth.getSession();
    await paint(sb, session);
    _resolveReady(sb);
    sb.auth.onAuthStateChange(async (_e, s) => { await paint(sb, s); });

    async function doLogin(){
      const email = $("cauthEmail").value.trim(), pass = $("cauthPass").value, msg = $("cauthMsg");
      if (!email || !pass) { msg.textContent = "Enter your email and password."; msg.className = "cauth-note err"; return; }
      $("cauthSubmit").disabled = true; msg.textContent = "Signing in\u2026"; msg.className = "cauth-note";
      const { error } = await sb.auth.signInWithPassword({ email, password: pass });
      $("cauthSubmit").disabled = false;
      if (error) { msg.textContent = error.message || "Sign-in failed."; msg.className = "cauth-note err"; return; }
      $("cauthPass").value = ""; $("cauthEmail").value = ""; msg.textContent = "";
    }
    $("cauthSubmit").onclick = doLogin;
    $("cauthPass").addEventListener("keydown", e => { if (e.key === "Enter") doLogin(); });

    $("cauthSave").onclick = async () => {
      const u = window.collateraUser; if (!u) return;
      $("cauthSave").disabled = true; note("Saving\u2026", true);
      const { error } = await sb.from("profiles").upsert({
        user_id: u.id,
        position: $("cauthPos").value.trim().slice(0, TITLE_MAX) || null,
        title: null,
        bio: bioEl.value.trim().slice(0, BIO_MAX) || null,
        updated_at: new Date().toISOString()
      }, { onConflict: "user_id" });
      let pwErr = null;
      const pw = $("cauthPw").value;
      if (!error && pw) {
        if (pw.length < 6) pwErr = "Password must be at least 6 characters.";
        else {
          const r = await sb.auth.updateUser({ password: pw });
          if (r.error) pwErr = r.error.message;
        }
      }
      $("cauthSave").disabled = false;
      if (error)      note(error.message || "Couldn't save.", false);
      else if (pwErr) note(pwErr, false);
      else { note(pw ? "Saved. Password changed." : "Saved.", true); setEditing(false); }
    };

    $("cauthClearBtn").onclick = async () => {
      const u = window.collateraUser; if (!u) return;
      if (!confirm("Clear your recently-viewed history? This can't be undone.")) return;
      const { error } = await sb.from("recent_views").delete().eq("user_id", u.id);
      if (error) { note(error.message || "Couldn't clear history.", false); return; }
      note("Recent history cleared.", true);
      document.dispatchEvent(new CustomEvent("collatera:recents-cleared"));
    };

    $("cauthEditBtn").onclick = () => setEditing(true);
    $("cauthOutBtn").onclick = async () => { await sb.auth.signOut(); closePanel(); };
  };
  libEl.onerror = () => { const b = $("cauthSubmit"); if (b) { b.textContent = "Sign-in unavailable"; b.disabled = true; } };
  document.head.appendChild(libEl);
})();
