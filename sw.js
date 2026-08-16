/* =================================================================
   COLLATERA — service worker
   Cache-first PWA shell. On install, precaches the full site shell
   plus the entire reference image library (so echo reader mode works
   offline exactly as it does online) and the decks metadata (but not
   deck PDFs — those stay network-only to keep install size sane).

   Reference image library reconciliation:
   Every time /data/images.json is fetched (i.e. whenever /ref-images/
   loads while online), the service worker checks — in the background,
   without blocking the page — whether the live library has changed:
     - new images get downloaded and cached
     - removed images get evicted from the offline cache
     - existing images are re-verified via conditional requests
       (If-None-Match / If-Modified-Since), so an edited or re-uploaded
       image with the same filename gets refreshed, not just skipped
   This is throttled to once per hour per device so it doesn't run on
   every single navigation.

   Site shell / page updates: unrelated to the above. Bump
   CACHE_VERSION to force a full reinstall when non-image content
   (HTML, CSS, etc.) changes — the standard "check on load, apply on
   next launch" pattern.
   ================================================================= */

const CACHE_VERSION = "collatera-v2";
const SHELL_CACHE = `${CACHE_VERSION}-shell`;
const IMAGE_CACHE = `${CACHE_VERSION}-images`;
const META_CACHE = `${CACHE_VERSION}-meta`;

const THROTTLE_MS = 60 * 60 * 1000; // 1 hour
const THROTTLE_KEY = "https://collatera.internal/last-image-check";
const IMAGES_JSON_PATH = "/data/images.json";

/* Every installable page. reportabledev is intentionally excluded —
   it's dev/demo scratch space, not part of the installable PWA scope. */
const SHELL_URLS = [
  "/",
  "/index.html",
  "/manifest.json",
  "/assets/site.js",
  "/assets/styles.css",
  "/assets/icons/icon-192.png",
  "/assets/icons/icon-512.png",
  "/assets/icons/icon-maskable-512.png",
  "/about/",
  "/about/index.html",
  "/ref-images/",
  "/ref-images/index.html",
  "/guidelines/",
  "/guidelines/index.html",
  "/decks/",
  "/decks/index.html",
  "/how-to/",
  "/how-to/index.html",
  "/self-educate/",
  "/self-educate/index.html",
  "/submit/",
  "/submit/index.html",
  "/review/",
  "/review/index.html",
  "/4f5bqdxxo937e7/",
  "/4f5bqdxxo937e7/index.html",
  "/k3xq8mrv2wtb9/",
  "/k3xq8mrv2wtb9/index.html",
  IMAGES_JSON_PATH,
  "/data/decks.json"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const shellCache = await caches.open(SHELL_CACHE);
      // Cache the shell; don't let one missing/renamed file abort the whole install.
      await Promise.all(
        SHELL_URLS.map((url) =>
          fetch(url)
            .then((res) => (res.ok ? shellCache.put(url, res) : null))
            .catch(() => null)
        )
      );

      // Pull the full image library and cache every referenced image
      // so echo reader mode works fully offline.
      try {
        const res = await fetch(IMAGES_JSON_PATH);
        if (res.ok) {
          const data = await res.json();
          const images = (data && data.images) || [];
          const imageCache = await caches.open(IMAGE_CACHE);
          await Promise.all(
            images.map((img) =>
              img && img.file
                ? fetch(img.file)
                    .then((r) => (r.ok ? imageCache.put(img.file, r) : null))
                    .catch(() => null)
                : null
            )
          );
        }
      } catch (e) {
        // If images.json is unreachable at install time, the shell still
        // installs; images will be cached opportunistically as visited.
      }

      self.skipWaiting();
    })()
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((key) => key.startsWith("collatera-") && !key.startsWith(CACHE_VERSION))
          .map((key) => caches.delete(key))
      );
      await self.clients.claim();
    })()
  );
});

/* ---- Reference image library reconciliation ---- */

async function shouldRunReconciliation() {
  const metaCache = await caches.open(META_CACHE);
  const marker = await metaCache.match(THROTTLE_KEY);
  if (!marker) return true;
  const last = parseInt(await marker.text(), 10);
  return !last || Date.now() - last >= THROTTLE_MS;
}

