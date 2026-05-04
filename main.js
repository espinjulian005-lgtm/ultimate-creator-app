const { app, BrowserWindow, ipcMain, dialog, shell, Tray, Menu, nativeImage, clipboard, desktopCapturer, screen, globalShortcut } = require('electron');
const path = require('path');
const fs = require('fs');
const https = require('https');
const { spawn } = require('child_process');
const express = require('express');
const { pathToFileURL } = require('url');

const isPackaged = app.isPackaged;
const appDataDir = path.join(app.getPath('userData'), 'bin');
const resourcesBin = isPackaged
  ? path.join(process.resourcesPath, 'bin')
  : path.join(__dirname, 'bin');

if (!fs.existsSync(appDataDir)) fs.mkdirSync(appDataDir, { recursive: true });

const isWin = process.platform === 'win32';
const isMac = process.platform === 'darwin';
const ytDlpName = isWin ? 'yt-dlp.exe' : 'yt-dlp';
const ffmpegName = isWin ? 'ffmpeg.exe' : 'ffmpeg';

function binPath(name) {
  const local = path.join(resourcesBin, name);
  if (fs.existsSync(local)) return local;
  return path.join(appDataDir, name);
}

function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    const req = https.get(url, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        file.close();
        fs.unlinkSync(dest);
        return downloadFile(res.headers.location, dest).then(resolve, reject);
      }
      if (res.statusCode !== 200) {
        file.close();
        fs.unlinkSync(dest);
        return reject(new Error(`HTTP ${res.statusCode}`));
      }
      res.pipe(file);
      file.on('finish', () => file.close(resolve));
    });
    req.on('error', (err) => {
      file.close();
      if (fs.existsSync(dest)) fs.unlinkSync(dest);
      reject(err);
    });
  });
}

async function ensureBinaries(sender) {
  const ytDlpPath = binPath(ytDlpName);
  const ffmpegPath = binPath(ffmpegName);

  if (!fs.existsSync(ytDlpPath)) {
    sender?.send('setup-progress', { step: 'yt-dlp', status: 'downloading' });
    const ytUrl = isWin
      ? 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp.exe'
      : isMac
        ? 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp_macos'
        : 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp';
    try {
      await downloadFile(ytUrl, path.join(appDataDir, ytDlpName));
      if (!isWin) fs.chmodSync(path.join(appDataDir, ytDlpName), 0o755);
      sender?.send('setup-progress', { step: 'yt-dlp', status: 'done' });
    } catch (e) {
      sender?.send('setup-progress', { step: 'yt-dlp', status: 'error', error: e.message });
    }
  }

  if (!fs.existsSync(ffmpegPath)) {
    sender?.send('setup-progress', { step: 'ffmpeg', status: 'missing' });
  }
}

let mainWindow = null;
let tray = null;
let isQuitting = false;
const startedHidden = process.argv.includes('--hidden');

// Single-instance lock: clicking the .exe again just focuses the window
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    bringAppToFront();
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 980,
    minHeight: 640,
    show: !startedHidden,
    // Frameless + transparent → fully custom glass UI, desktop visible behind
    frame: false,
    transparent: true,
    backgroundColor: '#00000000',
    hasShadow: true,
    roundedCorners: true,
    icon: path.join(__dirname, 'build', isWin ? 'icon.ico' : 'icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });
  mainWindow.setMenuBarVisibility(false);
  // Load via local HTTP server so YouTube IFrame API accepts the origin
  mainWindow.loadURL('http://127.0.0.1:47821/index.html');
  mainWindow.webContents.on('did-finish-load', () => {
    ensureBinaries(mainWindow.webContents);
  });

  // Hide to tray instead of quitting on close
  mainWindow.on('close', (e) => {
    if (!isQuitting) {
      e.preventDefault();
      mainWindow.hide();
    }
  });
}

function createTray() {
  const iconPath = path.join(__dirname, 'build', isWin ? 'icon.ico' : 'icon.png');
  let trayIcon;
  try {
    trayIcon = nativeImage.createFromPath(iconPath);
    if (trayIcon.isEmpty()) trayIcon = nativeImage.createEmpty();
  } catch {
    trayIcon = nativeImage.createEmpty();
  }
  tray = new Tray(trayIcon);
  tray.setToolTip('Ultimate Creator App');
  const menu = Menu.buildFromTemplate([
    {
      label: 'Ouvrir',
      click: () => {
        if (!mainWindow) createWindow();
        else { mainWindow.show(); mainWindow.focus(); }
      }
    },
    { type: 'separator' },
    {
      label: 'Lancer au démarrage',
      type: 'checkbox',
      checked: app.getLoginItemSettings().openAtLogin,
      click: (item) => setAutoLaunch(item.checked)
    },
    { type: 'separator' },
    {
      label: 'Quitter',
      click: () => { isQuitting = true; app.quit(); }
    }
  ]);
  tray.setContextMenu(menu);
  tray.on('click', () => {
    if (mainWindow) {
      mainWindow.isVisible() ? mainWindow.hide() : mainWindow.show();
    }
  });
}

function setAutoLaunch(enabled) {
  app.setLoginItemSettings({
    openAtLogin: enabled,
    openAsHidden: false,
    args: ['--hidden']
  });
}

// Force the window to come to the foreground on Windows, bypassing the
// anti-focus-steal protection that prevents background apps from popping up
// over the currently focused window (Chrome, in our case).
function bringAppToFront() {
  if (!mainWindow || mainWindow.isDestroyed()) return;

  // 1. Un-minimize / un-hide
  if (mainWindow.isMinimized()) mainWindow.restore();
  if (!mainWindow.isVisible()) mainWindow.show();

  // 2. Steal focus at app level (bypasses Windows' SetForegroundWindow restriction)
  try { app.focus({ steal: true }); } catch {}

  // 3. AlwaysOnTop ON → bring to top of z-order → release. The OS allows this
  //    because alwaysOnTop counts as a topmost flag, side-stepping the lock.
  mainWindow.setAlwaysOnTop(true, 'screen-saver');
  mainWindow.show();
  mainWindow.focus();
  mainWindow.moveTop();

  // 4. Release alwaysOnTop a beat later so it's not actually pinned forever.
  setTimeout(() => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.setAlwaysOnTop(false);
      mainWindow.focus();
    }
  }, 250);

  // 5. Flash the taskbar entry briefly as a visual cue (in case the user is
  //    on another monitor / virtual desktop).
  if (process.platform === 'win32') {
    try {
      mainWindow.flashFrame(true);
      setTimeout(() => mainWindow && !mainWindow.isDestroyed() && mainWindow.flashFrame(false), 800);
    } catch {}
  }
}

app.whenReady().then(() => {
  // Start the HTTP server FIRST — the window loads its URL from it
  startBridgeServer(() => {
    createWindow();
    createTray();
  });
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
    else if (mainWindow) mainWindow.show();
  });
});

app.on('before-quit', () => { isQuitting = true; });

app.on('window-all-closed', () => {
  // Don't quit — stay in the tray
});

