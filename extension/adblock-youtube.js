// YouTube ad blocker — runs on youtube.com pages.
// Hides ad containers, auto-skips video ads, removes popup overlays.

(function () {
  // Sync with stored settings
  const SETTINGS_DEFAULTS = {
    youtube_ads: true,
    skip_video_ads: true,
    hide_sponsored: true
  };

  let settings = SETTINGS_DEFAULTS;
  chrome.storage.sync.get(SETTINGS_DEFAULTS, (s) => {
    settings = { ...SETTINGS_DEFAULTS, ...s };
    if (settings.youtube_ads) startBlocking();
  });

  chrome.storage.onChanged.addListener((changes) => {
    for (const k in changes) settings[k] = changes[k].newValue;
  });

  // CSS to hide ad-related DOM
  const HIDE_CSS = `
    ytd-ad-slot-renderer,
    ytd-display-ad-renderer,
    ytd-promoted-sparkles-web-renderer,
    ytd-promoted-video-renderer,
    ytd-banner-promo-renderer,
    ytd-statement-banner-renderer,
    ytd-in-feed-ad-layout-renderer,
    ytd-mealbar-promo-renderer,
    ytd-engagement-panel-section-list-renderer[target-id="engagement-panel-ads"],
    .ytp-ad-overlay-container,
    .ytp-ad-text-overlay,
    .ytp-paid-content-overlay,
    .iv-promo,
    #masthead-ad,
    #player-ads,
    ytd-rich-item-renderer:has(ytd-ad-slot-renderer),
    .ytd-watch-next-secondary-results-renderer ytd-promoted-sparkles-web-renderer,
    ytd-rich-section-renderer:has(ytd-statement-banner-renderer) {
      display: none !important;
    }
  `;

  function injectCSS() {
    if (document.getElementById('uc-adblock-style')) return;
    const style = document.createElement('style');
    style.id = 'uc-adblock-style';
    style.textContent = HIDE_CSS;
    (document.head || document.documentElement).appendChild(style);
  }

  function skipVideoAd() {
    if (!settings.skip_video_ads) return;
    // Click the "Skip ad" button when it appears
    const skipBtn = document.querySelector(
      '.ytp-ad-skip-button, .ytp-ad-skip-button-modern, .ytp-skip-ad-button, button.ytp-ad-skip-button-container'
    );
    if (skipBtn && skipBtn.offsetParent !== null) skipBtn.click();

    // If we're inside an ad, skip to the end of the ad video to bypass it
    const video = document.querySelector('.html5-main-video');
    const adShowing = document.querySelector('.ad-showing, .ytp-ad-player-overlay, .ytp-ad-progress-list');
    if (video && adShowing && !isNaN(video.duration) && video.duration > 0) {
      // Jump to the end of the ad
      try { video.currentTime = video.duration; } catch (e) {}
      try { video.playbackRate = 16; } catch (e) {}
    } else if (video && !adShowing) {
      // Reset playback rate after ads
      if (video.playbackRate > 2) try { video.playbackRate = 1; } catch (e) {}
    }

    // Close the "Try premium" / popup overlays
    const popups = document.querySelectorAll(
      'tp-yt-paper-dialog[aria-label*="premium" i], yt-mealbar-promo-renderer, ytd-popup-container tp-yt-paper-dialog'
    );
    popups.forEach((p) => {
      const close = p.querySelector('button[aria-label*="close" i], button[aria-label*="dismiss" i], yt-button-shape button');
      if (close) close.click();
      p.remove();
    });
  }

  let started = false;
  function startBlocking() {
    if (started) return;
    started = true;
    injectCSS();
    // Continuous monitoring (YouTube is SPA + dynamic ads)
    setInterval(skipVideoAd, 250);
    new MutationObserver(skipVideoAd).observe(document.documentElement, { childList: true, subtree: true });
  }

  // Inject early even before storage callback resolves
  injectCSS();
})();
