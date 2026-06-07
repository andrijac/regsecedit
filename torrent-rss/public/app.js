import * as ed from './vendor/ed25519.js';

// ---- Utilities ----

function bytesToHex(bytes) {
  return Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
}

function hexToBytes(hex) {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  return bytes;
}

function isValidHex64(s) {
  return typeof s === 'string' && /^[0-9a-f]{64}$/.test(s);
}

function showStatus(id, msg, type) {
  const el = document.getElementById(id);
  el.textContent = msg;
  el.className = `status ${type}`;
}

function $(id) { return document.getElementById(id); }

// ---- Key State ----

let privBytes = null;
let pubBytes = null;

async function loadKeysFromHex(privHex) {
  const h = privHex.trim().toLowerCase();
  if (!isValidHex64(h)) throw new Error('Private key must be exactly 64 lowercase hex characters');
  privBytes = hexToBytes(h);
  pubBytes = await ed.getPublicKeyAsync(privBytes);
  sessionStorage.setItem('torrent-rss-privkey', h);
  updateKeyDisplays();
}

function updateKeyDisplays() {
  if (!pubBytes) return;
  const pubHex = bytesToHex(pubBytes);
  $('post-pubkey-display').textContent = pubHex;

  const feedUrl = `${location.origin}/rss/${pubHex}`;
  $('feed-info').innerHTML = `
    <label>RSS Feed URL
      <div style="display:flex;gap:0.5rem;align-items:center;flex-wrap:wrap;margin-top:0.3rem">
        <a class="mono" href="${feedUrl}" target="_blank" style="flex:1">${feedUrl}</a>
        <button class="secondary" id="btn-copy-feed" style="flex-shrink:0;font-size:0.8rem;padding:0.3rem 0.7rem">Copy</button>
      </div>
    </label>
    <p style="font-size:0.8rem;color:#666;margin:0.5rem 0 0">Channel public key: <span style="font-family:monospace;font-size:0.78rem">${pubHex}</span></p>
  `;
  $('btn-copy-feed')?.addEventListener('click', () => {
    navigator.clipboard.writeText(feedUrl).then(() => {
      $('btn-copy-feed').textContent = 'Copied!';
      setTimeout(() => { if ($('btn-copy-feed')) $('btn-copy-feed').textContent = 'Copy'; }, 1500);
    });
  });
}

// Restore keys from session on page load
const stored = sessionStorage.getItem('torrent-rss-privkey');
if (stored) {
  loadKeysFromHex(stored).catch(() => sessionStorage.removeItem('torrent-rss-privkey'));
}

// ---- Tab Switching ----

document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById(`tab-${btn.dataset.tab}`).classList.add('active');
  });
});

// ---- Copy Buttons ----

document.querySelectorAll('.copy-btn[data-copy]').forEach(btn => {
  btn.addEventListener('click', () => {
    const text = document.getElementById(btn.dataset.copy)?.textContent ?? '';
    navigator.clipboard.writeText(text).then(() => {
      btn.textContent = 'Copied!';
      setTimeout(() => { btn.textContent = 'Copy'; }, 1500);
    });
  });
});

// ---- Keys Tab: Generate ----

$('btn-generate').addEventListener('click', async () => {
  privBytes = ed.utils.randomPrivateKey();
  pubBytes = await ed.getPublicKeyAsync(privBytes);
  const privHex = bytesToHex(privBytes);
  sessionStorage.setItem('torrent-rss-privkey', privHex);
  $('display-pubkey').textContent = bytesToHex(pubBytes);
  $('display-privkey').textContent = privHex;
  $('keypair-display').style.display = 'block';
  updateKeyDisplays();
});

// ---- Keys Tab: Register ----

$('btn-register').addEventListener('click', async () => {
  if (!pubBytes) return showStatus('register-status', 'Generate or load keys first.', 'err');
  const pubHex = bytesToHex(pubBytes);
  const label = $('input-label').value.trim() || undefined;
  const invite_code = $('input-invite').value.trim() || undefined;

  try {
    const res = await fetch('/api/channel', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pubkey: pubHex, label, invite_code })
    });
    const data = await res.json();
    if (!res.ok) return showStatus('register-status', `Error: ${data.error}`, 'err');
    showStatus('register-status', `Channel registered! RSS feed: ${location.origin}/rss/${pubHex}`, 'ok');
  } catch {
    showStatus('register-status', 'Network error — is the server running?', 'err');
  }
});

// ---- Keys Tab: Load ----

$('btn-load').addEventListener('click', async () => {
  try {
    await loadKeysFromHex($('input-privkey-load').value);
    showStatus('load-status', `Keys loaded. Public key: ${bytesToHex(pubBytes)}`, 'ok');
  } catch (err) {
    showStatus('load-status', err.message, 'err');
  }
});

// ---- Post Tab ----

$('btn-post').addEventListener('click', async () => {
  if (!privBytes) return showStatus('post-status', 'Load or generate keys first (Keys tab).', 'err');
  const content = $('input-content').value.trim();
  const title = $('input-title').value.trim() || undefined;
  if (!content) return showStatus('post-status', 'Content is required.', 'err');

  const timestamp = Date.now();
  const message = new TextEncoder().encode(`${timestamp}:${content}`);
  const sigBytes = await ed.signAsync(message, privBytes);

  try {
    const res = await fetch('/api/post', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        pubkey: bytesToHex(pubBytes),
        title,
        content,
        timestamp,
        signature: bytesToHex(sigBytes)
      })
    });
    const data = await res.json();
    if (!res.ok) return showStatus('post-status', `Error: ${data.error}`, 'err');
    showStatus('post-status', `Posted! Entry ID: ${data.id}`, 'ok');
    $('input-content').value = '';
    $('input-title').value = '';
  } catch {
    showStatus('post-status', 'Network error — is the server running?', 'err');
  }
});

// ---- Feed Tab: Look Up ----

$('btn-lookup-go').addEventListener('click', async () => {
  const pubkey = $('input-lookup-pubkey').value.trim().toLowerCase();
  if (!isValidHex64(pubkey)) {
    return showStatus('lookup-status', 'Must be exactly 64 lowercase hex characters.', 'err');
  }
  try {
    const res = await fetch(`/api/channel/${pubkey}`);
    const data = await res.json();
    if (!res.ok) return showStatus('lookup-status', `Not found: ${data.error}`, 'err');
    const feedUrl = `${location.origin}/rss/${pubkey}`;
    $('lookup-result').innerHTML = `
      <div style="margin-top:0.75rem;padding:0.75rem;background:#f9f9f9;border-radius:6px;font-size:0.875rem">
        <strong>${data.label ?? 'Unnamed channel'}</strong><br>
        Posts: ${data.post_count} &nbsp;·&nbsp; Created: ${new Date(data.created_at).toLocaleDateString()}<br>
        RSS: <a href="${feedUrl}" target="_blank" style="font-family:monospace;font-size:0.82rem">${feedUrl}</a>
      </div>
    `;
    showStatus('lookup-status', 'Channel found.', 'ok');
  } catch {
    showStatus('lookup-status', 'Network error.', 'err');
  }
});