// ============ HTTP bridge for browser extension + UI host ============
function startBridgeServer(onReady) {
  const srv = express();
  srv.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') return res.sendStatus(200);
    next();
  });
  srv.use(express.json());
  // Serve the renderer (so YouTube IFrame API has a real http origin)
  srv.use(express.static(path.join(__dirname, 'src')));
  // Serve the screenshot for the color picker overlay
  srv.get('/picker-screenshot', (_, res) => {
    if (pickerScreenshotPath && fs.existsSync(pickerScreenshotPath)) {
      res.setHeader('Cache-Control', 'no-store');
      res.sendFile(pickerScreenshotPath);
    } else {
      res.status(404).send('not found');
    }
  });
  srv.get('/ping', (_, res) => res.json({ ok: true, app: 'Ultimate Creator App' }));
  srv.post('/download', (req, res) => {
    const { url } = req.body || {};
    if (!url) return res.status(400).json({ ok: false, error: 'Missing url' });

    // Recreate the window if it was destroyed (rare, e.g. after explicit quit + re-trigger)
    if (!mainWindow || mainWindow.isDestroyed()) {
      createWindow();
      mainWindow.webContents.once('did-finish-load', () => {
        bringAppToFront();
        mainWindow.webContents.send('extension-download', { url });
      });
      return res.json({ ok: true });
    }

    bringAppToFront();
    // Slight delay so the window has time to render before the URL is injected
    setTimeout(() => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('extension-download', { url });
      }
    }, 80);
    res.json({ ok: true });
  });
  srv.listen(47821, '127.0.0.1', () => {
    console.log('Bridge listening on http://127.0.0.1:47821');
    if (onReady) onReady();
  });
}

// File-size helpers used by various features for warnings
ipcMain.handle('file-size', (_, filePath) => {
  try { return { ok: true, size: fs.statSync(filePath).size }; }
  catch (e) { return { ok: false, error: e.message }; }
});

// ============ IPC: file dialogs ============
ipcMain.handle('choose-folder', async () => {
  const r = await dialog.showOpenDialog(mainWindow, { properties: ['openDirectory'] });
  return r.canceled ? null : r.filePaths[0];
});
ipcMain.handle('choose-file', async (_, filters) => {
  const r = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: filters || [{ name: 'Tous fichiers', extensions: ['*'] }]
  });
  return r.canceled ? null : r.filePaths[0];
});
ipcMain.handle('default-downloads', () => app.getPath('downloads'));
ipcMain.handle('open-path', (_, p) => shell.openPath(p));
ipcMain.handle('show-in-folder', (_, p) => shell.showItemInFolder(p));

// ============ IPC: probe video info ============
ipcMain.handle('probe-url', async (_, url) => {
  return new Promise((resolve) => {
    const ytdlp = binPath(ytDlpName);
    const args = ['-J', '--no-warnings', '--no-playlist', url];
    const child = spawn(ytdlp, args);
    let out = '';
    let err = '';
    child.stdout.on('data', (d) => (out += d.toString()));
    child.stderr.on('data', (d) => (err += d.toString()));
    child.on('close', (code) => {
      if (code !== 0) return resolve({ ok: false, error: err || 'yt-dlp failed' });
      try {
        const info = JSON.parse(out);
        resolve({
          ok: true,
          title: info.title,
          duration: info.duration,
          thumbnail: info.thumbnail,
          uploader: info.uploader,
          formats: (info.formats || []).map((f) => ({
            format_id: f.format_id,
            ext: f.ext,
            resolution: f.resolution || (f.width && f.height ? `${f.width}x${f.height}` : null),
            height: f.height,
            fps: f.fps,
            vcodec: f.vcodec,
            acodec: f.acodec,
            abr: f.abr,
            tbr: f.tbr,
            filesize: f.filesize || f.filesize_approx
          }))
        });
      } catch (e) {
        resolve({ ok: false, error: e.message });
      }
    });
    child.on('error', (e) => resolve({ ok: false, error: e.message }));
  });
});

// ============ IPC: download ============
const activeJobs = new Map();
ipcMain.handle('cancel-job', (_, jobId) => {
  const child = activeJobs.get(jobId);
  if (child) child.kill('SIGKILL');
  activeJobs.delete(jobId);
  return true;
});

ipcMain.handle('start-download', async (event, opts) => {
  const {
    jobId, url, outDir,
    container,        // mp4, mkv, webm, mov, avi, mp3, wav, flac, m4a, opus, aac
    quality,          // 'best' | '144' | '240' | '360' | '480' | '720' | '1080' | '1440' | '2160' | '4320'
    audioBitrate,     // for audio-only: 128,192,256,320
    startTime, endTime, // hh:mm:ss or empty
    playlist          // bool
  } = opts;

  const ytdlp = binPath(ytDlpName);
  const ffmpeg = binPath(ffmpegName);

  const audioOnly = ['mp3', 'wav', 'flac', 'm4a', 'opus', 'aac'].includes(container);
  const args = ['--newline', '--no-warnings', '-o', path.join(outDir, '%(title)s.%(ext)s')];

  if (fs.existsSync(ffmpeg)) args.push('--ffmpeg-location', ffmpeg);
  if (!playlist) args.push('--no-playlist');
  else args.push('--yes-playlist');

  if (audioOnly) {
    args.push('-x', '--audio-format', container);
    if (audioBitrate) args.push('--audio-quality', audioBitrate + 'K');
  } else {
    let fmt;
    if (quality === 'best' || !quality) {
      fmt = `bestvideo[ext=${container === 'webm' ? 'webm' : 'mp4'}]+bestaudio/best`;
      if (container !== 'mp4' && container !== 'webm') {
        fmt = 'bestvideo+bestaudio/best';
      }
    } else {
      fmt = `bestvideo[height<=${quality}]+bestaudio/best[height<=${quality}]`;
    }
    args.push('-f', fmt);
    args.push('--merge-output-format', container);
  }

  if (startTime || endTime) {
    const section = `*${startTime || '0'}-${endTime || 'inf'}`;
    args.push('--download-sections', section);
    args.push('--force-keyframes-at-cuts');
  }

  args.push(url);

  return new Promise((resolve) => {
    const child = spawn(ytdlp, args);
    activeJobs.set(jobId, child);
    let lastFile = null;
    child.stdout.on('data', (d) => {
      const text = d.toString();
      text.split(/\r?\n/).forEach((line) => {
        if (!line.trim()) return;
        const m = line.match(/\[download\]\s+([\d.]+)% of [^\s]+ at\s+([\d.]+\w+\/s)\s+ETA\s+([\d:]+)/);
        if (m) {
          event.sender.send('job-progress', { jobId, percent: parseFloat(m[1]), speed: m[2], eta: m[3], line });
        } else {
          event.sender.send('job-log', { jobId, line });
        }
        const dest = line.match(/\[download\] Destination: (.+)/);
        if (dest) lastFile = dest[1].trim();
        const merge = line.match(/\[Merger\] Merging formats into "(.+)"/);
        if (merge) lastFile = merge[1].trim();
        const extract = line.match(/\[ExtractAudio\] Destination: (.+)/);
        if (extract) lastFile = extract[1].trim();
      });
    });
    child.stderr.on('data', (d) => {
      event.sender.send('job-log', { jobId, line: d.toString() });
    });
    child.on('close', (code) => {
      activeJobs.delete(jobId);
      resolve({ ok: code === 0, code, file: lastFile });
    });
    child.on('error', (e) => {
      activeJobs.delete(jobId);
      resolve({ ok: false, error: e.message });
    });
  });
});

