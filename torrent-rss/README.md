# torrent-rss

A self-hosted web app for posting magnet/torrent links and consuming them as an RSS 2.0 feed. Compatible with qBittorrent, Transmission, and any RSS-aware torrent client.

**No accounts. No passwords.** Authentication is based on Ed25519 keypairs — generate a keypair in the browser, keep your private key, share your RSS feed URL (which is derived from your public key).

---

## Why This Exists

Most torrent clients (qBittorrent, Transmission, etc.) have a built-in RSS reader. When pointed at an RSS feed, the client either automatically starts downloading matching torrents or shows them in its RSS list — depending on your settings.

**The typical use case:** you're at work, at a coffee shop, or on your phone and want to queue something to download at home. Instead of remoting into your PC, you post the magnet link to your private feed. Your home torrent client is subscribed to that feed and picks it up automatically.

Key properties that make this practical:

- **No registration.** Authentication is a keypair you generate in the browser — no account, no password, no email.
- **Remote-friendly.** Post from any device with a browser. Your home client polls the feed and acts on it.
- **Shareable.** Give someone your feed URL and they receive everything you post — useful for sharing downloads with a household or a friend.

---

## How It Works

1. **Generate a keypair** in the browser (your private key never leaves your device)
2. **Register your channel** with the server (public key + optional invite code)
3. **Post magnet links** — each post is signed with your private key; the server verifies the signature
4. **Subscribe** in your torrent client using your RSS feed URL: `https://your-server/rss/<pubkey>`

Multiple people can use the same server, each with their own independent channel. The server owner can optionally require an invite code to restrict who can create new channels.

---

## Tech Stack

| Layer | Choice |
|---|---|
| Runtime | Node.js 20+ (ESM) |
| Framework | Express 4 |
| Database | SQLite via `@libsql/client` (Turso in production, local file in dev) |
| Crypto | `@noble/ed25519` v2 — server and browser |
| Frontend | Vanilla HTML/CSS/JS — no build step |

---

## Quick Start

### Bare Node.js

```bash
npm install
npm start
# Server runs on http://localhost:3000
```

### Docker Compose

```bash
docker compose up --build
# Server runs on http://localhost:3000
# SQLite data persists in a named Docker volume
```

### With invite code (restrict channel creation)

```bash
INVITE_CODE=yourpassword npm start
# or
INVITE_CODE=yourpassword docker compose up
```

---

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `PORT` | `3000` | HTTP port to listen on |
| `INVITE_CODE` | _(empty)_ | If set, required to create new channels. Leave empty for open registration. |
| `TURSO_DATABASE_URL` | _(empty)_ | Turso database URL (e.g. `libsql://your-db.turso.io`). If not set, falls back to a local file at `./data/torrent-rss.db`. |
| `TURSO_AUTH_TOKEN` | _(empty)_ | Turso auth token. Not required for local file databases. |

Copy `.env.example` to `.env` and edit as needed.

---

## API Reference

All endpoints return JSON (except RSS feeds, which return `application/rss+xml`).

### `POST /api/channel` — Register a channel

Creates a new channel identified by an Ed25519 public key.

**Body:**
```json
{
  "pubkey": "<64 hex chars — Ed25519 public key>",
  "label": "My Torrents",
  "invite_code": "yourpassword"
}
```
`label` and `invite_code` are optional. `invite_code` is only required if `INVITE_CODE` is set on the server.

**Responses:**
- `201` — channel created
- `400` — invalid pubkey format
- `403` — missing or wrong invite code
- `409` — channel already exists

---

### `POST /api/post` — Add a magnet/torrent link

Posts a new entry to a channel. Requires a valid Ed25519 signature.

**Body:**
```json
{
  "pubkey": "<64 hex chars>",
  "title": "Ubuntu 24.04 LTS",
  "content": "magnet:?xt=urn:btih:...",
  "timestamp": 1700000000000,
  "signature": "<128 hex chars — Ed25519 signature>"
}
```

`title` is optional but recommended — qBittorrent's auto-download rules match against the title.

**Signature:** Sign the UTF-8 bytes of `"${timestamp}:${content}"` with your Ed25519 private key.

**Replay protection:** The server rejects posts where `|Date.now() - timestamp| > 5 minutes`.

**Responses:**
- `201` — post created, returns `{ id, pubkey, title, content, created_at }`
- `400` — missing content
- `401` — invalid or expired signature
- `404` — channel not found (register first)

---

### `GET /rss/:pubkey` — RSS 2.0 feed

Returns up to 100 most recent entries for the channel. Also available as `/rss/:pubkey.xml`.

