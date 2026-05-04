const $ = (id) => document.getElementById(id);
const audioFormats = ['mp3', 'wav', 'flac', 'm4a', 'opus', 'aac'];

// ============ Custom window controls (frameless window) ============
const _wcMin = document.getElementById('wcMin');
const _wcMax = document.getElementById('wcMax');
const _wcClose = document.getElementById('wcClose');
if (_wcMin) _wcMin.onclick = () => window.api.windowMinimize();
if (_wcMax) _wcMax.onclick = () => window.api.windowMaximizeToggle();
if (_wcClose) _wcClose.onclick = () => window.api.windowClose();

function reflectMaxState(maximized) {
  const ic1 = document.querySelector('.ic-max');
  const ic2 = document.querySelector('.ic-restore');
  if (!ic1 || !ic2) return;
  ic1.hidden = maximized;
  ic2.hidden = !maximized;
}
window.api.onWindowState && window.api.onWindowState(({ maximized }) => reflectMaxState(maximized));
window.api.windowIsMaximized && window.api.windowIsMaximized().then(reflectMaxState);

// Double-click on the topbar drag area maximizes/restores
const _topbar = document.querySelector('.topbar');
if (_topbar) {
  _topbar.addEventListener('dblclick', (e) => {
    if (e.target.closest('button, input, .topbar-profile, .window-controls, .topbar-action, .search-wrap')) return;
    window.api.windowMaximizeToggle();
  });
}

// ============ Home dashboard quick actions ============
document.querySelectorAll('[data-quick-action]').forEach((b) => {
  b.addEventListener('click', () => {
    const target = b.dataset.quickAction;
    const navItem = document.querySelector(`.nav-item[data-tab="${target}"]`);
    if (navItem) navItem.click();
  });
});

// ============ Stats counters (persisted in localStorage) ============
const STAT_KEYS = ['dl', 'conv', 'img', 'audio'];
function loadStats() {
  const stats = {};
  STAT_KEYS.forEach((k) => {
    try { stats[k] = parseInt(localStorage.getItem('uc_stat_' + k) || '0', 10); } catch { stats[k] = 0; }
  });
  return stats;
}
function renderStats() {
  const s = loadStats();
  const elDl = document.getElementById('statDl'); if (elDl) elDl.textContent = s.dl;
  const elC = document.getElementById('statConv'); if (elC) elC.textContent = s.conv;
  const elI = document.getElementById('statImg'); if (elI) elI.textContent = s.img;
  const elA = document.getElementById('statAudio'); if (elA) elA.textContent = s.audio;
}
function bumpStat(key) {
  try {
    const cur = parseInt(localStorage.getItem('uc_stat_' + key) || '0', 10);
    localStorage.setItem('uc_stat_' + key, String(cur + 1));
    renderStats();
  } catch {}
}
renderStats();

// ============ Topbar global search ============
const SEARCHABLE = [
  { kw: ['télécharg','youtube','mp4','mp3','mkv','playlist','timeline','miniature'], tab: 'download' },
  { kw: ['conver','heic','format','transcod'], tab: 'convert' },
  { kw: ['compress','crf','bitrate'], tab: 'compress' },
  { kw: ['image','détour','bg','upscal','palette','couleur','ocr','texte','effacer','objet','inpaint'], tab: 'image' },
  { kw: ['audio','silence','normalis','crossfade','sous-titre','whisper','audiogramme','résumé','ollama','llm'], tab: 'audio' },
  { kw: ['pdf','fusion','divis','réorgan'], tab: 'pdf' },
  { kw: ['pipette','color','picker','hex','rgb'], tab: 'picker' },
  { kw: ['accueil','home','dashboard'], tab: 'home' }
];
const _searchInput = document.getElementById('globalSearch');
if (_searchInput) {
  _searchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      const q = _searchInput.value.toLowerCase().trim();
      if (!q) return;
      const match = SEARCHABLE.find((s) => s.kw.some((k) => q.includes(k)));
      if (match) {
        const item = document.querySelector(`.nav-item[data-tab="${match.tab}"]`);
        if (item) { item.click(); _searchInput.value = ''; }
      } else {
        toast('Aucune fonctionnalité ne correspond à "' + q + '"', 'warn');
      }
    }
  });
}

// Notifications button → scroll to jobs
const _notifBtn = document.getElementById('notifBtn');
if (_notifBtn) {
  _notifBtn.addEventListener('click', () => {
    const jobs = document.querySelector('.jobs');
    if (jobs) jobs.scrollIntoView({ behavior: 'smooth' });
  });
}

// ============ Onboarding (first launch) ============
const ONBOARDING_SLIDES = [
  {
    icon: '<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v12"/><path d="m6 9 6 6 6-6"/><rect x="4" y="19" width="16" height="2" rx="1"/></svg>',
    title: 'Bienvenue dans Ultimate Creator',
    body: `<p>L'app tout-en-un pour les créateurs de contenu. Tout tourne <b>en local</b>, gratuit, sans abonnement, sans envoyer tes fichiers sur Internet.</p><ul><li>🎬 Téléchargement YouTube · tous formats jusqu'en 8K</li><li>🔄 Conversion universelle · vidéo / audio / image</li><li>🤖 IA locale · transcription, détourage, upscaling</li></ul>`
  },
  {
    icon: '<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>',
    title: 'Outils image',
    body: `<p>L'onglet <b>Image</b> regroupe 6 outils en un :</p><ul><li><b>Détourage</b> · Efface le fond d'une photo (modèle ML local)</li><li><b>Upscaler</b> · Agrandit une image jusqu'à ×4 sans perdre en qualité</li><li><b>Palette</b> · Récupère les 5 couleurs dominantes (HEX/RGB/CMJN)</li><li><b>OCR</b> · Extrait le texte d'une image (FR + EN)</li><li><b>Compression</b> · Allège tes images de 60-80%</li><li><b>Effacer un objet</b> · Brosse une zone, l'algorithme la fait disparaître</li></ul>`
  },
  {
    icon: '<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 10v4M7 6v12M11 3v18M15 8v8M19 11v2"/></svg>',
    title: 'Outils audio',
    body: `<p>L'onglet <b>Audio</b> contient :</p><ul><li><b>Auto-trim</b> · Coupe automatiquement les silences (idéal podcast)</li><li><b>Normaliser</b> · Volume aux normes pro (YouTube, Spotify, podcasts)</li><li><b>Sous-titres</b> · Whisper IA → SRT/VTT en 8 langues</li><li><b>Audiogramme</b> · Vidéo waveform animée pour Insta/TikTok</li><li><b>Résumé YouTube</b> · IA locale via Ollama (résumé d'une vidéo en bullets / chapitres)</li></ul>`
  },
  {
    icon: '<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m2 22 1-1h3l9-9"/><path d="M3 21v-3l9-9"/><path d="m15 6 3.4-3.4a2.1 2.1 0 1 1 3 3L18 9l.4.4a2.1 2.1 0 1 1-3 3l-3.8-3.8a2.1 2.1 0 1 1 3-3l.4.4Z"/></svg>',
    title: 'Pipette + Extension navigateur',
    body: `<p>Deux outils annexes très pratiques :</p><ul><li><b>Pipette</b> · Capture une couleur n'importe où à l'écran (page web, vidéo, autre app)</li><li><b>Extension Chrome/Opera/Edge</b> · Bouton orange "Télécharger" injecté sur YouTube + bloqueur de pubs configurable</li></ul><p>L'extension communique avec l'app via un serveur local. L'app doit être lancée pour qu'elle fonctionne.</p>`
  },
  {
    icon: '<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>',
    title: 'C\'est parti !',
    body: `<p>Quelques tips pour bien commencer :</p><ul><li>Active le toggle <b>Démarrage auto</b> dans la sidebar pour que l'app se lance avec Windows</li><li>Ferme l'app avec la croix → elle reste dans le system tray (ne quitte pas)</li><li>Tous tes fichiers restent <b>sur ta machine</b>, jamais d'upload</li><li>Si quelque chose plante, regarde les pages Github du projet pour la doc</li></ul>`
  }
];

function showOnboarding() {
  const slidesEl = $('onbSlides');
  const progressEl = $('onbProgress');
  slidesEl.innerHTML = '';
  progressEl.innerHTML = '';

  ONBOARDING_SLIDES.forEach((slide, i) => {
    const div = document.createElement('div');
    div.className = 'onboarding-slide' + (i === 0 ? ' active' : '');
    div.innerHTML = `<div class="slide-icon">${slide.icon}</div><h2>${slide.title}</h2>${slide.body}`;
    slidesEl.appendChild(div);

    const dot = document.createElement('span');
    if (i === 0) dot.classList.add('active');
    progressEl.appendChild(dot);
  });

  let current = 0;
  function update() {
    document.querySelectorAll('.onboarding-slide').forEach((s, i) => s.classList.toggle('active', i === current));
    document.querySelectorAll('.onboarding-progress span').forEach((s, i) => {
      s.classList.toggle('active', i === current);
      s.classList.toggle('done', i < current);
    });
    $('onbPrev').hidden = current === 0;
    $('onbNext').textContent = current === ONBOARDING_SLIDES.length - 1 ? 'Démarrer' : 'Suivant';
  }
  $('onbNext').onclick = () => {
    if (current === ONBOARDING_SLIDES.length - 1) closeOnboarding();
    else { current++; update(); }
  };
  $('onbPrev').onclick = () => { if (current > 0) { current--; update(); } };
  $('onbSkip').onclick = closeOnboarding;
  $('onboarding').hidden = false;
}

function closeOnboarding() {
  $('onboarding').hidden = true;
  try { localStorage.setItem('uc_onboarding_done', '1'); } catch {}
}

// Show on first launch only
try {
  if (!localStorage.getItem('uc_onboarding_done')) {
    setTimeout(showOnboarding, 800);
  }
} catch {}

// Help button → re-trigger onboarding any time
const _helpBtn = document.getElementById('helpBtn');
if (_helpBtn) _helpBtn.onclick = () => showOnboarding();

// ============ Tabs (sidebar nav) ============
document.querySelectorAll('.nav-item').forEach((t) => {
  t.addEventListener('click', () => {
    document.querySelectorAll('.nav-item').forEach((x) => x.classList.remove('active'));
    document.querySelectorAll('.panel').forEach((x) => x.classList.remove('active'));
    t.classList.add('active');
    $(`tab-${t.dataset.tab}`).classList.add('active');
  });
});

