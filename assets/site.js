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
      <button class="menu-btn is-logo" id="menuBtn" aria-label="Open menu" aria-haspopup="true" aria-expanded="false"><img class="menu-logo" src="/assets/collatera-logo-v2.png" alt=""></button>
      <div class="brand-group">
        <a class="brand" href="/ref-images/"><span class="brand-c">C</span>ollatera</a>
        ${SECTION ? `<span class="section-title">${SECTION}</span>` : ""}
      </div>
      <span class="spacer"></span>
      <button class="theme-btn" id="themeBtn" title="Switch light / dark" aria-label="Switch light or dark mode">&#9680;</button>
      <button class="cauth-pill" id="cauthAvatarBtn" aria-haspopup="true" aria-expanded="false">
        <span class="cauth-pill-lead" id="cauthPillLead">Sign in</span>
        <span class="cauth-pill-email" id="cauthPillEmail" hidden></span>
      </button>
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
  const POSITIONS     = ["Fellow","Resident","Medical Student","Cardiologist","Hospitalist","Other"];
  const BIO_MAX = 300, TITLE_MAX = 40;

  let _resolveReady;
  window.sbReady = new Promise(r => { _resolveReady = r; });
  window.collateraUser = null;

  /* ---- scoped styles (cauth- prefix; no global class clash) ---- */
  const style = document.createElement("style");
  style.textContent = `
    .menu-btn.is-logo{padding:.15em;line-height:0;display:inline-flex;align-items:center;justify-content:center}
    .menu-logo{width:2.1em;height:2.1em;border-radius:50%;display:block}
    .cauth-pill{display:inline-flex;flex-direction:column;align-items:center;justify-content:center;
      gap:.05em;margin-left:.6em;padding:.42em 1.05em;border-radius:14px;cursor:pointer;
      background:#2B6E96;color:#fff;border:2px solid #fff;font:inherit;line-height:1.2;
      max-width:15em;box-shadow:0 2px 8px rgba(0,0,0,.22)}
    .cauth-pill:hover{background:#31789f}
    .cauth-pill:focus-visible{outline:2px solid var(--accent,#85CCCC);outline-offset:3px}
    .cauth-pill-lead{font-size:.78em;font-style:italic;opacity:.95;white-space:nowrap}
    .cauth-pill-email{font-size:.84em;max-width:14em;overflow:hidden;text-overflow:ellipsis;
      white-space:nowrap}

    .cauth-panel{position:fixed;top:4rem;right:.75rem;z-index:1200;
      width:min(94vw,320px);background:var(--bg,#FAF7F0);color:var(--fg,#1a1a1a);
      border:1px solid var(--line,#cbd3d3);border-radius:14px;padding:1rem;
      box-shadow:0 16px 44px rgba(0,0,0,.30);display:none;text-align:left}
    .cauth-panel.open{display:block}
    .cauth-email{font-size:.86em;opacity:.75;word-break:break-all;margin-bottom:.8rem}
    .cauth-lbl{display:block;font-size:.78em;opacity:.8;margin:.6rem 0 .2rem}
    .cauth-panel select,.cauth-panel input,.cauth-panel textarea{width:100%;box-sizing:border-box;
      padding:.5em .6em;border:1px solid var(--line,#cbd3d3);border-radius:8px;font:inherit;
      background:#fff;color:#111}
    .cauth-panel textarea{resize:vertical;min-height:4.2em}
    .cauth-count{font-size:.72em;opacity:.6;text-align:right;margin-top:.15rem}
    .cauth-save{margin-top:.7rem;width:100%;padding:.55em;border:none;border-radius:8px;
      background:var(--accent,#85CCCC);color:#0a2b2b;font:inherit;font-weight:600;cursor:pointer}
    .cauth-save:disabled{opacity:.6;cursor:default}
    .cauth-rule{border:none;border-top:1px solid var(--line,#cbd3d3);margin:.9rem 0 .5rem}
    .cauth-link{display:block;width:100%;text-align:left;background:none;border:none;font:inherit;
      color:inherit;padding:.45em .1em;cursor:pointer;text-decoration:none;border-radius:6px}
    .cauth-link:hover{background:rgba(133,204,204,.18)}
    .cauth-note{font-size:.78em;min-height:1.1em;margin-top:.4rem}
    .cauth-note.ok{color:#1d7a4c} .cauth-note.err{color:#c0392b}

    .cauth-scrim{position:fixed;inset:0;background:rgba(0,0,0,.45);display:none;
      align-items:center;justify-content:center;z-index:1300}
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

  const $ = id => document.getElementById(id);
  const avatarBtn = $("cauthAvatarBtn");

  /* ---- the dropdown panel ---- */
  const panel = document.createElement("div");
  panel.className = "cauth-panel";
  panel.id = "cauthPanel";
  panel.innerHTML = `
    <div id="cauthOut">
      <div class="cauth-email">Not signed in</div>
      <button class="cauth-link" id="cauthOpenLogin">Sign in</button>
    </div>
    <div id="cauthIn" hidden>
      <div class="cauth-email" id="cauthEmailLine"></div>
      <label class="cauth-lbl" for="cauthPos">Position</label>
      <select id="cauthPos">
        <option value="">—</option>
        ${POSITIONS.map(p => `<option value="${p}">${p}</option>`).join("")}
      </select>
      <label class="cauth-lbl" for="cauthTitle">Title</label>
      <input id="cauthTitle" type="text" maxlength="${TITLE_MAX}" placeholder="e.g. Interventional Fellow">
      <label class="cauth-lbl" for="cauthBio">Bio</label>
      <textarea id="cauthBio" maxlength="${BIO_MAX}" rows="3" placeholder="A short bio"></textarea>
      <div class="cauth-count" id="cauthBioCount">0 / ${BIO_MAX}</div>
      <button class="cauth-save" id="cauthSave" type="button">Save</button>
      <div class="cauth-note" id="cauthNote"></div>
      <hr class="cauth-rule">
      <a class="cauth-link" id="cauthUpload" href="${UPLOAD_URL}" hidden>Upload an image</a>
      <button class="cauth-link" id="cauthPwBtn" type="button">Change password</button>
      <button class="cauth-link" id="cauthClearBtn" type="button">Clear recent history</button>
      <button class="cauth-link" id="cauthOutBtn" type="button">Sign out</button>
    </div>`;
  document.body.appendChild(panel);

  /* ---- sign-in modal ---- */
  const scrim = document.createElement("div");
  scrim.className = "cauth-scrim"; scrim.id = "cauthScrim";
  scrim.innerHTML = `
    <div class="cauth-modal" role="dialog" aria-modal="true" aria-labelledby="cauthTitleH">
      <h2 id="cauthTitleH">Sign in</h2>
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

  const openPanel  = () => {
    if (avatarBtn) {
      const r = avatarBtn.getBoundingClientRect();
      panel.style.top   = (r.bottom + 8) + "px";
      panel.style.right = Math.max(8, window.innerWidth - r.right) + "px";
    }
    panel.classList.add("open");
    avatarBtn?.setAttribute("aria-expanded","true");
  };
  const closePanel = () => { panel.classList.remove("open"); avatarBtn?.setAttribute("aria-expanded","false"); };
  const openModal  = () => { $("cauthMsg").textContent = ""; scrim.classList.add("open"); $("cauthEmail").focus(); };
  const closeModal = () => scrim.classList.remove("open");

  if (avatarBtn) avatarBtn.onclick = (e) => {
    e.stopPropagation();
    panel.classList.contains("open") ? closePanel() : openPanel();
  };
  document.addEventListener("click", (e) => {
    if (panel.classList.contains("open") && !panel.contains(e.target)) closePanel();
  });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") { closePanel(); closeModal(); } });
  $("cauthCancel").onclick = closeModal;
  scrim.addEventListener("click", e => { if (e.target === scrim) closeModal(); });
  $("cauthOpenLogin").onclick = () => { closePanel(); openModal(); };

  const bioEl = $("cauthBio"), noteEl = $("cauthNote");
  bioEl.addEventListener("input", () => { $("cauthBioCount").textContent = `${bioEl.value.length} / ${BIO_MAX}`; });
  function note(msg, ok){ noteEl.textContent = msg; noteEl.className = "cauth-note " + (ok ? "ok" : "err"); }

  /* ---- paint signed-in / signed-out state ---- */
  async function paint(sb, session){
    const user = session?.user || null;
    window.collateraUser = user;
    const lead = $("cauthPillLead"), pmail = $("cauthPillEmail");
    if (user) {
      lead.textContent = "Signed in as:";
      pmail.textContent = user.email || "";
      pmail.hidden = false;
    } else {
      lead.textContent = "Sign in";
      pmail.textContent = ""; pmail.hidden = true;
    }
    $("cauthOut").hidden = !!user;
    $("cauthIn").hidden  = !user;
    if (!user) return;
    $("cauthEmailLine").textContent = user.email || "signed in";
    $("cauthUpload").hidden = (user.email !== ADMIN_EMAIL);
    const { data } = await sb.from("profiles")
      .select("title, position, bio").eq("user_id", user.id).maybeSingle();
    $("cauthPos").value   = data?.position || "";
    $("cauthTitle").value = data?.title || "";
    bioEl.value           = data?.bio || "";
    $("cauthBioCount").textContent = `${bioEl.value.length} / ${BIO_MAX}`;
    note("", true);
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
      if (!email || !pass) { msg.textContent = "Enter your email and password."; return; }
      $("cauthSubmit").disabled = true; msg.textContent = "Signing in\u2026";
      const { error } = await sb.auth.signInWithPassword({ email, password: pass });
      $("cauthSubmit").disabled = false;
      if (error) { msg.textContent = error.message || "Sign-in failed."; return; }
      $("cauthPass").value = ""; closeModal();
    }
    $("cauthSubmit").onclick = doLogin;
    $("cauthPass").addEventListener("keydown", e => { if (e.key === "Enter") doLogin(); });

    $("cauthSave").onclick = async () => {
      const u = window.collateraUser; if (!u) return;
      $("cauthSave").disabled = true; note("Saving\u2026", true);
      const { error } = await sb.from("profiles").upsert({
        user_id: u.id,
        position: $("cauthPos").value || null,
        title: $("cauthTitle").value.trim().slice(0, TITLE_MAX) || null,
        bio: bioEl.value.trim().slice(0, BIO_MAX) || null,
        updated_at: new Date().toISOString()
      }, { onConflict: "user_id" });
      $("cauthSave").disabled = false;
      note(error ? (error.message || "Couldn't save.") : "Saved.", !error);
    };

    $("cauthPwBtn").onclick = async () => {
      const pw = prompt("New password (at least 6 characters):");
      if (!pw) return;
      if (pw.length < 6) { note("Password must be at least 6 characters.", false); return; }
      const { error } = await sb.auth.updateUser({ password: pw });
      note(error ? (error.message || "Couldn't change password.") : "Password changed.", !error);
    };

    $("cauthClearBtn").onclick = async () => {
      const u = window.collateraUser; if (!u) return;
      if (!confirm("Clear your recently-viewed history? This can't be undone.")) return;
      const { error } = await sb.from("recent_views").delete().eq("user_id", u.id);
      if (error) { note(error.message || "Couldn't clear history.", false); return; }
      note("Recent history cleared.", true);
      document.dispatchEvent(new CustomEvent("collatera:recents-cleared"));
    };

    $("cauthOutBtn").onclick = async () => { await sb.auth.signOut(); closePanel(); };
  };
  libEl.onerror = () => { const b = $("cauthOpenLogin"); if (b) b.textContent = "Sign-in unavailable"; };
  document.head.appendChild(libEl);
})();
