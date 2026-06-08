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

// ---- Passphrase-encrypted key storage (Web Crypto: PBKDF2 + AES-GCM) ----

const STORAGE_KEY = 'torrent-rss-privkey';
const PBKDF2_ITERS = 250_000;
const MIN_PASSPHRASE_LEN = 8;

async function deriveAesKey(passphrase, salt) {
  const baseKey = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(passphrase),
    'PBKDF2',
    false,
    ['deriveKey']
  );
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: PBKDF2_ITERS, hash: 'SHA-256' },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

async function encryptPrivBytes(plainBytes, passphrase) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveAesKey(passphrase, salt);
  const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, plainBytes);
  return JSON.stringify({
    v: 1,
    salt: bytesToHex(salt),
    iv: bytesToHex(iv),
    ct: bytesToHex(new Uint8Array(ct))
  });
}

async function decryptPrivBytes(blobJson, passphrase) {
  const blob = JSON.parse(blobJson);
  if (blob.v !== 1) throw new Error('Unknown stored-key format');
  const key = await deriveAesKey(passphrase, hexToBytes(blob.salt));
  const plain = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: hexToBytes(blob.iv) },
    key,
    hexToBytes(blob.ct)
  );
  return new Uint8Array(plain);
}

function readStoredBlob() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (parsed && parsed.v === 1 && parsed.salt && parsed.iv && parsed.ct) return raw;
  } catch { /* not JSON — legacy or junk */ }
  return null;
}

// ---- Key State ----

let privBytes = null;
let pubBytes = null;

async function setKeys(newPrivBytes) {
  privBytes = newPrivBytes;
  pubBytes = await ed.getPublicKeyAsync(privBytes);
  updateKeyDisplays();
  updateLockState();
}

function clearKeysInMemory() {
  privBytes = null;
  pubBytes = null;
  $('keypair-display').style.display = 'none';
  $('post-pubkey-display').textContent = 'no keys loaded';
  $('feed-info').innerHTML = '<p style="color:#999;font-size:0.875rem">Load or generate keys (Keys tab) to see your feed URL.</p>';
  updateLockState();
}

function updateKeyDisplays() {
  if (!pubBytes) return;
  const pubHex = bytesToHex(pubBytes);
  $('post-pubkey-display').textContent = pubHex;

  const feedUrl = `${location.origin}/rss/${pubHex}`;
  const channelUrl = `${location.origin}/channel/${pubHex}`;
  $('feed-info').innerHTML = `
    <label>RSS Feed URL
      <div style="display:flex;gap:0.5rem;align-items:center;flex-wrap:wrap;margin-top:0.3rem">
        <a class="mono" href="${feedUrl}" target="_blank" style="flex:1">${feedUrl}</a>
        <button class="secondary" id="btn-copy-feed" style="flex-shrink:0;font-size:0.8rem;padding:0.3rem 0.7rem">Copy</button>
      </div>
    </label>
    <p style="font-size:0.875rem;margin:0.75rem 0 0">Browse posts: <a href="${channelUrl}" target="_blank">${channelUrl}</a></p>
    <p style="font-size:0.8rem;color:#666;margin:0.5rem 0 0">Channel public key: <span style="font-family:monospace;font-size:0.78rem">${pubHex}</span></p>
  `;
  $('btn-copy-feed')?.addEventListener('click', () => {
    navigator.clipboard.writeText(feedUrl).then(() => {
      $('btn-copy-feed').textContent = 'Copied!';
      setTimeout(() => { if ($('btn-copy-feed')) $('btn-copy-feed').textContent = 'Copy'; }, 1500);
    });
  });
}

function updateLockState() {
  const hasStored = !!readStoredBlob();
  const locked = !privBytes;
  $('unlock-card').style.display = (hasStored && locked) ? 'block' : 'none';
  $('clear-storage-card').style.display = hasStored ? 'block' : 'none';
}

updateLockState();

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

// ---- Keys Tab: Unlock ----