// Compatibility: some legacy code switches tabs via [data-tab]
function activateTab(name) {
  const item = document.querySelector(`.nav-item[data-tab="${name}"]`);
  if (item) item.click();
}

// ============ Default folders + binary status ============
(async () => {
  const dl = await window.api.defaultDownloads();
  $('dlOutDir').value = dl;
  $('convOutDir').value = dl;
  $('compOutDir').value = dl;
  $('bgOutDir').value = dl;
  $('audioOutDir').value = dl;

  const status = await window.api.binaryStatus();
  if (status.ytDlp && status.ffmpeg) setStatus('ok', 'Prêt');
  else if (status.ytDlp) setStatus('warn', 'ffmpeg manquant');
  else setStatus('warn', 'Téléchargement…');
})();

function setStatus(kind, text) {
  const el = $('binStatus');
  el.className = 'status-pill ' + kind;
  const label = el.querySelector('.status-label');
  if (label) label.textContent = text;
}

// Auto-launch toggle
(async () => {
  const enabled = await window.api.autoLaunchGet();
  $('autoLaunch').checked = enabled;
})();
$('autoLaunch').onchange = async (e) => {
  await window.api.autoLaunchSet(e.target.checked);
};

window.api.onSetupProgress(({ step, status, error }) => {
  if (status === 'downloading') setStatus('warn', `Téléchargement ${step}…`);
  if (status === 'done') setStatus('ok', `${step} prêt`);
  if (status === 'error') setStatus('err', `Erreur ${step}`);
});

// ============ Folder pickers ============
$('pickDlDir').onclick = async () => { const r = await window.api.chooseFolder(); if (r) $('dlOutDir').value = r; };
$('pickConvDir').onclick = async () => { const r = await window.api.chooseFolder(); if (r) $('convOutDir').value = r; };
$('pickCompDir').onclick = async () => { const r = await window.api.chooseFolder(); if (r) $('compOutDir').value = r; };

$('pickConvFile').onclick = async () => {
  const r = await window.api.chooseFile([{ name: 'Médias', extensions: ['mp4','mkv','webm','mov','avi','flv','wmv','mp3','wav','flac','m4a','aac','opus','ogg','png','jpg','jpeg','webp','gif','bmp','tiff','heic','heif'] }]);
  if (r) $('convInput').value = r;
};
$('pickCompFile').onclick = async () => {
  const r = await window.api.chooseFile([{ name: 'Vidéos', extensions: ['mp4','mkv','webm','mov','avi','flv','wmv','m4v'] }]);
  if (r) $('compInput').value = r;
};

// ============ Format toggles ============
$('container').onchange = () => {
  const v = $('container').value;
  const isAudio = audioFormats.includes(v);
  $('qualityWrap').hidden = isAudio;
  $('audioBrWrap').hidden = !isAudio;
};

document.querySelectorAll('input[name="preset"]').forEach((r) => {
  r.onchange = () => { $('customWrap').hidden = r.value !== 'custom' || !r.checked; };
});

// ============ Probe ============
let currentVideoId = null;
let currentDuration = 0;