// ============ IPC: convert ============
const imageExtsConvert = new Set(['png','jpg','jpeg','webp','gif','bmp','tiff','tif','heic','heif','avif']);

ipcMain.handle('convert-file', async (event, opts) => {
  const { jobId, input, output, audioOnly } = opts;

  // If both input and output are images, prefer sharp (handles HEIC/HEIF and is faster)
  const inExt = path.extname(input).slice(1).toLowerCase();
  const outExt = path.extname(output).slice(1).toLowerCase();
  if (imageExtsConvert.has(inExt) && imageExtsConvert.has(outExt)) {
    try {
      const sharp = require('sharp');
      const pipeline = sharp(input);
      if (outExt === 'jpg' || outExt === 'jpeg') await pipeline.jpeg({ quality: 92 }).toFile(output);
      else if (outExt === 'png') await pipeline.png().toFile(output);
      else if (outExt === 'webp') await pipeline.webp({ quality: 90 }).toFile(output);
      else if (outExt === 'avif') await pipeline.avif().toFile(output);
      else if (outExt === 'heic' || outExt === 'heif') await pipeline.heif({ quality: 90 }).toFile(output);
      else if (outExt === 'tiff' || outExt === 'tif') await pipeline.tiff().toFile(output);
      else if (outExt === 'gif') await pipeline.gif().toFile(output);
      else await pipeline.toFile(output);
      event.sender.send('job-progress', { jobId, percent: 100 });
      return { ok: true, file: output };
    } catch (e) {
      return { ok: false, error: 'Conversion image : ' + e.message };
    }
  }

  const ffmpeg = binPath(ffmpegName);
  if (!fs.existsSync(ffmpeg)) {
    return { ok: false, error: 'ffmpeg introuvable. Installe ffmpeg dans le dossier bin/.' };
  }
  const args = ['-y', '-i', input];
  if (audioOnly) args.push('-vn');
  args.push(output);

  return new Promise((resolve) => {
    const child = spawn(ffmpeg, args);
    activeJobs.set(jobId, child);
    let duration = 0;
    child.stderr.on('data', (d) => {
      const text = d.toString();
      const dm = text.match(/Duration: (\d+):(\d+):(\d+\.\d+)/);
      if (dm) duration = (+dm[1]) * 3600 + (+dm[2]) * 60 + parseFloat(dm[3]);
      const tm = text.match(/time=(\d+):(\d+):(\d+\.\d+)/);
      if (tm && duration > 0) {
        const cur = (+tm[1]) * 3600 + (+tm[2]) * 60 + parseFloat(tm[3]);
        const percent = Math.min(100, (cur / duration) * 100);
        event.sender.send('job-progress', { jobId, percent });
      }
      event.sender.send('job-log', { jobId, line: text });
    });
    child.on('close', (code) => {
      activeJobs.delete(jobId);
      resolve({ ok: code === 0, code, file: output });
    });
    child.on('error', (e) => {
      activeJobs.delete(jobId);
      resolve({ ok: false, error: e.message });
    });
  });
});

// ============ IPC: compress ============
ipcMain.handle('compress-file', async (event, opts) => {
  const {
    jobId, input, output,
    preset,            // 'light' | 'medium' | 'strong' | 'custom'
    crf,               // 18-32 for x264
    videoBitrate,      // e.g. '2M'
    audioBitrate,      // e.g. '128k'
    resolution,        // 'keep' | '1080' | '720' | '480'
    fps                // 'keep' | '60' | '30' | '24'
  } = opts;
  const ffmpeg = binPath(ffmpegName);
  if (!fs.existsSync(ffmpeg)) {
    return { ok: false, error: 'ffmpeg introuvable. Installe ffmpeg dans le dossier bin/.' };
  }

  let crfVal = crf;
  let abr = audioBitrate;
  if (preset === 'light') { crfVal = 20; abr = '192k'; }
  if (preset === 'medium') { crfVal = 24; abr = '128k'; }
  if (preset === 'strong') { crfVal = 28; abr = '96k'; }

  const args = ['-y', '-i', input, '-c:v', 'libx264', '-preset', 'medium'];
  if (crfVal) args.push('-crf', String(crfVal));
  if (videoBitrate && preset === 'custom') args.push('-b:v', videoBitrate);
  if (resolution && resolution !== 'keep') args.push('-vf', `scale=-2:${resolution}`);
  if (fps && fps !== 'keep') args.push('-r', String(fps));
  args.push('-c:a', 'aac', '-b:a', abr || '128k');
  args.push(output);

  return new Promise((resolve) => {
    const child = spawn(ffmpeg, args);
    activeJobs.set(jobId, child);
    let duration = 0;
    child.stderr.on('data', (d) => {
      const text = d.toString();
      const dm = text.match(/Duration: (\d+):(\d+):(\d+\.\d+)/);
      if (dm) duration = (+dm[1]) * 3600 + (+dm[2]) * 60 + parseFloat(dm[3]);
      const tm = text.match(/time=(\d+):(\d+):(\d+\.\d+)/);
      if (tm && duration > 0) {
        const cur = (+tm[1]) * 3600 + (+tm[2]) * 60 + parseFloat(tm[3]);
        const percent = Math.min(100, (cur / duration) * 100);
        event.sender.send('job-progress', { jobId, percent });
      }
      event.sender.send('job-log', { jobId, line: text });
    });
    child.on('close', (code) => {
      activeJobs.delete(jobId);
      resolve({ ok: code === 0, code, file: output });
    });
    child.on('error', (e) => {
      activeJobs.delete(jobId);
      resolve({ ok: false, error: e.message });
    });
  });
});

ipcMain.handle('binary-status', () => ({
  ytDlp: fs.existsSync(binPath(ytDlpName)),
  ffmpeg: fs.existsSync(binPath(ffmpegName))
}));

ipcMain.handle('autolaunch-get', () => app.getLoginItemSettings().openAtLogin);
ipcMain.handle('autolaunch-set', (_, enabled) => {
  setAutoLaunch(enabled);
  return app.getLoginItemSettings().openAtLogin;
});

// ============ Custom window controls (frameless) ============
ipcMain.handle('window-minimize', () => mainWindow && mainWindow.minimize());
ipcMain.handle('window-maximize-toggle', () => {
  if (!mainWindow) return false;
  // macOS native fullscreen is a separate state from "maximized" — when the
  // user (or the OS) put us into fullscreen, leaving it must take priority,
  // otherwise the window-controls button silently does nothing.
  if (mainWindow.isFullScreen()) {
    mainWindow.setFullScreen(false);
    return false;
  }
  if (mainWindow.isMaximized()) mainWindow.unmaximize();
  else mainWindow.maximize();
  return mainWindow.isMaximized();
});
ipcMain.handle('window-close', () => mainWindow && mainWindow.close());
ipcMain.handle('window-is-maximized', () => mainWindow ? (mainWindow.isMaximized() || mainWindow.isFullScreen()) : false);