$('btn-unlock').addEventListener('click', async () => {
  const passphrase = $('input-unlock-pass').value;
  const blob = readStoredBlob();
  if (!blob) return showStatus('unlock-status', 'No stored keys to unlock.', 'err');
  if (!passphrase) return showStatus('unlock-status', 'Enter your passphrase.', 'err');
  try {
    const priv = await decryptPrivBytes(blob, passphrase);
    await setKeys(priv);
    $('input-unlock-pass').value = '';
    showStatus('unlock-status', `Unlocked. Public key: ${bytesToHex(pubBytes)}`, 'ok');
  } catch {
    showStatus('unlock-status', 'Wrong passphrase or corrupted data.', 'err');
  }
});

// ---- Keys Tab: Generate ----

$('btn-generate').addEventListener('click', async () => {
  const pass = $('input-generate-pass').value;
  const confirmPass = $('input-generate-pass-confirm').value;
  if (pass.length < MIN_PASSPHRASE_LEN) {
    return showStatus('generate-status', `Passphrase must be at least ${MIN_PASSPHRASE_LEN} characters.`, 'err');
  }
  if (pass !== confirmPass) {
    return showStatus('generate-status', 'Passphrases do not match.', 'err');
  }

  const newPriv = ed.utils.randomPrivateKey();
  try {
    const blob = await encryptPrivBytes(newPriv, pass);
    localStorage.setItem(STORAGE_KEY, blob);
  } catch (e) {
    return showStatus('generate-status', `Could not encrypt key: ${e.message}`, 'err');
  }
  await setKeys(newPriv);
  $('display-pubkey').textContent = bytesToHex(pubBytes);
  $('display-privkey').textContent = bytesToHex(privBytes);
  $('keypair-display').style.display = 'block';
  $('input-generate-pass').value = '';
  $('input-generate-pass-confirm').value = '';
  showStatus('generate-status', 'Keypair generated and encrypted in browser storage.', 'ok');
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
  const privHex = $('input-privkey-load').value.trim().toLowerCase();
  const pass = $('input-load-pass').value;
  const confirmPass = $('input-load-pass-confirm').value;
  if (!isValidHex64(privHex)) {
    return showStatus('load-status', 'Private key must be exactly 64 lowercase hex characters.', 'err');
  }
  if (pass.length < MIN_PASSPHRASE_LEN) {
    return showStatus('load-status', `Passphrase must be at least ${MIN_PASSPHRASE_LEN} characters.`, 'err');
  }
  if (pass !== confirmPass) {
    return showStatus('load-status', 'Passphrases do not match.', 'err');
  }

  const newPriv = hexToBytes(privHex);
  try {
    const blob = await encryptPrivBytes(newPriv, pass);
    localStorage.setItem(STORAGE_KEY, blob);
  } catch (e) {
    return showStatus('load-status', `Could not encrypt key: ${e.message}`, 'err');
  }
  await setKeys(newPriv);
  $('input-privkey-load').value = '';
  $('input-load-pass').value = '';
  $('input-load-pass-confirm').value = '';
  showStatus('load-status', `Keys loaded and encrypted in browser storage. Public key: ${bytesToHex(pubBytes)}`, 'ok');
});

// ---- Keys Tab: Clear Stored Keys ----

$('btn-clear-storage').addEventListener('click', () => {
  if (!confirm('Remove the encrypted keys from this browser? You will need your private key and passphrase to restore access.')) return;
  localStorage.removeItem(STORAGE_KEY);
  clearKeysInMemory();
  showStatus('clear-status', 'Stored keys removed from this browser.', 'ok');
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
    const channelUrl = `${location.origin}/channel/${pubkey}`;
    $('lookup-result').innerHTML = `
      <div style="margin-top:0.75rem;padding:0.75rem;background:#f9f9f9;border-radius:6px;font-size:0.875rem">
        <strong>${data.label ?? 'Unnamed channel'}</strong><br>
        Posts: ${data.post_count} &nbsp;·&nbsp; Created: ${new Date(data.created_at).toLocaleDateString()}<br>
        Browse: <a href="${channelUrl}" target="_blank" style="font-family:monospace;font-size:0.82rem">${channelUrl}</a><br>
        RSS: <a href="${feedUrl}" target="_blank" style="font-family:monospace;font-size:0.82rem">${feedUrl}</a>
      </div>
    `;
    showStatus('lookup-status', 'Channel found.', 'ok');
  } catch {
    showStatus('lookup-status', 'Network error.', 'err');
  }
});
