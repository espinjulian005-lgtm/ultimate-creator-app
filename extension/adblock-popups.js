// Popup blocker — runs on every page. Overrides window.open to filter
// suspected popups (popunders, redirects from clicks, etc.)

(function () {
  const SETTINGS_DEFAULTS = { block_popups: true };
  let enabled = true;
  // Safari/older browsers may not expose chrome.storage in content scripts —
  // fall back to the default in that case.
  const api = (typeof browser !== 'undefined' ? browser : (typeof chrome !== 'undefined' ? chrome : null));
  try {
    if (api && api.storage && api.storage.sync) {
      api.storage.sync.get(SETTINGS_DEFAULTS, (s) => {
        enabled = s && s.block_popups !== false;
      });
      if (api.storage.onChanged) {
        api.storage.onChanged.addListener((c) => {
          if (c.block_popups) enabled = c.block_popups.newValue;
        });
      }
    }
  } catch (e) {}

  // Snapshot the original
  const origOpen = window.open;
  let lastUserClick = 0;

  document.addEventListener('mousedown', () => { lastUserClick = Date.now(); }, true);
  document.addEventListener('keydown', () => { lastUserClick = Date.now(); }, true);

  // Wrap window.open: only allow if there was a recent user gesture
  window.open = function (url, target, features) {
    if (!enabled) return origOpen.call(window, url, target, features);

    // If no recent click (within 500ms), it's almost certainly an automatic popup
    const sinceClick = Date.now() - lastUserClick;
    if (sinceClick > 500) {
      console.log('[UC Adblock] Blocked auto popup:', url);
      return null;
    }

    // Block known popunder hostnames
    const popunderHosts = [
      'popads.net', 'popcash.net', 'popmyads.com', 'propellerads.com',
      'adcash.com', 'adsterra.com', 'exoclick.com', 'adblade.com',
      'clickadu.com', 'mgid.com'
    ];
    try {
      const u = new URL(url, location.href);
      if (popunderHosts.some((h) => u.hostname.includes(h))) {
        console.log('[UC Adblock] Blocked popunder host:', u.hostname);
        return null;
      }
    } catch (e) {}

    return origOpen.call(window, url, target, features);
  };

  // Block common overlay popups (cookie banners triggering ads, etc.) — disabled by default,
  // can be enabled via separate setting if you want aggressive mode.
})();
