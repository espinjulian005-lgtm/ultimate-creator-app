const APP_URL = 'http://127.0.0.1:47821';

async function sendToApp(url) {
  try {
    const r = await fetch(APP_URL + '/download', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url })
    });
    return r.ok;
  } catch (e) {
    return false;
  }
}

async function pingApp() {
  try {
    const r = await fetch(APP_URL + '/ping');
    return r.ok;
  } catch (e) {
    return false;
  }
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === 'send-to-app') {
    sendToApp(msg.url).then((ok) => sendResponse({ ok }));
    return true;
  }
  if (msg.type === 'ping-app') {
    pingApp().then((ok) => sendResponse({ ok }));
    return true;
  }
});