function extractVideoId(url) {
  try {
    const u = new URL(url);
    if (u.hostname === 'youtu.be') return u.pathname.slice(1);
    if (u.searchParams.get('v')) return u.searchParams.get('v');
    const m = u.pathname.match(/\/(?:embed|shorts)\/([^/?#]+)/);
    if (m) return m[1];
  } catch {}
  return null;
}

$('probeBtn').onclick = async () => {
  const url = $('ytUrl').value.trim();
  if (!url) return;
  $('probeBtn').disabled = true;
  $('probeBtn').textContent = 'Analyse...';
  const r = await window.api.probeUrl(url);
  $('probeBtn').disabled = false;
  $('probeBtn').textContent = 'Analyser';
  if (!r.ok) {
    alert('Erreur : ' + r.error);
    return;
  }
  $('thumb').src = r.thumbnail || '';
  $('vTitle').textContent = r.title || '';
  $('vUploader').textContent = r.uploader || '';
  $('vDuration').textContent = r.duration ? formatDuration(r.duration) : '';
  $('videoInfo').hidden = false;

  currentVideoId = extractVideoId(url);
  currentDuration = r.duration || 0;
  if (currentVideoId && currentDuration > 0) {
    initTimeline(currentVideoId, currentDuration);
    $('timelineWrap').hidden = false;
  }
};

// ============ Thumbnail download ============
$('dlThumb').onclick = async () => {
  if (!currentVideoId) return;
  const dir = $('dlOutDir').value;
  const r = await window.api.downloadThumbnail({ videoId: currentVideoId, outDir: dir, title: $('vTitle').textContent });
  if (r.ok) {
    if (confirm('Miniature enregistrée. Ouvrir le dossier ?')) window.api.showInFolder(r.file);
  } else {
    alert('Erreur : ' + r.error);
  }
};

// ============ Timeline (YouTube IFrame API) ============
let ytPlayer = null;
let trimStart = 0;
let trimEnd = 0;

window.onYouTubeIframeAPIReady = () => { window._ytReady = true; };

function initTimeline(videoId, duration) {
  trimStart = 0;
  trimEnd = duration;
  $('startTime').value = '';
  $('endTime').value = '';
  updateTimelineUI();

  const create = () => {
    if (ytPlayer) { try { ytPlayer.destroy(); } catch {} ytPlayer = null; }
    ytPlayer = new YT.Player('ytPlayer', {
      width: '100%', height: '100%',
      videoId,
      playerVars: { rel: 0, modestbranding: 1 }
    });
  };
  if (window._ytReady) create();
  else { const i = setInterval(() => { if (window._ytReady) { clearInterval(i); create(); } }, 100); }
}

function fmtTime(s) {
  s = Math.max(0, Math.floor(s));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return h ? `${h}:${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`
           : `${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`;
}

function fmtTimeFFmpeg(s) {
  s = Math.max(0, Math.floor(s));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`;
}

function updateTimelineUI() {
  const tl = $('timeline');
  const w = tl.clientWidth || 600;
  const pStart = (trimStart / currentDuration) * 100;
  const pEnd = (trimEnd / currentDuration) * 100;
  $('handleStart').style.left = pStart + '%';
  $('handleEnd').style.left = pEnd + '%';
  $('trackSelection').style.left = pStart + '%';
  $('trackSelection').style.width = (pEnd - pStart) + '%';
  $('timeStartLabel').textContent = fmtTime(trimStart);
  $('timeEndLabel').textContent = fmtTime(trimEnd);

  const isFullRange = trimStart === 0 && trimEnd === currentDuration;
  $('startTime').value = isFullRange ? '' : fmtTimeFFmpeg(trimStart);
  $('endTime').value = isFullRange ? '' : fmtTimeFFmpeg(trimEnd);
}

(function setupTimelineDrag() {
  let dragging = null;
  const tl = $('timeline');

  function pointerToTime(e) {
    const rect = tl.getBoundingClientRect();
    const x = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
    return (x / rect.width) * currentDuration;
  }

  $('handleStart').addEventListener('pointerdown', (e) => { e.stopPropagation(); dragging = 'start'; });
  $('handleEnd').addEventListener('pointerdown', (e) => { e.stopPropagation(); dragging = 'end'; });
  tl.addEventListener('pointerdown', (e) => {
    if (!currentDuration) return;
    const t = pointerToTime(e);
    const closest = Math.abs(t - trimStart) < Math.abs(t - trimEnd) ? 'start' : 'end';
    if (closest === 'start') trimStart = Math.min(t, trimEnd - 1);
    else trimEnd = Math.max(t, trimStart + 1);
    updateTimelineUI();
    if (ytPlayer && ytPlayer.seekTo) ytPlayer.seekTo(closest === 'start' ? trimStart : trimEnd, true);
  });
  window.addEventListener('pointermove', (e) => {
    if (!dragging || !currentDuration) return;
    const t = pointerToTime(e);
    if (dragging === 'start') trimStart = Math.max(0, Math.min(t, trimEnd - 1));
    else trimEnd = Math.min(currentDuration, Math.max(t, trimStart + 1));
    updateTimelineUI();
    if (ytPlayer && ytPlayer.seekTo) ytPlayer.seekTo(dragging === 'start' ? trimStart : trimEnd, true);
  });
  window.addEventListener('pointerup', () => { dragging = null; });
})();

$('resetTrim').onclick = () => {
  trimStart = 0;
  trimEnd = currentDuration;
  updateTimelineUI();
};

function formatDuration(s) {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = Math.floor(s % 60);
  return h ? `${h}:${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}` : `${m}:${String(sec).padStart(2,'0')}`;
}

// ============ Jobs UI ============
const jobs = new Map();

function makeJobId() { return 'j' + Date.now() + Math.random().toString(36).slice(2, 6); }

function addJob(jobId, title) {
  const div = document.createElement('div');
  div.className = 'job';
  div.id = `job-${jobId}`;
  div.innerHTML = `
    <div class="job-head">
      <div class="job-title">${escapeHtml(title)}</div>
      <div class="job-meta"><span class="status">En cours…</span> · <span class="pct">0%</span></div>
    </div>
    <div class="bar"><div></div></div>
    <div class="job-actions">
      <button class="btn small cancel">Annuler</button>
    </div>
  `;
  $('jobList').prepend(div);
  div.querySelector('.cancel').onclick = () => window.api.cancelJob(jobId);
  jobs.set(jobId, div);
  updateJobsCount();
}

function updateJob(jobId, percent) {
  const el = jobs.get(jobId);
  if (!el) return;
  el.querySelector('.bar > div').style.width = percent + '%';
  el.querySelector('.pct').textContent = Math.round(percent) + '%';
}

function finishJob(jobId, ok, file) {
  const el = jobs.get(jobId);
  if (!el) return;
  el.classList.add(ok ? 'done' : 'error');
  el.querySelector('.status').textContent = ok ? 'Terminé' : 'Erreur';
  // Bump dashboard stats based on the job title
  if (ok) {
    const title = (el.querySelector('.job-title')?.textContent || '').toLowerCase();
    if (title.startsWith('téléchargement') || title.startsWith('queue') || title.startsWith('↳')) bumpStat('dl');
    else if (title.startsWith('conversion')) bumpStat('conv');
    else if (title.startsWith('compression') || title.startsWith('upscale') || title.startsWith('inpaint') || title.startsWith('palette')) bumpStat('img');
    else if (title.startsWith('audio') || title.startsWith('audiogramme') || title.startsWith('sous-titres') || title.startsWith('résumé')) bumpStat('audio');
  }
  if (ok) el.querySelector('.bar > div').style.width = '100%';
  el.querySelector('.job-actions').innerHTML = ok && file
    ? `<button class="btn open">Ouvrir</button><button class="btn folder">Voir dans le dossier</button>`
    : '';
  if (ok && file) {
    el.querySelector('.open').onclick = () => window.api.openPath(file);
    el.querySelector('.folder').onclick = () => window.api.showInFolder(file);
  }
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

// ============ Toast notifications ============
function toast(message, kind = 'info', duration = 3500) {
  const t = document.createElement('div');
  t.className = `toast ${kind}`;
  t.textContent = message;
  $('toastContainer').appendChild(t);
  setTimeout(() => {
    t.classList.add('fadeout');
    setTimeout(() => t.remove(), 200);
  }, duration);
}

// ============ Error modal with actionable resolution ============
// errorPatterns map raw error fragments to user-friendly title/detail/actions.
const ERROR_PATTERNS = [
  {
    match: /ffmpeg|ENOENT.+ffmpeg/i,
    title: 'ffmpeg n\'est pas installé',
    detail: 'ffmpeg est nécessaire pour la conversion vidéo/audio. Lance le script d\'installation pour le télécharger automatiquement.',
    actions: [
      { label: 'Comment installer', url: 'https://github.com/yt-dlp/yt-dlp/wiki/Installation#dependencies' }
    ]
  },
  {
    match: /yt-dlp|ytdlp/i,
    title: 'Problème avec yt-dlp',
    detail: 'yt-dlp n\'a pas pu télécharger cette vidéo. Causes possibles : URL invalide, vidéo privée/supprimée, restriction géographique, ou yt-dlp obsolète.',
    actions: [
      { label: 'Mettre à jour yt-dlp', cmd: 'update-yt-dlp' }
    ]
  },
  {
    match: /Real-ESRGAN/i,
    title: 'Real-ESRGAN n\'est pas installé',
    detail: 'L\'upscaler IA nécessite le binaire Real-ESRGAN. Lance install.ps1 pour le télécharger automatiquement (~50 MB).',
    actions: []
  },
  {
    match: /Ollama|11434/i,
    title: 'Ollama n\'est pas accessible',
    detail: 'Le résumé YouTube nécessite Ollama qui doit tourner sur ton ordinateur. Vérifie que l\'icône lama est bien dans le system tray, puis que tu as téléchargé un modèle (ex: ollama pull llama3.2).',
    actions: [
      { label: 'Télécharger Ollama', url: 'https://ollama.com' }
    ]
  },
  {
    match: /whisper|nodewhisper/i,
    title: 'Whisper a échoué',
    detail: 'La transcription audio a planté. Causes possibles : modèle pas téléchargé (1ère utilisation longue), fichier audio corrompu, ou peu d\'espace disque.',
    actions: []
  },
  {
    match: /napi.*canvas|@napi-rs/i,
    title: 'Module canvas manquant',
    detail: 'Le rendu PDF nécessite @napi-rs/canvas. Lance "npm install" dans le dossier de l\'app pour l\'installer.',
    actions: []
  },
  {
    match: /sharp/i,
    title: 'Problème avec sharp',
    detail: 'Le module sharp (compression image) a planté. Vérifie que ton système a Visual C++ Redistributable installé, puis relance "npm install --force".',
    actions: [
      { label: 'Télécharger VC++ Redist', url: 'https://aka.ms/vs/17/release/vc_redist.x64.exe' }
    ]
  },
  {
    match: /ENOSPC|no space|disk full/i,
    title: 'Disque plein',
    detail: 'Plus assez d\'espace disque pour cette opération. Libère de la place et réessaie.',
    actions: []
  },
  {
    match: /ENOMEM|out of memory|allocation failed/i,
    title: 'Manque de mémoire',
    detail: 'L\'opération demande trop de RAM. Si c\'est un fichier énorme (>2 GB vidéo, >50 MP image), ferme tes autres apps ou divise le fichier d\'abord.',
    actions: []
  },
  {
    match: /EACCES|permission denied|access is denied/i,
    title: 'Permission refusée',
    detail: 'Le fichier de destination est verrouillé ou tu n\'as pas les droits d\'écriture. Choisis un autre dossier de sortie.',
    actions: []
  },
  {
    match: /ECONNREFUSED|fetch failed|ERR_CONNECTION/i,
    title: 'Connexion impossible',
    detail: 'L\'app n\'a pas pu joindre un service réseau. Vérifie ta connexion Internet (ou que le serveur local Ollama / extension tourne).',
    actions: []
  }
];

function showError(rawError, context = '') {
  const msg = String(rawError || '');
  const matched = ERROR_PATTERNS.find((p) => p.match.test(msg)) || {
    title: 'Une erreur est survenue',
    detail: context || 'L\'opération a échoué. Détails techniques ci-dessous.',
    actions: []
  };

  $('errorModalIcon').className = 'modal-icon error';
  $('errorModalIcon').innerHTML = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>';
  $('errorModalTitle').textContent = matched.title;
  $('errorModalDetail').textContent = matched.detail;

  const rawEl = $('errorModalRaw');
  if (msg && msg !== matched.detail) {
    rawEl.textContent = msg;
    rawEl.hidden = false;
  } else {
    rawEl.hidden = true;
  }

  const actionsEl = $('errorModalActions');
  actionsEl.innerHTML = '';
  (matched.actions || []).forEach((a) => {
    const btn = document.createElement('button');
    btn.className = 'btn ghost';
    btn.textContent = a.label;
    btn.onclick = () => {
      if (a.url) window.api.openPath ? window.open(a.url, '_blank') : null;
      if (a.cmd === 'update-yt-dlp') toast('Pour mettre à jour : `yt-dlp -U` dans PowerShell.', 'info', 6000);
    };
    actionsEl.appendChild(btn);
  });
  const close = document.createElement('button');
  close.className = 'btn primary';
  close.textContent = 'Fermer';
  close.onclick = () => $('errorModal').hidden = true;
  actionsEl.appendChild(close);

  $('errorModal').hidden = false;
}

// Replace the global alert with our showError for technical messages
const _origAlert = window.alert;
window.alert = function (msg) {
  if (/erreur|error|failed|impossible/i.test(String(msg))) {
    showError(String(msg).replace(/^Erreur\s*:\s*/i, ''));
  } else {
    toast(String(msg), 'info', 4000);
  }
};

// Click backdrop or Escape to close error modal
$('errorModal').addEventListener('click', (e) => {
  if (e.target.classList.contains('modal-backdrop')) $('errorModal').hidden = true;
});
window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && !$('errorModal').hidden) $('errorModal').hidden = true;
});

window.api.onJobProgress(({ jobId, percent }) => {
  if (typeof percent === 'number') updateJob(jobId, percent);
});

// ============ Start download ============
async function warnIfHugeFile(path, threshold = 2 * 1024 * 1024 * 1024) {
  if (!path) return true;
  const r = await window.api.fileSize(path);
  if (r.ok && r.size > threshold) {
    const sizeGB = (r.size / 1024 / 1024 / 1024).toFixed(2);
    return confirm(`Ce fichier fait ${sizeGB} GB. L'opération peut prendre plusieurs minutes et beaucoup de RAM. Continuer ?`);
  }
  return true;
}

$('startDl').onclick = async () => {
  const url = $('ytUrl').value.trim();
  if (!url) return alert('Saisis une URL.');
  const opts = {
    jobId: makeJobId(),
    url,
    outDir: $('dlOutDir').value,
    container: $('container').value,
    quality: $('quality').value,
    audioBitrate: $('audioBitrate').value,
    startTime: $('startTime').value.trim(),
    endTime: $('endTime').value.trim(),
    playlist: $('playlist').checked
  };
  addJob(opts.jobId, `Téléchargement · ${url.slice(0, 60)}`);
  const r = await window.api.startDownload(opts);
  finishJob(opts.jobId, r.ok, r.file);
  if (!r.ok && r.error) alert('Erreur : ' + r.error);
};

// ============ Start convert ============
$('startConv').onclick = async () => {
  const input = $('convInput').value;
  if (!input) return alert('Choisis un fichier.');
  const target = $('convTarget').value;
  const dir = $('convOutDir').value;
  const base = input.replace(/\\/g, '/').split('/').pop().replace(/\.[^.]+$/, '');
  const output = `${dir}\\${base}_converted.${target}`;
  const opts = { jobId: makeJobId(), input, output, audioOnly: $('convAudioOnly').checked };
  addJob(opts.jobId, `Conversion · ${base}.${target}`);
  const r = await window.api.convertFile(opts);
  finishJob(opts.jobId, r.ok, r.file);
  if (!r.ok && r.error) alert('Erreur : ' + r.error);
};

// ============ Start compress ============
$('startComp').onclick = async () => {
  const input = $('compInput').value;
  if (!input) return alert('Choisis un fichier.');
  const dir = $('compOutDir').value;
  const base = input.replace(/\\/g, '/').split('/').pop().replace(/\.[^.]+$/, '');
  const ext = input.split('.').pop();
  const output = `${dir}\\${base}_compressed.${ext}`;
  const preset = document.querySelector('input[name="preset"]:checked').value;
  const opts = {
    jobId: makeJobId(), input, output, preset,
    crf: $('crf').value || 23,
    videoBitrate: $('vBitrate').value || '',
    audioBitrate: $('aBitrate').value,
    resolution: $('resolution').value,
    fps: $('fps').value
  };
  addJob(opts.jobId, `Compression · ${base}`);
  const r = await window.api.compressFile(opts);
  finishJob(opts.jobId, r.ok, r.file);
  if (!r.ok && r.error) alert('Erreur : ' + r.error);
};

// ============ Image: background eraser ============
let bgInputPath = null;
let bgResultPath = null;

$('pickBgDir').onclick = async () => { const r = await window.api.chooseFolder(); if (r) $('bgOutDir').value = r; };
$('bgPickFile').onclick = async (e) => {
  e.preventDefault();
  const r = await window.api.chooseFile([{ name: 'Images', extensions: ['jpg','jpeg','png','webp','bmp','tiff'] }]);
  if (r) loadBgImage(r);
};

['dragover','dragleave','drop'].forEach(ev => {
  $('bgDropzone').addEventListener(ev, (e) => {
    e.preventDefault();
    if (ev === 'dragover') $('bgDropzone').classList.add('dragover');
    else $('bgDropzone').classList.remove('dragover');
    if (ev === 'drop' && e.dataTransfer.files.length) {
      const f = e.dataTransfer.files[0];
      if (f.path) loadBgImage(f.path);
    }
  });
});
$('bgDropzone').onclick = (e) => { if (e.target.tagName !== 'A') $('bgFileInput').click(); };
$('bgFileInput').onchange = (e) => { if (e.target.files[0]?.path) loadBgImage(e.target.files[0].path); };

// Paste from clipboard (Ctrl+V) — only when Image tab is active and no input is focused
document.addEventListener('paste', async (e) => {
  if (!$('tab-image').classList.contains('active')) return;
  const focused = document.activeElement;
  if (focused && (focused.tagName === 'INPUT' || focused.tagName === 'TEXTAREA') && focused.type !== 'file') return;

  const items = e.clipboardData?.items || [];
  for (const item of items) {
    if (item.type && item.type.startsWith('image/')) {
      const blob = item.getAsFile();
      if (!blob) continue;
      e.preventDefault();
      const buffer = await blob.arrayBuffer();
      const r = await window.api.saveClipboardImage({ buffer, mime: item.type });
      if (r.ok) loadBgImage(r.path);
      else alert('Impossible de coller l\'image : ' + r.error);
      return;
    }
  }
});

async function loadBgImage(path) {
  bgInputPath = path;
  const r = await window.api.fileToDataUrl(path);
  if (!r.ok) return alert('Erreur lecture image : ' + r.error);
  $('bgOriginal').src = r.dataUrl;
  $('bgResult').src = '';
  $('bgPreview').hidden = false;
  $('bgSave').hidden = true;
}

$('bgRemove').onclick = async () => {
  if (!bgInputPath) return alert('Choisis une image.');
  $('bgRemove').disabled = true;
  $('bgRemove').textContent = 'Traitement...';
  const r = await window.api.removeBackground({
    input: bgInputPath,
    outDir: $('bgOutDir').value,
    quality: $('bgQuality')?.value || 'medium'
  });
  $('bgRemove').disabled = false;
  $('bgRemove').textContent = 'Effacer le fond';
  if (r.ok) {
    bgResultPath = r.file;
    $('bgResult').src = r.dataUrl;
    $('bgSave').hidden = false;
  } else {
    alert('Erreur : ' + (r.error || 'inconnue'));
  }
};
$('bgSave').onclick = () => { if (bgResultPath) window.api.showInFolder(bgResultPath); };

// ============ Audio tab ============
document.querySelectorAll('input[name="audioMode"]').forEach((r) => {
  r.onchange = () => {
    $('audioTrimWrap').hidden = r.value !== 'trim' || !r.checked;
    $('audioNormWrap').hidden = r.value !== 'normalize' || !r.checked;
    $('audioFadeWrap').hidden = r.value !== 'crossfade' || !r.checked;
  };
});

const audioFilters = [{ name: 'Audio/Vidéo', extensions: ['mp3','wav','flac','m4a','aac','ogg','opus','mp4','mkv','webm','mov'] }];
$('pickAudio1').onclick = async () => { const r = await window.api.chooseFile(audioFilters); if (r) $('audioInput1').value = r; };
$('pickAudio2').onclick = async () => { const r = await window.api.chooseFile(audioFilters); if (r) $('audioInput2').value = r; };
$('pickFadeA').onclick = async () => { const r = await window.api.chooseFile(audioFilters); if (r) $('audioFadeA').value = r; };
$('pickFadeB').onclick = async () => { const r = await window.api.chooseFile(audioFilters); if (r) $('audioFadeB').value = r; };
$('pickAudioDir').onclick = async () => { const r = await window.api.chooseFolder(); if (r) $('audioOutDir').value = r; };

$('startAudio').onclick = async () => {
  const mode = document.querySelector('input[name="audioMode"]:checked').value;
  const dir = $('audioOutDir').value;
  const opts = { jobId: makeJobId(), mode, outDir: dir };

  if (mode === 'trim') {
    if (!$('audioInput1').value) return alert('Choisis un fichier.');
    opts.input = $('audioInput1').value;
    opts.silenceDb = $('silenceDb').value;
    opts.silenceMin = $('silenceMin').value;
  } else if (mode === 'normalize') {
    if (!$('audioInput2').value) return alert('Choisis un fichier.');
    opts.input = $('audioInput2').value;
    opts.lufs = $('lufsTarget').value;
  } else if (mode === 'crossfade') {
    if (!$('audioFadeA').value || !$('audioFadeB').value) return alert('Choisis 2 fichiers.');
    opts.inputA = $('audioFadeA').value;
    opts.inputB = $('audioFadeB').value;
    opts.fadeDuration = $('fadeDuration').value;
  }

  addJob(opts.jobId, `Audio · ${mode}`);
  const r = await window.api.processAudio(opts);
  finishJob(opts.jobId, r.ok, r.file);
  if (!r.ok && r.error) alert('Erreur : ' + r.error);
};

function updateJobsCount() {
  const count = document.querySelectorAll('.job').length;
  const doneCount = document.querySelectorAll('.job.done, .job.error').length;
  $('jobsCount').textContent = count > 0 ? count : '';
  $('jobsEmpty').hidden = count > 0;
  $('clearAllBtn').hidden = count === 0;
  $('clearDoneBtn').hidden = doneCount === 0;
}

$('clearAllBtn').onclick = () => {
  // Cancel any in-progress jobs first
  document.querySelectorAll('.job:not(.done):not(.error)').forEach((el) => {
    const cancel = el.querySelector('.cancel');
    if (cancel) cancel.click();
  });
  $('jobList').innerHTML = '';
  jobs.clear();
  updateJobsCount();
};

$('clearDoneBtn').onclick = () => {
  document.querySelectorAll('.job.done, .job.error').forEach((el) => {
    const id = el.id.replace('job-', '');
    jobs.delete(id);
    el.remove();
  });
  updateJobsCount();
};

// Initial empty-state render
updateJobsCount();

// ============ Download mode toggle (single / batch) ============
document.querySelectorAll('.dl-mode-btn').forEach((b) => {
  b.addEventListener('click', () => {
    document.querySelectorAll('.dl-mode-btn').forEach((x) => x.classList.remove('active'));
    b.classList.add('active');
    $('dlModeSingle').hidden = b.dataset.dlmode !== 'single';
    $('dlModeBatch').hidden = b.dataset.dlmode !== 'batch';
  });
});

(async () => { $('batchOutDir').value = await window.api.defaultDownloads(); })();
$('pickBatchDir').onclick = async () => { const r = await window.api.chooseFolder(); if (r) $('batchOutDir').value = r; };

const audioFormatsBatch = ['mp3', 'wav', 'flac', 'm4a', 'opus', 'aac'];

$('startBatch').onclick = async () => {
  const raw = $('batchUrls').value.split('\n').map(s => s.trim()).filter(s => s && !s.startsWith('#'));
  if (!raw.length) return alert('Aucune URL valide.');
  const urls = raw.filter(u => /^https?:\/\//.test(u));
  if (!urls.length) return alert('Aucune URL HTTP(S) valide.');

  const container = $('batchContainer').value;
  const quality = $('batchQuality').value;
  const concurrency = parseInt($('batchConcurrency').value, 10);
  const outDir = $('batchOutDir').value;
  const audioOnly = audioFormatsBatch.includes(container);

  const queue = [...urls];
  let active = 0;
  let done = 0;
  const total = urls.length;

  const masterId = makeJobId();
  addJob(masterId, `Queue · ${total} vidéos · ${container}`);

  function pump() {
    while (active < concurrency && queue.length) {
      const url = queue.shift();
      active++;
      const opts = {
        jobId: makeJobId(),
        url,
        outDir,
        container,
        quality,
        audioBitrate: '192',
        startTime: '',
        endTime: '',
        playlist: false
      };
      addJob(opts.jobId, `↳ ${url.slice(0, 60)}`);
      window.api.startDownload(opts).then((r) => {
        finishJob(opts.jobId, r.ok, r.file);
        active--;
        done++;
        updateJob(masterId, (done / total) * 100);
        if (done === total) finishJob(masterId, true, outDir);
        else pump();
      });
    }
  }
  pump();
};

// ============ Image sub-tabs ============
document.querySelectorAll('[data-imode]').forEach((t) => {
  t.addEventListener('click', () => {
    t.parentNode.querySelectorAll('[data-imode]').forEach((x) => x.classList.remove('active'));
    t.classList.add('active');
    ['bg','upscale','palette','ocr','compress','inpaint'].forEach((m) => {
      const el = $(`imode-${m}`);
      if (el) el.hidden = (t.dataset.imode !== m);
    });
  });
});

// PDF sub-tabs
document.querySelectorAll('[data-pdfmode]').forEach((t) => {
  t.addEventListener('click', () => {
    t.parentNode.querySelectorAll('[data-pdfmode]').forEach((x) => x.classList.remove('active'));
    t.classList.add('active');
    ['topng','frompng','merge','split','reorder'].forEach((m) => {
      const el = $(`pdfmode-${m}`);
      if (el) el.hidden = (t.dataset.pdfmode !== m);
    });
  });
});

// ============ Image: Upscaler ============
let upInputPath = null;
$('pickUpDir').onclick = async () => { const r = await window.api.chooseFolder(); if (r) $('upOutDir').value = r; };
$('upPickFile').onclick = async (e) => {
  e.preventDefault();
  const r = await window.api.chooseFile([{ name: 'Images', extensions: ['jpg','jpeg','png','webp'] }]);
  if (r) loadUpImage(r);
};
['dragover','dragleave','drop'].forEach(ev => {
  $('upDropzone').addEventListener(ev, (e) => {
    e.preventDefault();
    if (ev === 'dragover') $('upDropzone').classList.add('dragover');
    else $('upDropzone').classList.remove('dragover');
    if (ev === 'drop' && e.dataTransfer.files.length) {
      const f = e.dataTransfer.files[0];
      if (f.path) loadUpImage(f.path);
    }
  });
});
$('upDropzone').onclick = (e) => { if (e.target.tagName !== 'A') $('upFileInput').click(); };
$('upFileInput').onchange = (e) => { if (e.target.files[0]?.path) loadUpImage(e.target.files[0].path); };

function loadUpImage(p) {
  upInputPath = p;
  $('upInfo').hidden = false;
  $('upInfo').textContent = '✓ ' + p.split(/[\\/]/).pop();
}

(async () => { $('upOutDir').value = await window.api.defaultDownloads(); })();

$('upStart').onclick = async () => {
  if (!upInputPath) return alert('Choisis une image.');
  const opts = {
    jobId: makeJobId(),
    input: upInputPath,
    outDir: $('upOutDir').value,
    scale: $('upScale').value,
    model: $('upModel').value
  };
  addJob(opts.jobId, `Upscale ×${opts.scale} · ${upInputPath.split(/[\\/]/).pop()}`);
  const r = await window.api.upscaleImage(opts);
  finishJob(opts.jobId, r.ok, r.file);
  if (!r.ok && r.error) alert('Erreur : ' + r.error);
};

// ============ Image: Palette extractor ============
let palImgEl = null;

$('palPickFile').onclick = async (e) => {
  e.preventDefault();
  const r = await window.api.chooseFile([{ name: 'Images', extensions: ['jpg','jpeg','png','webp','bmp'] }]);
  if (r) extractPaletteFromPath(r);
};
['dragover','dragleave','drop'].forEach(ev => {
  $('palDropzone').addEventListener(ev, (e) => {
    e.preventDefault();
    if (ev === 'dragover') $('palDropzone').classList.add('dragover');
    else $('palDropzone').classList.remove('dragover');
    if (ev === 'drop' && e.dataTransfer.files.length) {
      const f = e.dataTransfer.files[0];
      if (f.path) extractPaletteFromPath(f.path);
    }
  });
});
$('palDropzone').onclick = (e) => { if (e.target.tagName !== 'A') $('palFileInput').click(); };
$('palFileInput').onchange = (e) => { if (e.target.files[0]?.path) extractPaletteFromPath(e.target.files[0].path); };

async function extractPaletteFromPath(p) {
  const r = await window.api.fileToDataUrl(p);
  if (!r.ok) return alert('Erreur : ' + r.error);
  extractPaletteFromDataUrl(r.dataUrl);
}

function extractPaletteFromDataUrl(dataUrl) {
  $('palOriginal').src = dataUrl;
  const img = new Image();
  img.onload = () => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const max = 200;
    const scale = Math.min(1, max / Math.max(img.width, img.height));
    canvas.width = Math.round(img.width * scale);
    canvas.height = Math.round(img.height * scale);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    const colors = quantizeColors(data, 5);
    renderPalette(colors);
    $('paletteResult').hidden = false;
  };
  img.src = dataUrl;
}

// Median-cut color quantization (small, fast, good results)
function quantizeColors(data, n) {
  const pixels = [];
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] < 125) continue;
    pixels.push([data[i], data[i + 1], data[i + 2]]);
  }
  if (!pixels.length) return [];

  function bucketRange(bucket) {
    const r = [255, 0], g = [255, 0], b = [255, 0];
    for (const p of bucket) {
      if (p[0] < r[0]) r[0] = p[0]; if (p[0] > r[1]) r[1] = p[0];
      if (p[1] < g[0]) g[0] = p[1]; if (p[1] > g[1]) g[1] = p[1];
      if (p[2] < b[0]) b[0] = p[2]; if (p[2] > b[1]) b[1] = p[2];
    }
    return { r: r[1] - r[0], g: g[1] - g[0], b: b[1] - b[0] };
  }

  let buckets = [pixels];
  while (buckets.length < n) {
    let maxIdx = 0, maxRange = -1, maxChan = 0;
    for (let i = 0; i < buckets.length; i++) {
      const r = bucketRange(buckets[i]);
      const local = Math.max(r.r, r.g, r.b);
      if (local > maxRange) {
        maxRange = local; maxIdx = i;
        maxChan = r.r === local ? 0 : r.g === local ? 1 : 2;
      }
    }
    if (maxRange <= 0) break;
    const bucket = buckets[maxIdx].slice().sort((a, b) => a[maxChan] - b[maxChan]);
    const half = Math.floor(bucket.length / 2);
    buckets.splice(maxIdx, 1, bucket.slice(0, half), bucket.slice(half));
  }

  return buckets.map((bucket) => {
    let r = 0, g = 0, b = 0;
    for (const p of bucket) { r += p[0]; g += p[1]; b += p[2]; }
    return [Math.round(r / bucket.length), Math.round(g / bucket.length), Math.round(b / bucket.length)];
  }).sort((a, b) => luma(b) - luma(a));
}
function luma([r, g, b]) { return 0.299 * r + 0.587 * g + 0.114 * b; }
function rgbToHex(r, g, b) { return '#' + [r, g, b].map((n) => n.toString(16).padStart(2, '0')).join('').toUpperCase(); }
function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h, s, l = (max + min) / 2;
  if (max === min) { h = s = 0; }
  else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }
  return [Math.round(h * 360), Math.round(s * 100), Math.round(l * 100)];
}
function rgbToCmyk(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const k = 1 - Math.max(r, g, b);
  if (k === 1) return [0, 0, 0, 100];
  const c = (1 - r - k) / (1 - k);
  const m = (1 - g - k) / (1 - k);
  const y = (1 - b - k) / (1 - k);
  return [Math.round(c * 100), Math.round(m * 100), Math.round(y * 100), Math.round(k * 100)];
}

