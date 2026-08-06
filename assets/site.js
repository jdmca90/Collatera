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
const DEV_BANNER_TEXT = "Personal website · in development";

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
    .menu-btn.is-brand .brand{font-size:26px;line-height:1;color:var(--brand);
      font-variant-caps:small-caps;letter-spacing:.005em}
    .menu-chev{font-size:.72em;opacity:.55;margin-left:-.1em}
    .menu-logo{width:2.9em;height:2.9em;border-radius:50%;display:block;flex:none;
      border:2.5px solid var(--logo-ring,#A8455C);box-sizing:border-box}
    .cauth-pill{display:inline-flex;flex-direction:column;align-items:center;justify-content:center;
      gap:.05em;margin-left:.6em;padding:.5em .95em;border-radius:14px;cursor:pointer;
      background:var(--acct,#1B5E85);color:var(--acct-ink,#fff);border:2px solid var(--acct-edge2,#FAD8E9);font:inherit;line-height:1.2;
      box-shadow:0 0 0 1.5px var(--acct-open,#0F3A54),0 2px 8px rgba(0,0,0,.22);
      max-width:15em;overflow:hidden;
      transition:border-radius .18s ease, width .22s cubic-bezier(.22,.61,.36,1),
                 padding .22s ease, background .18s ease}
    .cauth-pill:hover{filter:brightness(1.08)}
    .cauth-pill:focus-visible{outline:2px solid var(--accent-deep,#1C6390);outline-offset:3px}
    .cauth-pill.is-open{border-width:7px;border-bottom-width:0;
      border-bottom-left-radius:0;border-bottom-right-radius:0;max-width:none;
      background:var(--acct-open,#0F3A54);
      box-shadow:0 0 0 1.5px var(--acct-open,#0F3A54);
      display:flex;flex-direction:column;justify-content:center;
      align-items:center;gap:.15em;padding:1.9em 1.7rem 1.75em;text-align:center}
    .cauth-pill.is-open .cauth-pill-lead{font-style:normal;font-size:1.06em;
      font-weight:600;color:var(--acct-user,#F49E9E);opacity:1}
    .cauth-pill.is-open .cauth-pill-email{font-size:1.06em;font-weight:700;
      color:var(--acct-val,#8ECBF2);max-width:none}
    .cauth-pill-lead{display:none}
    .cauth-pill.is-open .cauth-pill-lead,
    .cauth-pill.is-out .cauth-pill-lead{display:inline;font-style:normal;
      font-weight:700;font-size:.95em}
    .cauth-pill.is-out.is-open .cauth-pill-lead{font-size:1.1em;
      color:var(--acct-user,#F49E9E)}
    .cauth-pill-email{font-size:.9em;font-weight:700;letter-spacing:-.005em;
      font-family:"Avenir Next Condensed","Roboto Condensed","Segoe UI Semibold",
        "Hanken Grotesk",system-ui,sans-serif;
      max-width:15em;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
    .cauth-pill-email{font-size:.84em;max-width:14em;overflow:hidden;text-overflow:ellipsis;
      white-space:nowrap}

    .cauth-panel{position:fixed;z-index:1200;
      width:min(94vw,340px);background:var(--acct-open,#0F3A54);color:var(--acct-ink,#fff);
      border:7px solid var(--acct-edge,#FAD8E9);border-top:none;
      border-radius:0 0 16px 16px;padding:1.5rem 1.7rem 1.5rem;
      box-shadow:0 0 0 1.5px var(--acct-open,#0F3A54),0 16px 44px rgba(0,0,0,.34);
      display:block;text-align:left;
      max-height:0;opacity:0;overflow:hidden;pointer-events:none;
      padding-top:0;padding-bottom:0;border-bottom-width:0;
      transition:max-height .26s cubic-bezier(.22,.61,.36,1),opacity .18s ease,
                 padding .26s ease,border-width .26s ease}
    .cauth-panel.open{max-height:80vh;opacity:1;pointer-events:auto;overflow-y:auto;
      padding-top:1.5rem;padding-bottom:1.5rem;border-bottom-width:7px}
    .cauth-email{font-size:.86em;color:var(--muted,#6B6860);word-break:break-all;margin-bottom:.8rem}
    .cauth-avatarwrap{display:flex;justify-content:center;margin:.2rem 0 1.1rem}
    .cauth-avatar{width:66px;height:66px;border-radius:50%;
      border:3px solid var(--acct-edge,#FAD8E9);background:rgba(255,255,255,.10);
      background-size:cover;background-position:center;
      display:flex;align-items:center;justify-content:center;
      font-size:3.1rem;line-height:1;color:var(--acct-edge,#FAD8E9);overflow:hidden}
    .cauth-avatar::after{content:"\\1F464";opacity:.5;transform:translateY(.08em) scale(1.15)}
    .cauth-avatar.has-img::after{content:""}
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

  const $ = id => document.getElementById(id);
  const avatarBtn = $("cauthAvatarBtn");
  /* pill wording depends on auth state and whether the panel is open */
  function paintLead(forceOpen){
    const lead = $("cauthPillLead"); if (!lead) return;
    const open = forceOpen !== undefined ? forceOpen : avatarBtn?.classList.contains("is-open");
    if (!window.collateraUser) lead.textContent = open ? "Not currently signed in" : "Sign in";
    else lead.textContent = open ? "User:" : "";
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
  document.body.appendChild(panel);


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

  const openPanel  = () => {
    tagSubmitLink();
    paintLead(true);
    panel.classList.add("open");            // measure with layout applied
    if (avatarBtn) {
      const pw = panel.getBoundingClientRect().width;
      avatarBtn.classList.add("is-open");
      avatarBtn.style.width = pw + "px";     // pill grows to the panel's width
      const r = avatarBtn.getBoundingClientRect();
      panel.style.top   = r.bottom + "px";   // flush: one continuous shape
      panel.style.right = Math.max(8, window.innerWidth - r.right) + "px";
    }
    avatarBtn?.setAttribute("aria-expanded","true");
  };
  const closePanel = () => {
    panel.classList.remove("open");
    paintLead(false);
    if (avatarBtn) { avatarBtn.classList.remove("is-open"); avatarBtn.style.width = ""; }
    setEditing(false);
    avatarBtn?.setAttribute("aria-expanded","false");
  };

  if (avatarBtn) avatarBtn.onclick = (e) => {
    e.stopPropagation();
    panel.classList.contains("open") ? closePanel() : openPanel();
  };
  document.addEventListener("click", (e) => {
    if (panel.classList.contains("open") && !panel.contains(e.target)) closePanel();
  });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") closePanel(); });

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
    avatarBtn?.classList.toggle("is-out", !user);
    if (user) { pmail.textContent = user.email || ""; pmail.hidden = false; }
    else      { pmail.textContent = ""; pmail.hidden = true; }
    paintLead();
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
