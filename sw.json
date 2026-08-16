/* =================================================================
   COLLATERA — service worker
   Cache-first PWA shell. On install, precaches the full site shell
   plus the entire reference image library (so echo reader mode works
   offline exactly as it does online) and the decks metadata (but not
   deck PDFs — those stay network-only to keep install size sane).

   Update pattern: standard "check on load, apply on next launch."
   Bump CACHE_VERSION to force a refresh of the precached set.
   ================================================================= */

const CACHE_VERSION = "collatera-v1";
const SHELL_CACHE = `${CACHE_VERSION}-shell`;
const IMAGE_CACHE = `${CACHE_VERSION}-images`;

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
  "/data/images.json",
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
        const res = await fetch("/data/images.json");
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

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

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