function renderPalette(colors) {
  const wrap = $('palSwatches');
  wrap.innerHTML = '';
  for (const [r, g, b] of colors) {
    const hex = rgbToHex(r, g, b);
    const [h, s, l] = rgbToHsl(r, g, b);
    const [c, m, y, k] = rgbToCmyk(r, g, b);
    const div = document.createElement('div');
    div.className = 'swatch';
    div.innerHTML = `
      <div class="swatch-color" style="background:${hex}" title="Cliquer pour copier ${hex}"></div>
      <div class="swatch-codes">
        <div><b>${hex}</b></div>
        <div>rgb(${r}, ${g}, ${b})</div>
        <div>hsl(${h}, ${s}%, ${l}%)</div>
        <div>cmyk(${c}%, ${m}%, ${y}%, ${k}%)</div>
      </div>
      <button class="btn small">Copier HEX</button>
    `;
    div.querySelector('.swatch-color').onclick = () => { window.api.copyToClipboard(hex); flashCopied(div); };
    div.querySelector('button').onclick = () => { window.api.copyToClipboard(hex); flashCopied(div); };
    wrap.appendChild(div);
  }
}

function flashCopied(el) {
  const original = el.querySelector('button')?.textContent;
  const btn = el.querySelector('button');
  if (btn) {
    btn.textContent = '✓ Copié';
    btn.style.color = 'var(--success)';
    setTimeout(() => { btn.textContent = original; btn.style.color = ''; }, 1200);
  }
}