// Notify renderer when the window's max/fullscreen state changes
app.on('browser-window-created', (_, win) => {
  win.on('maximize', () => win.webContents.send('window-state', { maximized: true }));
  win.on('unmaximize', () => win.webContents.send('window-state', { maximized: false }));
  win.on('enter-full-screen', () => win.webContents.send('window-state', { maximized: true }));
  win.on('leave-full-screen', () => win.webContents.send('window-state', { maximized: false }));
});

// ============ Thumbnail download ============
function safeFilename(s) {
  return String(s || 'thumbnail').replace(/[<>:"/\\|?*\x00-\x1F]/g, '_').slice(0, 80);
}

ipcMain.handle('download-thumbnail', async (_, { videoId, outDir, title }) => {
  if (!videoId) return { ok: false, error: 'videoId manquant' };
  const candidates = [
    `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
    `https://img.youtube.com/vi/${videoId}/sddefault.jpg`,
    `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`
  ];
  const dest = path.join(outDir, `${safeFilename(title)}_thumb.jpg`);
  for (const url of candidates) {
    try {
      await downloadFile(url, dest);
      const stat = fs.statSync(dest);
      if (stat.size > 5000) return { ok: true, file: dest };
      fs.unlinkSync(dest);
    } catch {}
  }
  return { ok: false, error: 'Aucune miniature trouvée' };
});

// ============ Background removal ============
ipcMain.handle('remove-background', async (_, { input, outDir, quality }) => {
  try {
    const { removeBackground } = require('@imgly/background-removal-node');
    const fileUrl = pathToFileURL(input).href;
    // Use the higher-quality 'medium' model (~80MB, much better edges)
    // and request lossless PNG output
    const blob = await removeBackground(fileUrl, {
      model: quality === 'fast' ? 'small' : 'medium',
      output: {
        format: 'image/png',
        quality: 1.0,
        type: 'foreground'
      }
    });
    const buffer = Buffer.from(await blob.arrayBuffer());
    const base = path.basename(input).replace(/\.[^.]+$/, '');
    const out = path.join(outDir, `${base}_nobg.png`);
    fs.writeFileSync(out, buffer);
    const dataUrl = 'data:image/png;base64,' + buffer.toString('base64');
    return { ok: true, file: out, dataUrl };
  } catch (e) {
    return { ok: false, error: e.message };
  }
});

// Save a pasted image (from clipboard) to a temp file, return its path
ipcMain.handle('save-clipboard-image', async (_, { buffer, mime }) => {
  try {
    const buf = Buffer.from(buffer);
    const ext = (mime || '').split('/')[1] || 'png';
    const safeExt = ext === 'jpeg' ? 'jpg' : ext;
    const tmpPath = path.join(app.getPath('temp'), `uc_paste_${Date.now()}.${safeExt}`);
    fs.writeFileSync(tmpPath, buf);
    return { ok: true, path: tmpPath };
  } catch (e) {
    return { ok: false, error: e.message };
  }
});

// Read a local file and return it as a data URL (for image previews when loaded over http://)
ipcMain.handle('file-to-data-url', async (_, filePath) => {
  try {
    const buf = fs.readFileSync(filePath);
    const ext = path.extname(filePath).slice(1).toLowerCase();
    const mime = ext === 'jpg' ? 'image/jpeg' : `image/${ext || 'png'}`;
    return { ok: true, dataUrl: `data:${mime};base64,${buf.toString('base64')}` };
  } catch (e) {
    return { ok: false, error: e.message };
  }
});

// ============ Clipboard helpers ============
ipcMain.handle('copy-to-clipboard', (_, text) => {
  clipboard.writeText(String(text ?? ''));
  return true;
});

ipcMain.handle('save-text-file', async (_, { content, defaultName }) => {
  const r = await dialog.showSaveDialog(mainWindow, {
    defaultPath: defaultName || 'output.txt',
    filters: [{ name: 'Texte', extensions: ['txt', 'srt', 'vtt'] }]
  });
  if (r.canceled) return { ok: false, canceled: true };
  fs.writeFileSync(r.filePath, content, 'utf8');
  return { ok: true, file: r.filePath };
});

// ============ Image Upscaler (Real-ESRGAN) ============
function realesrganPath() {
  const candidates = [
    path.join(resourcesBin, 'realesrgan-ncnn-vulkan' + (isWin ? '.exe' : '')),
    path.join(appDataDir, 'realesrgan-ncnn-vulkan' + (isWin ? '.exe' : ''))
  ];
  for (const c of candidates) if (fs.existsSync(c)) return c;
  return null;
}

ipcMain.handle('upscale-image', async (event, opts) => {
  const { jobId, input, outDir, scale, model } = opts;
  const exe = realesrganPath();
  if (!exe) {
    return { ok: false, error: "Real-ESRGAN n'est pas installé. Lance install.ps1 pour le télécharger (~50 MB)." };
  }
  const base = path.basename(input).replace(/\.[^.]+$/, '');
  const output = path.join(outDir, `${base}_x${scale}.png`);
  const args = ['-i', input, '-o', output, '-s', String(scale), '-n', model || 'realesrgan-x4plus', '-f', 'png'];

  return new Promise((resolve) => {
    const child = spawn(exe, args, { cwd: path.dirname(exe) });
    activeJobs.set(jobId, child);
    child.stderr.on('data', (d) => {
      const text = d.toString();
      const m = text.match(/(\d+\.\d+)%/);
      if (m) event.sender.send('job-progress', { jobId, percent: parseFloat(m[1]) });
      event.sender.send('job-log', { jobId, line: text });
    });
    child.on('close', (code) => {
      activeJobs.delete(jobId);
      resolve({ ok: code === 0 && fs.existsSync(output), code, file: output });
    });
    child.on('error', (e) => { activeJobs.delete(jobId); resolve({ ok: false, error: e.message }); });
  });
});

// ============ OCR (Tesseract.js) ============
let _tesseractWorker = null;
async function getTesseractWorker(event) {
  if (_tesseractWorker) return _tesseractWorker;
  const { createWorker } = require('tesseract.js');
  _tesseractWorker = await createWorker(['fra', 'eng'], 1, {
    logger: (m) => {
      if (event && m.status) {
        event.sender.send('ocr-progress', {
          status: m.status,
          progress: typeof m.progress === 'number' ? Math.round(m.progress * 100) : null
        });
      }
    }
  });
  return _tesseractWorker;
}

ipcMain.handle('ocr-image', async (event, { input }) => {
  try {
    const worker = await getTesseractWorker(event);
    const { data } = await worker.recognize(input);
    return { ok: true, text: data.text, confidence: data.confidence };
  } catch (e) {
    return { ok: false, error: e.message };
  }
});

// ============ Transcription (Whisper) ============
ipcMain.handle('transcribe-audio', async (event, opts) => {
  const { jobId, input, lang, model, format, outDir } = opts;
  const ffmpeg = binPath(ffmpegName);
  if (!fs.existsSync(ffmpeg)) return { ok: false, error: 'ffmpeg introuvable.' };

  // Step 1: extract audio to 16kHz WAV (whisper.cpp requirement)
  const tmpWav = path.join(app.getPath('temp'), `uc_whisper_${Date.now()}.wav`);
  await new Promise((resolve, reject) => {
    const ff = spawn(ffmpeg, ['-y', '-i', input, '-ar', '16000', '-ac', '1', '-c:a', 'pcm_s16le', tmpWav]);
    ff.on('close', (code) => code === 0 ? resolve() : reject(new Error('ffmpeg failed')));
    ff.on('error', reject);
  }).catch((e) => ({ error: e.message }));

  if (!fs.existsSync(tmpWav)) return { ok: false, error: 'Extraction audio impossible.' };

  // Step 2: run whisper
  try {
    const { nodewhisper } = require('nodejs-whisper');
    event.sender.send('transcribe-progress', { jobId, stage: 'transcribing' });

    await nodewhisper(tmpWav, {
      modelName: model || 'tiny',
      autoDownloadModelName: model || 'tiny',
      removeWavFileAfterTranscription: false,
      whisperOptions: {
        outputInSrt: format === 'srt',
        outputInVtt: format === 'vtt',
        outputInText: format === 'txt',
        translateToEnglish: false,
        language: (lang && lang !== 'auto') ? lang : 'auto',
        wordTimestamps: false,
        timestamps_length: 20,
        splitOnWord: true
      }
    });

    const ext = format === 'txt' ? 'txt' : (format === 'vtt' ? 'vtt' : 'srt');
    const generated = `${tmpWav}.${ext}`;
    if (!fs.existsSync(generated)) {
      return { ok: false, error: `Sortie ${ext.toUpperCase()} introuvable.` };
    }
    const baseName = path.basename(input).replace(/\.[^.]+$/, '');
    const finalPath = path.join(outDir, `${baseName}.${ext}`);
    fs.copyFileSync(generated, finalPath);
    try { fs.unlinkSync(generated); } catch {}
    try { fs.unlinkSync(tmpWav); } catch {}
    return { ok: true, file: finalPath, content: fs.readFileSync(finalPath, 'utf8') };
  } catch (e) {
    return { ok: false, error: e.message };
  }
});

// ============ Image compression (sharp) ============
ipcMain.handle('compress-image', async (event, opts) => {
  const { input, outDir, format, quality, maxWidth } = opts;
  try {
    const sharp = require('sharp');
    const inExt = path.extname(input).slice(1).toLowerCase();
    let targetFmt = format;
    if (targetFmt === 'auto') {
      targetFmt = inExt === 'png' ? 'png' : inExt === 'webp' ? 'webp' : 'jpg';
    }
    const base = path.basename(input).replace(/\.[^.]+$/, '');
    const out = path.join(outDir, `${base}_optimized.${targetFmt === 'jpg' ? 'jpg' : targetFmt}`);

    let pipeline = sharp(input);
    if (maxWidth && maxWidth > 0) {
      pipeline = pipeline.resize({ width: Number(maxWidth), withoutEnlargement: true });
    }
    const q = Math.max(1, Math.min(100, Number(quality) || 80));

    if (targetFmt === 'jpg') pipeline = pipeline.jpeg({ quality: q, mozjpeg: true });
    else if (targetFmt === 'png') pipeline = pipeline.png({ quality: q, compressionLevel: 9, palette: true });
    else if (targetFmt === 'webp') pipeline = pipeline.webp({ quality: q });
    else if (targetFmt === 'avif') pipeline = pipeline.avif({ quality: q });

    await pipeline.toFile(out);
    const inSize = fs.statSync(input).size;
    const outSize = fs.statSync(out).size;
    return { ok: true, file: out, inSize, outSize, savedPct: Math.round((1 - outSize / inSize) * 100) };
  } catch (e) {
    return { ok: false, error: e.message };
  }
});

// ============ Inpainting (Telea via OpenCV.js — runs in renderer) ============
// The renderer does the actual inpainting via opencv.js. Main just saves the result.
ipcMain.handle('inpaint-image', async (_, { dataUrl, originalPath, outDir }) => {
  try {
    const m = dataUrl.match(/^data:image\/(\w+);base64,(.+)$/);
    if (!m) return { ok: false, error: 'data URL invalide' };
    const buf = Buffer.from(m[2], 'base64');
    const base = path.basename(originalPath || 'image').replace(/\.[^.]+$/, '');
    const out = path.join(outDir, `${base}_inpainted.png`);
    fs.writeFileSync(out, buf);
    return { ok: true, file: out };
  } catch (e) {
    return { ok: false, error: e.message };
  }
});

// ============ PDF tools ============
ipcMain.handle('pdf-to-images', async (event, { input, outDir, format, dpi }) => {
  try {
    const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
    const data = new Uint8Array(fs.readFileSync(input));
    const doc = await pdfjs.getDocument({ data, useSystemFonts: true }).promise;
    const sharp = require('sharp');
    const base = path.basename(input).replace(/\.[^.]+$/, '');
    const subDir = path.join(outDir, base + '_pages');
    fs.mkdirSync(subDir, { recursive: true });
    const fmt = format || 'jpg';
    const scale = (Number(dpi) || 200) / 72;
    const files = [];

    // Render via canvas-like in Node: pdfjs needs a canvas factory. Use a simple stub that uses sharp.
    // Easier path: use pdfjs to get page size, render to OffscreenCanvas via @napi-rs/canvas.
    // Fallback: use pdf2pic if installed... here we'll use a manual approach with pdf-lib + sharp won't work.
    // Use @napi-rs/canvas:
    let CanvasModule;
    try { CanvasModule = require('@napi-rs/canvas'); } catch {}
    if (!CanvasModule) {
      return { ok: false, error: 'Module canvas requis. Lance: npm install @napi-rs/canvas' };
    }

    for (let i = 1; i <= doc.numPages; i++) {
      const page = await doc.getPage(i);
      const viewport = page.getViewport({ scale });
      const canvas = CanvasModule.createCanvas(viewport.width, viewport.height);
      const ctx = canvas.getContext('2d');
      await page.render({ canvasContext: ctx, viewport }).promise;
      const png = canvas.toBuffer('image/png');
      const outFile = path.join(subDir, `page-${String(i).padStart(3, '0')}.${fmt}`);
      if (fmt === 'jpg') await sharp(png).jpeg({ quality: 90 }).toFile(outFile);
      else if (fmt === 'webp') await sharp(png).webp({ quality: 90 }).toFile(outFile);
      else fs.writeFileSync(outFile, png);
      files.push(outFile);
      event.sender.send('job-progress', { jobId: 'pdf-extract', percent: (i / doc.numPages) * 100 });
    }
    return { ok: true, files, dir: subDir };
  } catch (e) {
    return { ok: false, error: e.message };
  }
});

ipcMain.handle('images-to-pdf', async (_, { inputs, outPath, pageSize }) => {
  try {
    const { PDFDocument } = require('pdf-lib');
    const sharp = require('sharp');
    const pdf = await PDFDocument.create();
    for (const img of inputs) {
      const ext = path.extname(img).slice(1).toLowerCase();
      let buf = fs.readFileSync(img);
      let embed;
      if (ext === 'jpg' || ext === 'jpeg') embed = await pdf.embedJpg(buf);
      else if (ext === 'png') embed = await pdf.embedPng(buf);
      else {
        // Convert other formats to PNG via sharp
        buf = await sharp(img).png().toBuffer();
        embed = await pdf.embedPng(buf);
      }
      const page = pdf.addPage([embed.width, embed.height]);
      page.drawImage(embed, { x: 0, y: 0, width: embed.width, height: embed.height });
    }
    fs.writeFileSync(outPath, await pdf.save());
    return { ok: true, file: outPath };
  } catch (e) {
    return { ok: false, error: e.message };
  }
});

ipcMain.handle('pdf-merge', async (_, { inputs, outPath }) => {
  try {
    const { PDFDocument } = require('pdf-lib');
    const merged = await PDFDocument.create();
    for (const f of inputs) {
      const src = await PDFDocument.load(fs.readFileSync(f));
      const pages = await merged.copyPages(src, src.getPageIndices());
      pages.forEach((p) => merged.addPage(p));
    }
    fs.writeFileSync(outPath, await merged.save());
    return { ok: true, file: outPath };
  } catch (e) {
    return { ok: false, error: e.message };
  }
});

ipcMain.handle('pdf-split', async (_, { input, outDir, ranges }) => {
  // ranges: array like [{start:1,end:3},{start:4,end:7}]
  try {
    const { PDFDocument } = require('pdf-lib');
    const src = await PDFDocument.load(fs.readFileSync(input));
    const base = path.basename(input).replace(/\.[^.]+$/, '');
    const files = [];
    for (let i = 0; i < ranges.length; i++) {
      const r = ranges[i];
      const out = await PDFDocument.create();
      const indices = [];
      for (let p = r.start - 1; p <= r.end - 1; p++) indices.push(p);
      const pages = await out.copyPages(src, indices);
      pages.forEach((p) => out.addPage(p));
      const file = path.join(outDir, `${base}_part${i + 1}.pdf`);
      fs.writeFileSync(file, await out.save());
      files.push(file);
    }
    return { ok: true, files };
  } catch (e) {
    return { ok: false, error: e.message };
  }
});

ipcMain.handle('pdf-thumbnails', async (_, input) => {
  try {
    const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
    let CanvasModule;
    try { CanvasModule = require('@napi-rs/canvas'); } catch {}
    if (!CanvasModule) return { ok: false, error: '@napi-rs/canvas requis' };

    const data = new Uint8Array(fs.readFileSync(input));
    const doc = await pdfjs.getDocument({ data, useSystemFonts: true }).promise;
    const thumbs = [];
    const targetWidth = 200;

    for (let i = 1; i <= doc.numPages; i++) {
      const page = await doc.getPage(i);
      const viewport = page.getViewport({ scale: 1 });
      const scale = targetWidth / viewport.width;
      const scaledViewport = page.getViewport({ scale });
      const canvas = CanvasModule.createCanvas(scaledViewport.width, scaledViewport.height);
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      await page.render({ canvasContext: ctx, viewport: scaledViewport }).promise;
      const buf = canvas.toBuffer('image/jpeg', 70);
      thumbs.push({
        page: i,
        dataUrl: 'data:image/jpeg;base64,' + buf.toString('base64'),
        width: scaledViewport.width,
        height: scaledViewport.height
      });
    }
    return { ok: true, pageCount: doc.numPages, thumbs };
  } catch (e) {
    return { ok: false, error: e.message };
  }
});

ipcMain.handle('pdf-reorder', async (_, { input, outPath, order }) => {
  // order: array of 1-based page numbers in the new order, e.g. [3,1,2,4]
  try {
    const { PDFDocument } = require('pdf-lib');
    const src = await PDFDocument.load(fs.readFileSync(input));
    const out = await PDFDocument.create();
    const indices = order.map((n) => n - 1);
    const pages = await out.copyPages(src, indices);
    pages.forEach((p) => out.addPage(p));
    fs.writeFileSync(outPath, await out.save());
    return { ok: true, file: outPath };
  } catch (e) {
    return { ok: false, error: e.message };
  }
});

// ============ Audiogramme animé ============
ipcMain.handle('audiogram', async (event, opts) => {
  const { jobId, audioInput, coverInput, outDir, size, color, withSubs, lang } = opts;
  const ffmpeg = binPath(ffmpegName);
  if (!fs.existsSync(ffmpeg)) return { ok: false, error: 'ffmpeg introuvable.' };

  const base = path.basename(audioInput).replace(/\.[^.]+$/, '');
  const out = path.join(outDir, `${base}_audiogram.mp4`);
  const dim = size === 'square' ? [1080, 1080] : size === 'vertical' ? [1080, 1920] : [1920, 1080];
  const [w, h] = dim;
  const waveColor = (color || '#FF7A1A').replace('#', '0x');

  let subFile = null;
  if (withSubs) {
    try {
      const { nodewhisper } = require('nodejs-whisper');
      // Convert audio to wav 16k
      const tmpWav = path.join(app.getPath('temp'), `uc_audiogram_${Date.now()}.wav`);
      await new Promise((res, rej) => {
        const ff = spawn(ffmpeg, ['-y', '-i', audioInput, '-ar', '16000', '-ac', '1', tmpWav]);
        ff.on('close', (c) => c === 0 ? res() : rej(new Error('ffmpeg wav fail')));
      });
      event.sender.send('job-progress', { jobId, percent: 20 });
      await nodewhisper(tmpWav, {
        modelName: 'tiny',
        autoDownloadModelName: 'tiny',
        whisperOptions: {
          outputInSrt: true,
          language: (lang && lang !== 'auto') ? lang : 'auto',
          splitOnWord: true
        }
      });
      subFile = `${tmpWav}.srt`;
      try { fs.unlinkSync(tmpWav); } catch {}
    } catch (e) {
      // continue without subtitles
      subFile = null;
    }
  }

  // Build complex filter
  const wavFilter = `showwaves=s=${w}x${Math.round(h * 0.2)}:mode=line:colors=${waveColor}:rate=25,format=rgba`;
  const filter = coverInput
    ? `[1:v]scale=${w}:${h}:force_original_aspect_ratio=increase,crop=${w}:${h}[bg];[0:a]${wavFilter}[wave];[bg][wave]overlay=0:H-h-40[v]`
    : `color=c=#0a0a0c:s=${w}x${h}[bg];[0:a]${wavFilter}[wave];[bg][wave]overlay=0:H-h-40[v]`;

  const args = ['-y', '-i', audioInput];
  if (coverInput) args.push('-loop', '1', '-i', coverInput);
  args.push('-filter_complex', filter, '-map', '[v]', '-map', '0:a', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-shortest');
  if (subFile && fs.existsSync(subFile)) {
    // Add subs as a 2nd pass (burn-in)
    const tmpVideo = out.replace(/\.mp4$/, '_tmp.mp4');
    args[args.indexOf(out) > -1 ? args.indexOf(out) : args.length] = tmpVideo;
    args.push(tmpVideo);
  } else {
    args.push(out);
  }

  return new Promise((resolve) => {
    const child = spawn(ffmpeg, args);
    activeJobs.set(jobId, child);
    let duration = 0;
    child.stderr.on('data', (d) => {
      const text = d.toString();
      const dm = text.match(/Duration: (\d+):(\d+):(\d+\.\d+)/);
      if (dm && !duration) duration = (+dm[1]) * 3600 + (+dm[2]) * 60 + parseFloat(dm[3]);
      const tm = text.match(/time=(\d+):(\d+):(\d+\.\d+)/);
      if (tm && duration) {
        const cur = (+tm[1]) * 3600 + (+tm[2]) * 60 + parseFloat(tm[3]);
        event.sender.send('job-progress', { jobId, percent: Math.min(95, 20 + (cur / duration) * 70) });
      }
      event.sender.send('job-log', { jobId, line: text });
    });
    child.on('close', async (code) => {
      activeJobs.delete(jobId);
      if (code !== 0) return resolve({ ok: false, code });

      // Burn subtitles if requested
      if (subFile && fs.existsSync(subFile)) {
        const tmpVideo = out.replace(/\.mp4$/, '_tmp.mp4');
        const subEsc = subFile.replace(/\\/g, '/').replace(/:/g, '\\:');
        const burnArgs = ['-y', '-i', tmpVideo, '-vf', `subtitles='${subEsc}':force_style='Fontsize=28,PrimaryColour=&H00FFFFFF&,Outline=2,Shadow=0,Alignment=2'`, '-c:a', 'copy', out];
        await new Promise((res) => {
          const burn = spawn(ffmpeg, burnArgs);
          burn.on('close', () => res());
        });
        try { fs.unlinkSync(tmpVideo); } catch {}
        try { fs.unlinkSync(subFile); } catch {}
      }
      event.sender.send('job-progress', { jobId, percent: 100 });
      resolve({ ok: fs.existsSync(out), file: out });
    });
    child.on('error', (e) => { activeJobs.delete(jobId); resolve({ ok: false, error: e.message }); });
  });
});

// ============ YouTube Summary (Whisper + Ollama) ============
ipcMain.handle('ollama-status', async () => {
  try {
    const r = await fetch('http://127.0.0.1:11434/api/tags', { signal: AbortSignal.timeout(2000) });
    if (!r.ok) return { ok: false };
    const data = await r.json();
    return { ok: true, models: (data.models || []).map((m) => m.name) };
  } catch {
    return { ok: false };
  }
});

ipcMain.handle('summarize-youtube', async (event, opts) => {
  const { jobId, url, model, language, style } = opts;
  const ytdlp = binPath(ytDlpName);
  const ffmpeg = binPath(ffmpegName);

  // 1. Download audio with yt-dlp
  event.sender.send('job-progress', { jobId, percent: 5 });
  const tmpDir = app.getPath('temp');
  const tmpAudio = path.join(tmpDir, `uc_summary_${Date.now()}.m4a`);

  await new Promise((res, rej) => {
    const dl = spawn(ytdlp, ['--no-warnings', '-f', 'bestaudio[ext=m4a]/bestaudio', '-o', tmpAudio, url]);
    dl.on('close', (c) => c === 0 ? res() : rej(new Error('yt-dlp failed')));
    dl.on('error', rej);
  }).catch((e) => ({ error: e.message }));

  if (!fs.existsSync(tmpAudio)) return { ok: false, error: 'Téléchargement audio échoué.' };

  // 2. Convert to 16k wav
  const tmpWav = path.join(tmpDir, `uc_summary_${Date.now()}.wav`);
  event.sender.send('job-progress', { jobId, percent: 20 });
  await new Promise((res, rej) => {
    const ff = spawn(ffmpeg, ['-y', '-i', tmpAudio, '-ar', '16000', '-ac', '1', tmpWav]);
    ff.on('close', (c) => c === 0 ? res() : rej(new Error('ffmpeg failed')));
  }).catch(() => {});

  try { fs.unlinkSync(tmpAudio); } catch {}
  if (!fs.existsSync(tmpWav)) return { ok: false, error: 'Extraction audio échouée.' };

  // 3. Whisper transcript
  event.sender.send('job-progress', { jobId, percent: 30 });
  let transcript = '';
  try {
    const { nodewhisper } = require('nodejs-whisper');
    await nodewhisper(tmpWav, {
      modelName: 'base',
      autoDownloadModelName: 'base',
      whisperOptions: {
        outputInText: true,
        language: 'auto',
        splitOnWord: false
      }
    });
    transcript = fs.readFileSync(`${tmpWav}.txt`, 'utf8');
    try { fs.unlinkSync(`${tmpWav}.txt`); } catch {}
  } catch (e) {
    try { fs.unlinkSync(tmpWav); } catch {}
    return { ok: false, error: 'Whisper : ' + e.message };
  }
  try { fs.unlinkSync(tmpWav); } catch {}

  if (!transcript.trim()) return { ok: false, error: 'Transcript vide' };

  // 4. Send to Ollama
  event.sender.send('job-progress', { jobId, percent: 70 });
  const langInstr = language === 'fr' ? 'en français' : language === 'en' ? 'in English' : 'in the same language as the transcript';
  const styleInstr = {
    short: 'Fais un résumé très court (3-5 phrases max).',
    bullets: 'Fais un résumé en bullet points clairs (5-8 points clés).',
    detailed: 'Fais un résumé détaillé en sections (introduction, points clés, conclusion).',
    chapters: 'Génère des chapitres YouTube (timestamps approximatifs basés sur la position dans le texte) au format "00:00 Titre".'
  }[style || 'bullets'] || '';

  const prompt = `Tu es un assistant qui résume des vidéos YouTube. ${styleInstr}\nRéponds ${langInstr}.\n\nTranscript :\n${transcript.slice(0, 12000)}`;

  try {
    const r = await fetch('http://127.0.0.1:11434/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: model || 'llama3.2', prompt, stream: false })
    });
    if (!r.ok) return { ok: false, error: `Ollama HTTP ${r.status}` };
    const data = await r.json();
    event.sender.send('job-progress', { jobId, percent: 100 });
    return { ok: true, summary: data.response, transcript };
  } catch (e) {
    return { ok: false, error: 'Ollama injoignable. Vérifie qu\'Ollama tourne (http://localhost:11434). ' + e.message };
  }
});

// ============ Color Picker (screen pipette) ============
let pickerWindow = null;
let pickerScreenshotPath = null;
let macPickerActive = false;

// macOS: use the system NSColorSampler via our small Swift helper. The OS
// shows a magnifying loupe that follows the cursor across all displays and
// Spaces, returns the picked color, and needs no Screen Recording permission.
function pickColorMac() {
  return new Promise((resolve) => {
    const helper = binPath('uc-color-picker');
    if (!fs.existsSync(helper)) {
      return resolve({ ok: false, error: 'Helper uc-color-picker manquant dans bin/.' });
    }
    macPickerActive = true;
    const wasVisible = mainWindow && mainWindow.isVisible();
    if (wasVisible) mainWindow.hide();

    const child = spawn(helper, [], { stdio: ['ignore', 'pipe', 'pipe'] });
    let out = '';
    child.stdout.on('data', (d) => { out += d.toString(); });
    child.on('error', (err) => {
      macPickerActive = false;
      if (wasVisible && mainWindow) { mainWindow.show(); mainWindow.focus(); }
      resolve({ ok: false, error: 'Pipette macOS: ' + err.message });
    });
    child.on('close', (code) => {
      macPickerActive = false;
      if (wasVisible && mainWindow) { mainWindow.show(); mainWindow.focus(); }
      const line = out.trim();
      if (code !== 0 || !line) {
        return resolve({ ok: false, canceled: true });
      }
      const parts = line.split(',').map((s) => parseInt(s, 10));
      if (parts.length !== 3 || parts.some((n) => Number.isNaN(n))) {
        return resolve({ ok: false, error: 'Sortie pipette invalide: ' + line });
      }
      const [r, g, b] = parts;
      const hex = '#' + [r, g, b].map((n) => n.toString(16).padStart(2, '0')).join('').toUpperCase();
      clipboard.writeText(hex);
      resolve({ ok: true, hex, r, g, b });
    });
  });
}

ipcMain.handle('pick-color', async () => {
  if (process.platform === 'darwin') {
    if (macPickerActive) return { ok: false, error: 'Pipette deja active' };
    return pickColorMac();
  }
  if (pickerWindow) return { ok: false, error: 'Pipette deja active' };

  const primary = screen.getPrimaryDisplay();
  const w = Math.round(primary.bounds.width * primary.scaleFactor);
  const h = Math.round(primary.bounds.height * primary.scaleFactor);

  let source;
  try {
    const sources = await desktopCapturer.getSources({
      types: ['screen'],
      thumbnailSize: { width: w, height: h }
    });
    source = sources.find((s) => s.display_id === String(primary.id)) || sources[0];
  } catch (e) {
    return { ok: false, error: 'Capture impossible : ' + e.message };
  }
  if (!source || source.thumbnail.isEmpty()) {
    return { ok: false, error: 'Impossible de capturer l\'ecran' };
  }
  const thumbnail = source.thumbnail;

  // Save the screenshot to a temp file the express server will serve
  pickerScreenshotPath = path.join(app.getPath('temp'), `uc_pick_${Date.now()}.png`);
  fs.writeFileSync(pickerScreenshotPath, thumbnail.toPNG());

  // Hide main window
  const wasVisible = mainWindow && mainWindow.isVisible();
  if (wasVisible) mainWindow.hide();
  await new Promise((r) => setTimeout(r, 300));

  return new Promise((resolve) => {
    pickerWindow = new BrowserWindow({
      x: primary.bounds.x,
      y: primary.bounds.y,
      width: primary.bounds.width,
      height: primary.bounds.height,
      frame: false,
      transparent: false,
      alwaysOnTop: true,
      skipTaskbar: true,
      fullscreen: true,
      resizable: false,
      movable: false,
      hasShadow: false,
      webPreferences: {
        preload: path.join(__dirname, 'preload.js'),
        contextIsolation: true,
        nodeIntegration: false
      }
    });
    pickerWindow.setAlwaysOnTop(true, 'screen-saver');
    pickerWindow.loadURL('http://127.0.0.1:47821/picker.html');

    let result = null;
    const onSubmit = (_, data) => { result = data; if (pickerWindow && !pickerWindow.isDestroyed()) pickerWindow.close(); };
    ipcMain.once('picker-submit', onSubmit);

    pickerWindow.on('closed', () => {
      ipcMain.removeListener('picker-submit', onSubmit);
      pickerWindow = null;
      if (pickerScreenshotPath) {
        try { fs.unlinkSync(pickerScreenshotPath); } catch {}
        pickerScreenshotPath = null;
      }
      if (wasVisible && mainWindow) {
        mainWindow.show();
        mainWindow.focus();
      }
      if (result?.picked) {
        clipboard.writeText(result.hex);
        resolve({ ok: true, hex: result.hex, r: result.r, g: result.g, b: result.b });
      } else {
        resolve({ ok: false, canceled: true });
      }
    });
  });
});

// ============ Audio processing ============
ipcMain.handle('process-audio', async (event, opts) => {
  const ffmpeg = binPath(ffmpegName);
  if (!fs.existsSync(ffmpeg)) return { ok: false, error: 'ffmpeg introuvable.' };

  const { jobId, mode, outDir } = opts;
  let args, output;

  if (mode === 'trim') {
    const { input, silenceDb, silenceMin } = opts;
    const base = path.basename(input).replace(/\.[^.]+$/, '');
    output = path.join(outDir, `${base}_trimmed.mp3`);
    const filter = `silenceremove=start_periods=1:start_duration=0:start_threshold=${silenceDb}dB:detection=peak,aformat=dblp,areverse,silenceremove=start_periods=1:start_duration=${silenceMin}:start_threshold=${silenceDb}dB:detection=peak,aformat=dblp,areverse`;
    args = ['-y', '-i', input, '-af', filter, '-c:a', 'libmp3lame', '-b:a', '192k', output];
  } else if (mode === 'normalize') {
    const { input, lufs } = opts;
    const base = path.basename(input).replace(/\.[^.]+$/, '');
    const ext = path.extname(input).slice(1) || 'mp3';
    output = path.join(outDir, `${base}_normalized.${ext}`);
    args = ['-y', '-i', input, '-af', `loudnorm=I=${lufs}:TP=-1.5:LRA=11`, '-ar', '48000', output];
  } else if (mode === 'crossfade') {
    const { inputA, inputB, fadeDuration } = opts;
    const base = path.basename(inputA).replace(/\.[^.]+$/, '');
    output = path.join(outDir, `${base}_crossfaded.mp3`);
    args = ['-y', '-i', inputA, '-i', inputB,
      '-filter_complex', `[0:a][1:a]acrossfade=d=${fadeDuration}:c1=tri:c2=tri[out]`,
      '-map', '[out]', '-c:a', 'libmp3lame', '-b:a', '192k', output];
  } else {
    return { ok: false, error: 'Mode inconnu' };
  }

  return new Promise((resolve) => {
    const child = spawn(ffmpeg, args);
    activeJobs.set(jobId, child);
    let duration = 0;
    child.stderr.on('data', (d) => {
      const text = d.toString();
      const dm = text.match(/Duration: (\d+):(\d+):(\d+\.\d+)/);
      if (dm && !duration) duration = (+dm[1]) * 3600 + (+dm[2]) * 60 + parseFloat(dm[3]);
      const tm = text.match(/time=(\d+):(\d+):(\d+\.\d+)/);
      if (tm && duration > 0) {
        const cur = (+tm[1]) * 3600 + (+tm[2]) * 60 + parseFloat(tm[3]);
        event.sender.send('job-progress', { jobId, percent: Math.min(100, (cur / duration) * 100) });
      }
      event.sender.send('job-log', { jobId, line: text });
    });
    child.on('close', (code) => {
      activeJobs.delete(jobId);
      resolve({ ok: code === 0, code, file: output });
    });
    child.on('error', (e) => { activeJobs.delete(jobId); resolve({ ok: false, error: e.message }); });
  });
});