async function markReconciliationRun() {
  const metaCache = await caches.open(META_CACHE);
  await metaCache.put(THROTTLE_KEY, new Response(String(Date.now())));
}

async function verifyAndCacheImage(img, imageCache) {
  if (!img || !img.file) return;
  const cached = await imageCache.match(img.file);

  if (!cached) {
    // New image — fetch and cache.
    try {
      const res = await fetch(img.file);
      if (res.ok) await imageCache.put(img.file, res);
    } catch (e) {
      // Offline or unreachable — will retry on a future reconciliation pass.
    }
    return;
  }

  // Already cached — re-verify against the server using conditional
  // headers, so an unchanged image costs almost nothing but an edited
  // or re-uploaded image (same filename, new content) gets refreshed.
  const headers = {};
  const etag = cached.headers.get("etag");
  const lastModified = cached.headers.get("last-modified");
  if (etag) headers["If-None-Match"] = etag;
  if (lastModified) headers["If-Modified-Since"] = lastModified;

  try {
    const res = await fetch(img.file, { headers });
    if (res.status === 304) return; // unchanged
    if (res.ok) await imageCache.put(img.file, res); // changed — refresh
  } catch (e) {
    // Offline or request failed — keep the existing cached copy.
  }
}

async function reconcileImageLibrary() {
  if (!(await shouldRunReconciliation())) return;
  await markReconciliationRun();

  let freshRes;
  try {
    freshRes = await fetch(IMAGES_JSON_PATH, { cache: "no-store" });
    if (!freshRes.ok) return;
  } catch (e) {
    return; // offline — nothing to reconcile against
  }

  let freshImages = [];
  try {
    const freshData = await freshRes.clone().json();
    freshImages = (freshData && freshData.images) || [];
  } catch (e) {
    return;
  }
  const freshFiles = new Set(freshImages.map((i) => i.file).filter(Boolean));

  const shellCache = await caches.open(SHELL_CACHE);
  const oldRes = await shellCache.match(IMAGES_JSON_PATH);
  let oldFiles = new Set();
  if (oldRes) {
    try {
      const oldData = await oldRes.clone().json();
      oldFiles = new Set(((oldData && oldData.images) || []).map((i) => i.file).filter(Boolean));
    } catch (e) {
      // Malformed cached copy — proceed treating everything as new.
    }
  }

  // Update the cached images.json to the fresh version.
  await shellCache.put(IMAGES_JSON_PATH, freshRes.clone());

  const imageCache = await caches.open(IMAGE_CACHE);

  // Evict images that no longer appear in the library.
  await Promise.all(
    [...oldFiles].map((file) => (freshFiles.has(file) ? null : imageCache.delete(file)))
  );

  // Add new images and re-verify existing ones (catches edits/re-uploads).
  await Promise.all(freshImages.map((img) => verifyAndCacheImage(img, imageCache)));
}

/* ---- Fetch handling ---- */

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // images.json gets its own handler: serve cached immediately, but
  // kick off a throttled background reconciliation of the image library.
  if (url.pathname === IMAGES_JSON_PATH) {
    event.respondWith(
      (async () => {
        const cached = await caches.match(request);
        event.waitUntil(reconcileImageLibrary());
        if (cached) return cached;
        try {
          const fresh = await fetch(request);
          if (fresh.ok) {
            const cache = await caches.open(SHELL_CACHE);
            cache.put(request, fresh.clone());
          }
          return fresh;
        } catch (e) {
          throw e;
        }
      })()
    );
    return;
  }

  event.respondWith(
    (async () => {
      const cached = await caches.match(request);
      if (cached) return cached;

      try {
        const fresh = await fetch(request);
        if (fresh && fresh.ok) {
          const cache = await caches.open(SHELL_CACHE);
          cache.put(request, fresh.clone());
        }
        return fresh;
      } catch (e) {
        // Offline and not in cache. For navigations, fall back to the
        // cached reference library shell rather than a hard failure.
        if (request.mode === "navigate") {
          const fallback = await caches.match("/ref-images/");
          if (fallback) return fallback;
        }
        throw e;
      }
    })()
  );
});