// Paste support for palette + OCR
document.addEventListener('paste', async (e) => {
  if (!$('tab-image').classList.contains('active')) return;
  const focused = document.activeElement;
  if (focused && focused.tagName === 'TEXTAREA') return;
  const items = e.clipboardData?.items || [];
  for (const item of items) {
    if (item.type && item.type.startsWith('image/')) {
      const blob = item.getAsFile();
      if (!blob) continue;
      e.preventDefault();
      const buffer = await blob.arrayBuffer();
      const r = await window.api.saveClipboardImage({ buffer, mime: item.type });
      if (!r.ok) return alert('Impossible : ' + r.error);
      const activeMode = document.querySelector('.mode-tab.active')?.dataset.imode;
      if (activeMode === 'palette') extractPaletteFromPath(r.path);
      else if (activeMode === 'ocr') runOcr(r.path);
      return;
    }
  }
});

// ============ Image: OCR ============
$('ocrPickFile').onclick = async (e) => {
  e.preventDefault();
  const r = await window.api.chooseFile([{ name: 'Images', extensions: ['jpg','jpeg','png','webp','bmp','tiff'] }]);
  if (r) runOcr(r);
};
['dragover','dragleave','drop'].forEach(ev => {
  $('ocrDropzone').addEventListener(ev, (e) => {
    e.preventDefault();
    if (ev === 'dragover') $('ocrDropzone').classList.add('dragover');
    else $('ocrDropzone').classList.remove('dragover');
    if (ev === 'drop' && e.dataTransfer.files.length) {
      const f = e.dataTransfer.files[0];
      if (f.path) runOcr(f.path);
    }
  });
});
$('ocrDropzone').onclick = (e) => { if (e.target.tagName !== 'A') $('ocrFileInput').click(); };
$('ocrFileInput').onchange = (e) => { if (e.target.files[0]?.path) runOcr(e.target.files[0].path); };

window.api.onOcrProgress(({ status, progress }) => {
  const el = $('ocrProgress');
  el.hidden = false;
  el.textContent = progress != null ? `${status}… ${progress}%` : status;
});

async function runOcr(path) {
  $('ocrProgress').hidden = false;
  $('ocrProgress').textContent = 'Démarrage de Tesseract…';
  $('ocrResult').hidden = true;
  const r = await window.api.ocrImage({ input: path });
  $('ocrProgress').hidden = true;
  if (!r.ok) return alert('Erreur OCR : ' + r.error);
  $('ocrText').value = r.text || '(aucun texte détecté)';
  $('ocrResult').hidden = false;
}
$('ocrCopy').onclick = async () => {
  await window.api.copyToClipboard($('ocrText').value);
  $('ocrCopy').textContent = '✓ Copié';
  setTimeout(() => { $('ocrCopy').textContent = 'Copier le texte'; }, 1200);
};
$('ocrSave').onclick = async () => {
  await window.api.saveTextFile({ content: $('ocrText').value, defaultName: 'extracted.txt' });
};

