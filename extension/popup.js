const statusEl = document.getElementById('status');
const dlBtn = document.getElementById('dl');
const statsEl = document.getElementById('stats');

const DEFAULTS = {
  youtube_ads: true,
  skip_video_ads: true,
  general_ads: true,
  block_popups: true,
  trackers: false
};

// ============ Connection check ============
async function checkApp() {
  const r = await chrome.runtime.sendMessage({ type: 'ping-app' });
  const txt = document.getElementById('statusText');
  if (r?.ok) {
    txt.textContent = 'App connectée';
    statusEl.className = 'status ok';
  } else {
    txt.textContent = 'App non détectée — lance Ultimate Creator App';
    statusEl.className = 'status bad';
  }
}

// ============ Download ============
dlBtn.onclick = async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const txt = document.getElementById('statusText');
  if (!tab?.url?.includes('youtube.com/watch')) {
    txt.textContent = 'Ouvre une page de vidéo YouTube';
    statusEl.className = 'status bad';
    return;
  }
  const r = await chrome.runtime.sendMessage({ type: 'send-to-app', url: tab.url });
  if (r?.ok) {
    txt.textContent = '✓ Envoyé à l\'app';
    statusEl.className = 'status ok';
    setTimeout(() => window.close(), 600);
  } else {
    txt.textContent = 'Erreur — l\'app n\'est pas lancée';
    statusEl.className = 'status bad';
  }
};

// ============ Adblock toggles ============
async function loadSettings() {
  const stored = await chrome.storage.sync.get(DEFAULTS);
  document.querySelectorAll('.switch').forEach((sw) => {
    const k = sw.dataset.key;
    if (stored[k]) sw.classList.add('on'); else sw.classList.remove('on');
  });
}

// Allow clicking the entire row to toggle the switch
document.querySelectorAll('.toggle-row').forEach((row) => {
  row.addEventListener('click', (e) => {
    if (e.target.classList.contains('switch')) return;
    const sw = row.querySelector('.switch');
    if (sw) sw.click();
  });
});

document.querySelectorAll('.switch').forEach((sw) => {
  sw.addEventListener('click', async (e) => {
    e.stopPropagation();
    sw.classList.toggle('on');
    const k = sw.dataset.key;
    const v = sw.classList.contains('on');
    await chrome.storage.sync.set({ [k]: v });
    // Toggle the matching declarativeNetRequest ruleset if applicable
    const rulesetMap = {
      youtube_ads: 'youtube_ads',
      general_ads: 'general_ads',
      trackers: 'trackers'
    };
    if (rulesetMap[k]) {
      try {
        if (chrome.declarativeNetRequest && chrome.declarativeNetRequest.updateEnabledRulesets) {
          const action = v
            ? { enableRulesetIds: [rulesetMap[k]] }
            : { disableRulesetIds: [rulesetMap[k]] };
          await chrome.declarativeNetRequest.updateEnabledRulesets(action);
        }
      } catch (e) { console.warn(e); }
    }
    refreshStats();
  });
});

// ============ Stats ============
async function refreshStats() {
  try {
    // Safari does not implement getMatchedRules; check the parent first to
    // avoid throwing on browsers without declarativeNetRequest at all.
    if (!chrome.declarativeNetRequest || !chrome.declarativeNetRequest.getMatchedRules) {
      statsEl.textContent = '';
      return;
    }
    const matched = await chrome.declarativeNetRequest.getMatchedRules({});
    const count = (matched.rulesMatchedInfo || []).length;
    statsEl.innerHTML = count
      ? `<b>${count}</b> requête${count > 1 ? 's' : ''} bloquée${count > 1 ? 's' : ''} récemment`
      : 'Aucune pub bloquée pour l\'instant';
  } catch (e) {
    statsEl.textContent = '';
  }
}

loadSettings().then(refreshStats);
checkApp();