Subscribe in qBittorrent: **View → RSS Reader → Add feed** → paste the URL.

---

### `GET /api/channel/:pubkey` — Channel info

Returns channel metadata and post count.

---

## Posting via curl (scripting)

```bash
# 1. Generate a keypair (requires Node.js)
node -e "
import('@noble/ed25519').then(ed => {
  const priv = ed.utils.randomPrivateKey();
  ed.getPublicKeyAsync(priv).then(pub => {
    const toHex = b => Array.from(b, x => x.toString(16).padStart(2,'0')).join('');
    console.log('PRIV=' + toHex(priv));
    console.log('PUB='  + toHex(pub));
  });
});
"

# 2. Register your channel
curl -X POST https://your-server/api/channel \
  -H "Content-Type: application/json" \
  -d '{"pubkey":"<your-pubkey>","label":"My Feed","invite_code":"optional"}'

# 3. Post a link (sign timestamp:content with your private key)
# See post-example.js for a full scripting example
```

---

## Deploying to Hosted Platforms

### Database: Turso (required for hosted deployments)

Render's free tier has no persistent disk — the filesystem resets on every redeploy. The database is therefore hosted on [Turso](https://turso.tech), a free SQLite-compatible cloud service.

**One-time Turso setup:**

```bash
# Install Turso CLI
curl -sSfL https://get.tur.so/install.sh | bash

# Log in
turso auth login

# Create the database
turso db create torrent-rss

# Get the connection URL
turso db show torrent-rss --url
# → libsql://torrent-rss-<your-name>.turso.io

# Create an auth token
turso db tokens create torrent-rss
# → eyJ...
```

Set these as environment variables on whichever platform you deploy to:
- `TURSO_DATABASE_URL` = the URL from above
- `TURSO_AUTH_TOKEN` = the token from above

For **local development**, Turso is optional — if `TURSO_DATABASE_URL` is not set, the app falls back to a local SQLite file at `./data/torrent-rss.db`.

---

### Render (free tier)

A `render.yaml` blueprint is included. Steps:

1. Push the repo to GitHub
2. Go to [render.com](https://render.com) → **New** → **Blueprint**
3. Connect the repo — Render detects `render.yaml` automatically
4. In the **Environment** tab, set:
   - `TURSO_DATABASE_URL` — your Turso URL
   - `TURSO_AUTH_TOKEN` — your Turso token
   - `INVITE_CODE` — optional, restricts channel creation
5. Deploy

> **Free tier note:** The service spins down after 15 minutes of inactivity and takes ~30 seconds to wake on the next request. Data is safe in Turso regardless.

---

### Railway / Fly.io

Both support persistent volumes, so you can use either Turso or a local SQLite file on a mounted volume.

**With Turso (recommended):** set `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN` in environment variables — same as Render.

**With local SQLite on Railway:** Add a Volume → mount at `/data` → set `TURSO_DATABASE_URL=file:/data/torrent-rss.db`.

**With local SQLite on Fly.io:**
```bash
fly volumes create torrent_rss_data --size 1
# Add [mounts] to fly.toml: source = "torrent_rss_data", destination = "/data"
# Set TURSO_DATABASE_URL=file:/data/torrent-rss.db
```

---

### Bare VPS (with nginx)

```bash
# Install Node.js 20+, clone the repo, cd into torrent-rss/
npm install
TURSO_DATABASE_URL=file:./data/torrent-rss.db node server.js

# Nginx reverse proxy snippet:
# location / {
#   proxy_pass http://127.0.0.1:3000;
#   proxy_set_header Host $host;
#   proxy_set_header X-Forwarded-Proto $scheme;
# }
```

> **Note:** When behind a reverse proxy, ensure `X-Forwarded-Proto` is forwarded so RSS feed URLs use `https://` correctly. Express reads `req.protocol` from this header.

---

## Architecture

```
torrent-rss/
├── server.js        # Express app — all HTTP routes
├── db.js            # SQLite schema init + async query functions (via @libsql/client)
├── auth.js          # Ed25519 signature verification (server-side)
├── rss.js           # RSS 2.0 XML builder (hand-rolled, no library)
├── scripts/
│   └── vendor.js    # Copies @noble/ed25519 to public/vendor/ (runs on npm install)
└── public/
    ├── index.html   # Single-page UI: Keys / Post / Feed tabs
    ├── app.js       # Client-side: keypair generation, signing, API calls
    └── vendor/
        └── ed25519.js   # @noble/ed25519 vendored for browser — gitignored, auto-generated
```

### Auth flow detail

```
Client                                          Server
  │                                               │
  │  generate Ed25519 keypair (browser crypto)    │
  │──────────────────────────────────────────────▶│
  │  POST /api/channel { pubkey, invite_code? }   │
  │◀──────────────────────────────────────────────│  201 { pubkey, created_at }
  │                                               │
  │  sign("${timestamp}:${content}", privkey)     │
  │──────────────────────────────────────────────▶│
  │  POST /api/post { pubkey, content,            │  verify signature
  │                   timestamp, signature }       │  check timestamp ≤ 5 min old
  │◀──────────────────────────────────────────────│  201 { id, ... }
  │                                               │
  │  GET /rss/<pubkey>                            │
  │◀──────────────────────────────────────────────│  200 RSS 2.0 XML
```

### Why Ed25519?

- Zero server-side user management — no password storage, no session tokens
- Private key never transmitted to server
- Replay attacks are bounded by the 5-minute timestamp window
- Multiple people can post to one channel by sharing the private key

### Browser crypto vendoring

`@noble/ed25519` is a zero-dependency, single-file ESM library. After `npm install`, the `postinstall` script copies it to `public/vendor/ed25519.js` so it can be imported in the browser without a CDN or bundler. The vendored file is excluded from git (regenerated on every install).

---

## Database

All channels and posts share a single SQLite file. Users are separated by `pubkey` column — there is no per-user database.

```
channels table:          posts table:
┌──────────┬───────┐     ┌────┬──────────┬─────────────────┐
│ pubkey   │ label │     │ id │ pubkey   │ content         │
├──────────┼───────┤     ├────┼──────────┼─────────────────┤
│ abc123.. │ Alice │     │  1 │ abc123.. │ magnet:?xt=...  │
│ def456.. │ Bob   │     │  2 │ abc123.. │ magnet:?xt=...  │
└──────────┴───────┘     │  3 │ def456.. │ magnet:?xt=...  │
                         └────┴──────────┴─────────────────┘
```

### SQLite PRAGMAs

`PRAGMA` is SQLite's configuration and metadata API — there is no standard SQL equivalent. We set two on every connection startup in `db.js`:

| Pragma | Value | Effect |
|---|---|---|
| `journal_mode` | `WAL` | Write-Ahead Log — readers don't block writers, better concurrent performance |
| `foreign_keys` | `ON` | Enforce `REFERENCES` constraints — SQLite ignores them by default without this |

The `foreign_keys` pragma is critical: without it, SQLite silently accepts a post with a `pubkey` that doesn't exist in `channels`.

### Migrations

There is no migration framework. The schema is applied on every startup via `CREATE TABLE IF NOT EXISTS` in `db.js`. This means:

- **First run** — tables are created
- **Subsequent runs** — `IF NOT EXISTS` skips creation, existing data is untouched
- **Schema changes** — nothing runs automatically; the old schema stays and new code that expects new columns will break silently

If a schema change is needed, run `ALTER TABLE` manually against the live database, or implement a version-based migration runner using SQLite's built-in `PRAGMA user_version` as a schema version counter.

### Concurrent access

No lock issues for the recommended setup (Turso):

- **Turso handles concurrency server-side** — it is a remote SQLite service with proper connection management; no lock contention regardless of how many Node.js instances you run.
- **Local file fallback** uses WAL mode (`PRAGMA journal_mode = WAL`) — readers never block writers. Node.js's async event loop means requests are interleaved, not truly parallel, so write contention is minimal on a single instance.

**Local file + multiple instances:** Pointing multiple Node.js processes at the same SQLite file can produce `SQLITE_BUSY` errors under write contention. Use Turso if you need to scale horizontally.

### `.gitignore` entries

| Entry | Reason |
|---|---|
| `node_modules/` | npm packages — reinstalled via `npm install` |
| `data/` + `*.db*` | SQLite database and WAL/SHM side files — runtime data, not source |
| `.env` | Local secrets — never commit |
| `public/vendor/` | Vendored `ed25519.js` — regenerated by `npm install` |

---

## Security Notes

- Private keys are stored in `localStorage` — they persist across browser restarts on the device, so reopening the page restores your channel without re-pasting the key. Clear the browser site data to remove them. `localStorage` is readable by any JavaScript on this origin, so a successful XSS would exfiltrate the key — keep the deployment free of third-party scripts.
- The server never receives private keys
- The `INVITE_CODE` is a shared secret for channel creation, not per-user authentication
- SQLite WAL mode enables safe concurrent reads from multiple HTTP requests
- No rate limiting is included — add a reverse proxy (nginx, Caddy) with rate limiting for production use