// ============ Audio: Subtitles mode ============
const _origAudioModeHandler = document.querySelectorAll('input[name="audioMode"]');
_origAudioModeHandler.forEach((r) => {
  r.addEventListener('change', () => {
    $('audioSubsWrap').hidden = r.value !== 'subtitles' || !r.checked;
  });
});
$('pickSubs').onclick = async () => {
  const r = await window.api.chooseFile([{ name: 'Audio/Vidéo', extensions: ['mp3','wav','flac','m4a','aac','ogg','opus','mp4','mkv','webm','mov'] }]);
  if (r) $('subsInput').value = r;
};

// Patch the existing startAudio handler to add the subtitles branch
const _startAudio = $('startAudio');
const _newStartAudio = _startAudio.cloneNode(true);
_startAudio.parentNode.replaceChild(_newStartAudio, _startAudio);
_newStartAudio.onclick = async () => {
  const mode = document.querySelector('input[name="audioMode"]:checked').value;
  const dir = $('audioOutDir').value;
  const opts = { jobId: makeJobId(), mode, outDir: dir };

  if (mode === 'trim') {
    if (!$('audioInput1').value) return alert('Choisis un fichier.');
    opts.input = $('audioInput1').value;
    opts.silenceDb = $('silenceDb').value;
    opts.silenceMin = $('silenceMin').value;
  } else if (mode === 'normalize') {
    if (!$('audioInput2').value) return alert('Choisis un fichier.');
    opts.input = $('audioInput2').value;
    opts.lufs = $('lufsTarget').value;
  } else if (mode === 'crossfade') {
    if (!$('audioFadeA').value || !$('audioFadeB').value) return alert('Choisis 2 fichiers.');
    opts.inputA = $('audioFadeA').value;
    opts.inputB = $('audioFadeB').value;
    opts.fadeDuration = $('fadeDuration').value;
  } else if (mode === 'subtitles') {
    if (!$('subsInput').value) return alert('Choisis un fichier.');
    addJob(opts.jobId, `Sous-titres · ${$('subsInput').value.split(/[\\/]/).pop()}`);
    const r = await window.api.transcribeAudio({
      jobId: opts.jobId,
      input: $('subsInput').value,
      lang: $('subsLang').value,
      model: $('subsModel').value,
      format: $('subsFormat').value,
      outDir: dir
    });
    finishJob(opts.jobId, r.ok, r.file);
    if (!r.ok && r.error) alert('Erreur : ' + r.error);
    return;
  }

  addJob(opts.jobId, `Audio · ${mode}`);
  const r = await window.api.processAudio(opts);
  finishJob(opts.jobId, r.ok, r.file);
  if (!r.ok && r.error) alert('Erreur : ' + r.error);
};

window.api.onTranscribeProgress(({ jobId, stage }) => {
  const el = jobs.get(jobId);
  if (el) el.querySelector('.status').textContent = stage === 'transcribing' ? 'Transcription…' : stage;
});

// ============ Image: Compression batch ============
const cmpFiles = [];

(async () => { $('cmpOutDir').value = await window.api.defaultDownloads(); })();
$('pickCmpDir').onclick = async () => { const r = await window.api.chooseFolder(); if (r) $('cmpOutDir').value = r; };

['dragover','dragleave','drop'].forEach(ev => {
  $('cmpDropzone').addEventListener(ev, async (e) => {
    e.preventDefault();
    if (ev === 'dragover') $('cmpDropzone').classList.add('dragover');
    else $('cmpDropzone').classList.remove('dragover');
    if (ev === 'drop' && e.dataTransfer.files.length) {
      for (const f of e.dataTransfer.files) {
        if (f.path && f.type.startsWith('image/')) addCompressFile(f.path);
      }
    }
  });
});
$('cmpPickFile').onclick = async (e) => {
  e.preventDefault();
  const r = await window.api.chooseFile([{ name: 'Images', extensions: ['jpg','jpeg','png','webp','heic','heif','tiff','avif'] }]);
  if (r) addCompressFile(r);
};
$('cmpDropzone').onclick = (e) => { if (e.target.tagName !== 'A') $('cmpFileInput').click(); };
$('cmpFileInput').onchange = (e) => {
  for (const f of e.target.files) if (f.path) addCompressFile(f.path);
};

async function addCompressFile(p) {
  if (cmpFiles.includes(p)) return;
  cmpFiles.push(p);
  renderCmpList();
  // Auto-process on add
  const jobId = makeJobId();
  const name = p.split(/[\\/]/).pop();
  addJob(jobId, `Compression · ${name}`);
  const r = await window.api.compressImage({
    input: p,
    outDir: $('cmpOutDir').value,
    format: $('cmpFormat').value,
    quality: $('cmpQuality').value,
    maxWidth: $('cmpMaxWidth').value
  });
  if (r.ok) {
    finishJob(jobId, true, r.file);
    const idx = cmpFiles.indexOf(p);
    const row = document.querySelectorAll('#cmpFileList .cmp-row')[idx];
    if (row) row.querySelector('.cmp-result').textContent = `${formatBytes(r.inSize)} → ${formatBytes(r.outSize)} (-${r.savedPct}%)`;
  } else {
    finishJob(jobId, false);
  }
}

function renderCmpList() {
  const wrap = $('cmpFileList');
  wrap.innerHTML = '';
  cmpFiles.forEach((p, i) => {
    const row = document.createElement('div');
    row.className = 'cmp-row';
    row.innerHTML = `<span class="cmp-name">${escapeHtml(p.split(/[\\/]/).pop())}</span><span class="cmp-result muted">…</span>`;
    wrap.appendChild(row);
  });
}

function formatBytes(b) {
  if (b < 1024) return b + ' B';
  if (b < 1024 * 1024) return (b / 1024).toFixed(1) + ' KB';
  return (b / 1024 / 1024).toFixed(2) + ' MB';
}

// ============ Image: Inpainting (object removal) ============
let ipImage = null;
let ipBrushSize = 30;
let ipDrawing = false;
let ipMaskHistory = [];

$('ipDropzone').onclick = () => $('ipFileInput').click();
$('ipFileInput').onchange = async (e) => {
  if (e.target.files[0]?.path) loadInpaintImage(e.target.files[0].path);
};

async function loadInpaintImage(p) {
  ipImage = p;
  const r = await window.api.fileToDataUrl(p);
  if (!r.ok) return alert('Erreur : ' + r.error);

  const img = new Image();
  img.onload = () => {
    const canvas = $('ipCanvas');
    const mask = $('ipMaskCanvas');
    const maxW = 800;
    const scale = Math.min(1, maxW / img.naturalWidth);
    canvas.width = mask.width = img.naturalWidth * scale;
    canvas.height = mask.height = img.naturalHeight * scale;
    canvas._origWidth = img.naturalWidth;
    canvas._origHeight = img.naturalHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    canvas._fullImg = img;
    $('ipEditor').hidden = false;
    ipMaskHistory = [];
  };
  img.src = r.dataUrl;
}

$('ipBrushSize').oninput = (e) => {
  ipBrushSize = +e.target.value;
  $('ipBrushSizeLbl').textContent = ipBrushSize + ' px';
};

(function setupIpaintDrawing() {
  const mask = $('ipMaskCanvas');
  if (!mask) return;
  mask.addEventListener('pointerdown', (e) => {
    ipDrawing = true;
    ipMaskHistory.push(mask.getContext('2d').getImageData(0, 0, mask.width, mask.height));
    drawMaskAt(e);
  });
  window.addEventListener('pointermove', (e) => { if (ipDrawing) drawMaskAt(e); });
  window.addEventListener('pointerup', () => { ipDrawing = false; });
})();

function drawMaskAt(e) {
  const mask = $('ipMaskCanvas');
  const rect = mask.getBoundingClientRect();
  const x = (e.clientX - rect.left) * mask.width / rect.width;
  const y = (e.clientY - rect.top) * mask.height / rect.height;
  const ctx = mask.getContext('2d');
  ctx.fillStyle = 'rgba(255, 122, 26, 0.55)';
  ctx.beginPath();
  ctx.arc(x, y, ipBrushSize / 2, 0, Math.PI * 2);
  ctx.fill();
}

$('ipClear').onclick = () => {
  const m = $('ipMaskCanvas');
  m.getContext('2d').clearRect(0, 0, m.width, m.height);
  ipMaskHistory = [];
};
$('ipUndo').onclick = () => {
  const last = ipMaskHistory.pop();
  if (!last) return;
  $('ipMaskCanvas').getContext('2d').putImageData(last, 0, 0);
};

$('ipRun').onclick = async () => {
  if (!ipImage) return;
  const srcCanvas = $('ipCanvas');
  const maskCanvas = $('ipMaskCanvas');

  $('ipRun').disabled = true;
  $('ipRun').textContent = 'Traitement…';
  await new Promise((r) => setTimeout(r, 30));

  try {
    const w = srcCanvas.width, h = srcCanvas.height;
    const srcCtx = srcCanvas.getContext('2d');
    const maskCtx = maskCanvas.getContext('2d');
    const imageData = srcCtx.getImageData(0, 0, w, h);
    const maskData = maskCtx.getImageData(0, 0, w, h);
    const jobId = makeJobId();
    addJob(jobId, `Inpaint · ${ipImage.split(/[\\/]/).pop()}`);
    const result = await jsInpaintAsync(imageData, maskData, w, h, (p) => updateJob(jobId, p));
    srcCtx.putImageData(result, 0, 0);
    maskCtx.clearRect(0, 0, w, h);
    finishJob(jobId, true);

    const dataUrl = srcCanvas.toDataURL('image/png');
    const r = await window.api.inpaintImage({
      dataUrl, originalPath: ipImage,
      outDir: await window.api.defaultDownloads()
    });
    $('ipRun').disabled = false;
    $('ipRun').textContent = 'Effacer les zones brossées';
    if (r.ok) {
      toast('Image enregistrée', 'success');
    } else {
      showError(r.error, 'Inpainting');
    }
  } catch (e) {
    $('ipRun').disabled = false;
    $('ipRun').textContent = 'Effacer les zones brossées';
    showError(e.message, 'Inpainting');
  }
};

