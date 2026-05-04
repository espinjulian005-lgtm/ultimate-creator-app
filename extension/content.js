// Inject an orange "Ultimate Creator" download button next to YouTube's action bar.

(function () {
  const BUTTON_ID = 'uc-download-btn';

  function getCurrentVideoUrl() {
    const u = new URL(window.location.href);
    if (u.pathname === '/watch') return u.href;
    return null;
  }

  function buildButton() {
    const btn = document.createElement('button');
    btn.id = BUTTON_ID;
    btn.className = 'uc-btn';
    btn.innerHTML = `
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
        <polyline points="7 10 12 15 17 10"/>
        <line x1="12" y1="15" x2="12" y2="3"/>
      </svg>
      <span>Télécharger</span>
    `;
    btn.title = 'Télécharger via Ultimate Creator App';
    btn.onclick = async () => {
      const url = getCurrentVideoUrl();
      if (!url) return;
      btn.classList.add('loading');
      const ping = await chrome.runtime.sendMessage({ type: 'ping-app' });
      if (!ping?.ok) {
        btn.classList.remove('loading');
        showToast("L'app n'est pas lancée. Ouvre Ultimate Creator App puis réessaie.");
        return;
      }
      const r = await chrome.runtime.sendMessage({ type: 'send-to-app', url });
      btn.classList.remove('loading');
      showToast(r?.ok ? '✓ Envoyé à Ultimate Creator' : 'Erreur — vérifie que l\'app est lancée.');
    };
    return btn;
  }

  function showToast(msg) {
    let t = document.getElementById('uc-toast');
    if (!t) {
      t = document.createElement('div');
      t.id = 'uc-toast';
      document.body.appendChild(t);
    }
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(t._timer);
    t._timer = setTimeout(() => t.classList.remove('show'), 3500);
  }

  function inject() {
    if (!getCurrentVideoUrl()) return;
    if (document.getElementById(BUTTON_ID)) return;
    const target =
      document.querySelector('#top-level-buttons-computed') ||
      document.querySelector('#actions-inner #menu') ||
      document.querySelector('ytd-menu-renderer.ytd-watch-metadata');
    if (!target) return;
    target.prepend(buildButton());
  }

  // Watch SPA navigation
  const observer = new MutationObserver(() => inject());
  observer.observe(document.body, { childList: true, subtree: true });

  document.addEventListener('yt-navigate-finish', inject);
  setInterval(inject, 2000);
  inject();
})();