// Pure-JS inpainting — iterative boundary-fill with distance-weighted neighbors.
// Yields control to the UI between iterations to avoid freezing on large images.
async function jsInpaintAsync(imageData, maskData, w, h, onProgress) {
  const out = new Uint8ClampedArray(imageData.data);
  const mask = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) {
    mask[i] = maskData.data[i * 4 + 3] > 30 ? 1 : 0;
  }
  if (!mask.some((v) => v)) return imageData;

  const radius = 2;
  const maxPasses = 200;
  const totalMasked = mask.reduce((a, b) => a + b, 0);
  let totalFilled = 0;

  for (let pass = 0; pass < maxPasses; pass++) {
    let filled = 0;
    const next = new Uint8Array(mask);

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const idx = y * w + x;
        if (!mask[idx]) continue;
        let sumR = 0, sumG = 0, sumB = 0, sumW = 0;
        for (let dy = -radius; dy <= radius; dy++) {
          for (let dx = -radius; dx <= radius; dx++) {
            if (dx === 0 && dy === 0) continue;
            const nx = x + dx, ny = y + dy;
            if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
            const nIdx = ny * w + nx;
            if (mask[nIdx]) continue;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const wt = 1 / (dist + 0.5);
            const o = nIdx * 4;
            sumR += out[o] * wt;
            sumG += out[o + 1] * wt;
            sumB += out[o + 2] * wt;
            sumW += wt;
          }
        }
        if (sumW > 0) {
          const o = idx * 4;
          out[o] = sumR / sumW;
          out[o + 1] = sumG / sumW;
          out[o + 2] = sumB / sumW;
          out[o + 3] = 255;
          next[idx] = 0;
          filled++;
        }
      }
    }
    if (filled === 0) break;
    for (let i = 0; i < mask.length; i++) mask[i] = next[i];
    totalFilled += filled;

    // Yield to the UI every pass so the renderer doesn't freeze on big images
    if (onProgress) onProgress(Math.min(99, (totalFilled / totalMasked) * 100));
    await new Promise((r) => setTimeout(r, 0));
  }

  return new ImageData(out, w, h);
}

// Pure-JS inpainting (legacy sync, kept for compat) — iterative boundary-fill.
function jsInpaint(imageData, maskData, w, h) {
  const out = new Uint8ClampedArray(imageData.data);
  // Build mask: any painted pixel (alpha > 30) = "to fill"
  const mask = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) {
    mask[i] = maskData.data[i * 4 + 3] > 30 ? 1 : 0;
  }
  if (!mask.some((v) => v)) return imageData; // nothing to fill

  // Slight blur source pixels around mask boundary for smoother blending
  const radius = 2;
  const maxPasses = 200;

  for (let pass = 0; pass < maxPasses; pass++) {
    let filled = 0;
    const next = new Uint8Array(mask);

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const idx = y * w + x;
        if (!mask[idx]) continue;
        // Sample non-masked neighbors with distance weighting
        let sumR = 0, sumG = 0, sumB = 0, sumW = 0;
        for (let dy = -radius; dy <= radius; dy++) {
          for (let dx = -radius; dx <= radius; dx++) {
            if (dx === 0 && dy === 0) continue;
            const nx = x + dx, ny = y + dy;
            if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
            const nIdx = ny * w + nx;
            if (mask[nIdx]) continue;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const wt = 1 / (dist + 0.5);
            const o = nIdx * 4;
            sumR += out[o] * wt;
            sumG += out[o + 1] * wt;
            sumB += out[o + 2] * wt;
            sumW += wt;
          }
        }
        if (sumW > 0) {
          const o = idx * 4;
          out[o] = sumR / sumW;
          out[o + 1] = sumG / sumW;
          out[o + 2] = sumB / sumW;
          out[o + 3] = 255;
          next[idx] = 0;
          filled++;
        }
      }
    }
    if (filled === 0) break;
    for (let i = 0; i < mask.length; i++) mask[i] = next[i];
  }

  return new ImageData(out, w, h);
}

// ============ PDF tools ============
(async () => {
  const dl = await window.api.defaultDownloads();
  $('pdfTopngOutDir').value = dl;
  $('pdfSplitOutDir').value = dl;
})();

$('pickPdfTopng').onclick = async () => { const r = await window.api.chooseFile([{ name: 'PDF', extensions: ['pdf'] }]); if (r) $('pdfTopngInput').value = r; };
$('pickPdfTopngDir').onclick = async () => { const r = await window.api.chooseFolder(); if (r) $('pdfTopngOutDir').value = r; };
$('pickPdfSplit').onclick = async () => { const r = await window.api.chooseFile([{ name: 'PDF', extensions: ['pdf'] }]); if (r) $('pdfSplitInput').value = r; };
$('pickPdfSplitDir').onclick = async () => { const r = await window.api.chooseFolder(); if (r) $('pdfSplitOutDir').value = r; };
$('pickPdfReorder').onclick = async () => {
  const r = await window.api.chooseFile([{ name: 'PDF', extensions: ['pdf'] }]);
  if (!r) return;
  $('pdfReorderInput').value = r;
  await loadPdfThumbnails(r);
};

let pdfReorderState = { input: null, items: [] };

async function loadPdfThumbnails(input) {
  $('pdfReorderLoading').hidden = false;
  $('pdfReorderLoading').textContent = 'Chargement des miniatures…';
  $('pdfReorderGrid').innerHTML = '';
  $('pdfReorderActions').hidden = true;

  const r = await window.api.pdfThumbnails(input);
  $('pdfReorderLoading').hidden = true;
  if (!r.ok) return alert('Erreur : ' + r.error);

  pdfReorderState = {
    input,
    items: r.thumbs.map((t) => ({ page: t.page, dataUrl: t.dataUrl, deleted: false }))
  };
  renderPdfReorderGrid();
  $('pdfReorderActions').hidden = false;
  updatePdfReorderStatus();
}

function renderPdfReorderGrid() {
  const grid = $('pdfReorderGrid');
  grid.innerHTML = '';
  pdfReorderState.items.forEach((item, idx) => {
    const div = document.createElement('div');
    div.className = 'pdf-thumb' + (item.deleted ? ' deleted' : '');
    div.draggable = true;
    div.dataset.idx = idx;
    const newPos = pdfReorderState.items.filter((it, i) => !it.deleted && i <= idx).length;
    div.innerHTML = `
      <span class="pdf-thumb-num ${item.page !== idx + 1 ? 'changed' : ''}">${item.deleted ? '×' : newPos} ← p.${item.page}</span>
      <img src="${item.dataUrl}" />
      <div class="pdf-thumb-actions">
        <button class="pdf-thumb-btn" data-idx="${idx}" title="${item.deleted ? 'Restaurer' : 'Supprimer'}">
          ${item.deleted
            ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>'
            : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/></svg>'}
        </button>
      </div>
    `;
    div.querySelector('.pdf-thumb-btn').onclick = (e) => {
      e.stopPropagation();
      pdfReorderState.items[idx].deleted = !pdfReorderState.items[idx].deleted;
      renderPdfReorderGrid();
      updatePdfReorderStatus();
    };

    // Drag & drop
    div.addEventListener('dragstart', (e) => {
      div.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', String(idx));
    });
    div.addEventListener('dragend', () => {
      div.classList.remove('dragging');
      grid.querySelectorAll('.pdf-thumb').forEach((t) => {
        t.classList.remove('drop-before', 'drop-after');
      });
    });
    div.addEventListener('dragover', (e) => {
      e.preventDefault();
      const rect = div.getBoundingClientRect();
      const before = e.clientX < rect.left + rect.width / 2;
      grid.querySelectorAll('.pdf-thumb').forEach((t) => t.classList.remove('drop-before', 'drop-after'));
      div.classList.add(before ? 'drop-before' : 'drop-after');
    });
    div.addEventListener('drop', (e) => {
      e.preventDefault();
      const fromIdx = parseInt(e.dataTransfer.getData('text/plain'), 10);
      const toIdx = parseInt(div.dataset.idx, 10);
      if (fromIdx === toIdx) return;
      const rect = div.getBoundingClientRect();
      const before = e.clientX < rect.left + rect.width / 2;
      const targetIdx = before ? toIdx : toIdx + 1;
      const adjustedTarget = targetIdx > fromIdx ? targetIdx - 1 : targetIdx;
      const [moved] = pdfReorderState.items.splice(fromIdx, 1);
      pdfReorderState.items.splice(adjustedTarget, 0, moved);
      renderPdfReorderGrid();
      updatePdfReorderStatus();
    });

    grid.appendChild(div);
  });
}

function updatePdfReorderStatus() {
  const total = pdfReorderState.items.length;
  const kept = pdfReorderState.items.filter((it) => !it.deleted).length;
  const deleted = total - kept;
  $('pdfReorderStatus').textContent =
    `${kept} page${kept > 1 ? 's' : ''} conservée${kept > 1 ? 's' : ''}` +
    (deleted ? ` · ${deleted} supprimée${deleted > 1 ? 's' : ''}` : '');
}

$('pdfReorderReset').onclick = () => {
  if (!pdfReorderState.input) return;
  pdfReorderState.items.sort((a, b) => a.page - b.page);
  pdfReorderState.items.forEach((it) => (it.deleted = false));
  renderPdfReorderGrid();
  updatePdfReorderStatus();
};

$('runPdfTopng').onclick = async () => {
  if (!$('pdfTopngInput').value) return alert('Choisis un PDF.');
  const jobId = makeJobId();
  addJob(jobId, `PDF → ${$('pdfTopngFmt').value.toUpperCase()}`);
  const r = await window.api.pdfToImages({
    input: $('pdfTopngInput').value,
    outDir: $('pdfTopngOutDir').value,
    format: $('pdfTopngFmt').value,
    dpi: $('pdfTopngDpi').value
  });
  finishJob(jobId, r.ok, r.dir);
  if (!r.ok) alert('Erreur : ' + r.error);
};

const pdfFrompngList = [];
$('pdfFrompngBrowse').onclick = (e) => { e.preventDefault(); $('pdfFrompngFiles').click(); };
$('pdfFrompngFiles').onchange = (e) => { for (const f of e.target.files) if (f.path) addFrompng(f.path); };
['dragover','dragleave','drop'].forEach(ev => {
  $('pdfFrompngDrop').addEventListener(ev, (e) => {
    e.preventDefault();
    if (ev === 'dragover') $('pdfFrompngDrop').classList.add('dragover');
    else $('pdfFrompngDrop').classList.remove('dragover');
    if (ev === 'drop' && e.dataTransfer.files.length) {
      for (const f of e.dataTransfer.files) if (f.path && f.type.startsWith('image/')) addFrompng(f.path);
    }
  });
});
function addFrompng(p) {
  pdfFrompngList.push(p);
  const div = document.createElement('div');
  div.className = 'cmp-row';
  div.innerHTML = `<span class="cmp-name">${escapeHtml(p.split(/[\\/]/).pop())}</span>`;
  $('pdfFrompngList').appendChild(div);
}
$('runPdfFrompng').onclick = async () => {
  if (!pdfFrompngList.length) return alert('Aucune image.');
  const dir = await window.api.defaultDownloads();
  const outPath = `${dir}\\images_combined_${Date.now()}.pdf`;
  const jobId = makeJobId();
  addJob(jobId, `Images → PDF (${pdfFrompngList.length})`);
  const r = await window.api.imagesToPdf({ inputs: pdfFrompngList, outPath });
  finishJob(jobId, r.ok, r.file);
  if (!r.ok) alert('Erreur : ' + r.error);
  else { pdfFrompngList.length = 0; $('pdfFrompngList').innerHTML = ''; }
};

const pdfMergeList = [];
$('pdfMergeBrowse').onclick = (e) => { e.preventDefault(); $('pdfMergeFiles').click(); };
$('pdfMergeFiles').onchange = (e) => { for (const f of e.target.files) if (f.path) addMergePdf(f.path); };
['dragover','dragleave','drop'].forEach(ev => {
  $('pdfMergeDrop').addEventListener(ev, (e) => {
    e.preventDefault();
    if (ev === 'dragover') $('pdfMergeDrop').classList.add('dragover');
    else $('pdfMergeDrop').classList.remove('dragover');
    if (ev === 'drop' && e.dataTransfer.files.length) {
      for (const f of e.dataTransfer.files) if (f.path && f.name.endsWith('.pdf')) addMergePdf(f.path);
    }
  });
});
function addMergePdf(p) {
  pdfMergeList.push(p);
  const div = document.createElement('div');
  div.className = 'cmp-row';
  div.innerHTML = `<span class="cmp-name">${escapeHtml(p.split(/[\\/]/).pop())}</span>`;
  $('pdfMergeList').appendChild(div);
}
$('runPdfMerge').onclick = async () => {
  if (pdfMergeList.length < 2) return alert('Il faut au moins 2 PDF.');
  const dir = await window.api.defaultDownloads();
  const outPath = `${dir}\\merged_${Date.now()}.pdf`;
  const jobId = makeJobId();
  addJob(jobId, `Fusion PDF (${pdfMergeList.length})`);
  const r = await window.api.pdfMerge({ inputs: pdfMergeList, outPath });
  finishJob(jobId, r.ok, r.file);
  if (!r.ok) alert('Erreur : ' + r.error);
  else { pdfMergeList.length = 0; $('pdfMergeList').innerHTML = ''; }
};

$('runPdfSplit').onclick = async () => {
  if (!$('pdfSplitInput').value) return alert('Choisis un PDF.');
  const ranges = $('pdfSplitRanges').value.split(',').map(s => s.trim()).filter(Boolean).map(s => {
    const m = s.match(/(\d+)\s*-\s*(\d+)/);
    return m ? { start: +m[1], end: +m[2] } : null;
  }).filter(Boolean);
  if (!ranges.length) return alert('Plages invalides. Format : 1-3, 4-7');
  const jobId = makeJobId();
  addJob(jobId, `Diviser PDF en ${ranges.length} parts`);
  const r = await window.api.pdfSplit({ input: $('pdfSplitInput').value, outDir: $('pdfSplitOutDir').value, ranges });
  finishJob(jobId, r.ok, r.files?.[0]);
  if (!r.ok) alert('Erreur : ' + r.error);
};

$('runPdfReorder').onclick = async () => {
  if (!pdfReorderState.input) return alert('Choisis un PDF.');
  const order = pdfReorderState.items.filter((it) => !it.deleted).map((it) => it.page);
  if (!order.length) return alert('Toutes les pages sont supprimées.');
  const dir = await window.api.defaultDownloads();
  const outPath = `${dir}\\reordered_${Date.now()}.pdf`;
  const jobId = makeJobId();
  addJob(jobId, `Réorganiser PDF (${order.length} pages)`);
  const r = await window.api.pdfReorder({ input: pdfReorderState.input, outPath, order });
  finishJob(jobId, r.ok, r.file);
  if (!r.ok) alert('Erreur : ' + r.error);
};

// ============ Audio: Audiogramme + Summary ============
$('pickAudiogramAudio').onclick = async () => {
  const r = await window.api.chooseFile([{ name: 'Audio', extensions: ['mp3','wav','m4a','flac','aac','ogg','opus'] }]);
  if (r) $('audiogramAudio').value = r;
};
$('pickAudiogramCover').onclick = async () => {
  const r = await window.api.chooseFile([{ name: 'Image', extensions: ['jpg','jpeg','png','webp'] }]);
  if (r) $('audiogramCover').value = r;
};

document.querySelectorAll('input[name="audioMode"]').forEach((r) => {
  r.addEventListener('change', () => {
    $('audioAudiogramWrap').hidden = r.value !== 'audiogram' || !r.checked;
    $('audioSummaryWrap').hidden = r.value !== 'summary' || !r.checked;
    if (r.value === 'summary' && r.checked) checkOllama();
  });
});

async function checkOllama() {
  const el = $('ollamaStatus');
  el.textContent = 'Vérification d\'Ollama…';
  const r = await window.api.ollamaStatus();
  if (r.ok) {
    el.innerHTML = `✓ Ollama actif. Modèles : <code>${(r.models || []).slice(0, 5).join(', ') || '(aucun)'}</code>`;
    el.style.color = 'var(--success)';
  } else {
    el.innerHTML = '⚠ Ollama non détecté. Installe-le sur <a href="https://ollama.com" target="_blank">ollama.com</a> puis lance <code>ollama pull llama3.2</code>';
    el.style.color = 'var(--warning)';
  }
}

// Hook into the audio start button (extend the cloned handler from earlier)
const _audioStartOriginal = _newStartAudio.onclick;
_newStartAudio.onclick = async () => {
  const mode = document.querySelector('input[name="audioMode"]:checked').value;
  const dir = $('audioOutDir').value;

  if (mode === 'audiogram') {
    if (!$('audiogramAudio').value) return alert('Choisis un fichier audio.');
    const jobId = makeJobId();
    addJob(jobId, `Audiogramme · ${$('audiogramAudio').value.split(/[\\/]/).pop()}`);
    const r = await window.api.audiogram({
      jobId,
      audioInput: $('audiogramAudio').value,
      coverInput: $('audiogramCover').value || null,
      outDir: dir,
      size: $('audiogramSize').value,
      color: $('audiogramColor').value,
      withSubs: $('audiogramSubs').checked,
      lang: 'auto'
    });
    finishJob(jobId, r.ok, r.file);
    if (!r.ok && r.error) alert('Erreur : ' + r.error);
    return;
  }

  if (mode === 'summary') {
    if (!$('summaryUrl').value) return alert('Saisis une URL YouTube.');
    const jobId = makeJobId();
    addJob(jobId, `Résumé YouTube`);
    $('summaryOutput').value = 'En cours… (téléchargement audio + transcription + génération)';
    const r = await window.api.summarizeYoutube({
      jobId,
      url: $('summaryUrl').value,
      model: $('summaryModel').value,
      style: $('summaryStyle').value,
      language: $('summaryLang').value
    });
    finishJob(jobId, r.ok);
    if (r.ok) {
      $('summaryOutput').value = r.summary;
    } else {
      $('summaryOutput').value = 'Erreur : ' + r.error;
    }
    return;
  }

  // Fallback to original handler for other modes
  _audioStartOriginal();
};

$('copySummary').onclick = async () => {
  await window.api.copyToClipboard($('summaryOutput').value);
  $('copySummary').textContent = '✓ Copié';
  setTimeout(() => { $('copySummary').textContent = 'Copier le résumé'; }, 1200);
};
$('saveSummary').onclick = async () => {
  await window.api.saveTextFile({ content: $('summaryOutput').value, defaultName: 'resume.txt' });
};

// ============ Color Picker (global pipette) ============
const pickerHistory = [];

$('startPicker').onclick = async () => {
  const r = await window.api.pickColor();
  if (r.canceled) return;
  if (!r.ok) return alert('Erreur : ' + (r.error || 'inconnue'));
  applyPickedColor(r.r, r.g, r.b);
};

function applyPickedColor(r, g, b) {
  const hex = rgbToHex(r, g, b);
  const [h, s, l] = rgbToHsl(r, g, b);
  const [c, m, y, k] = rgbToCmyk(r, g, b);
  $('pickerPreview').style.background = hex;
  $('codeHex').textContent = hex;
  $('codeRgb').textContent = `rgb(${r}, ${g}, ${b})`;
  $('codeHsl').textContent = `hsl(${h}, ${s}%, ${l}%)`;
  $('codeCmyk').textContent = `cmyk(${c}%, ${m}%, ${y}%, ${k}%)`;

  if (!pickerHistory.includes(hex)) {
    pickerHistory.unshift(hex);
    if (pickerHistory.length > 16) pickerHistory.pop();
    renderPickerHistory();
  }
}

function renderPickerHistory() {
  const el = $('pickerHistory');
  el.innerHTML = '';
  pickerHistory.forEach((hex) => {
    const div = document.createElement('div');
    div.className = 'history-color';
    div.style.background = hex;
    div.title = hex + ' · cliquer pour réafficher';
    div.onclick = () => {
      const r = parseInt(hex.slice(1, 3), 16);
      const g = parseInt(hex.slice(3, 5), 16);
      const b = parseInt(hex.slice(5, 7), 16);
      applyPickedColor(r, g, b);
    };
    el.appendChild(div);
  });
}

document.querySelectorAll('.copy-btn').forEach((b) => {
  b.onclick = () => {
    const target = $(b.dataset.copy);
    if (target && target.textContent !== '—') {
      window.api.copyToClipboard(target.textContent);
      b.textContent = '✓';
      setTimeout(() => { b.textContent = 'Copier'; }, 1000);
    }
  };
});

// ============ Extension trigger ============
window.api.onExtensionDownload(({ url }) => {
  activateTab('download');
  $('ytUrl').value = url;
  $('probeBtn').click();
});
