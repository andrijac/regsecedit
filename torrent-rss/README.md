# torrent-rss

A self-hosted web app for posting magnet/torrent links and consuming them as an RSS 2.0 feed. Compatible with qBittorrent, Transmission, and any RSS-aware torrent client.

**No accounts. No passwords.** Authentication is based on Ed25519 keypairs — generate a keypair in the browser, keep your private key, share your RSS feed URL (which is derived from your public key).

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
| Database | SQLite (`better-sqlite3`, WAL mode) |
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
| `DATABASE_PATH` | `./data/torrent-rss.db` | Path to the SQLite database file |

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

### Railway / Render / Fly.io

These platforms auto-detect `package.json`, run `npm ci` (which also vendors the browser crypto library via `postinstall`), and execute `npm start`.

**Required steps:**
1. Set `INVITE_CODE` in the platform's environment variables (optional but recommended)
2. Mount a persistent volume and set `DATABASE_PATH` to a path on that volume (e.g. `/data/torrent-rss.db`)

**Railway:** Add a Volume → mount at `/data` → set `DATABASE_PATH=/data/torrent-rss.db`.

**Render:** Add a Disk → mount at `/data` → set `DATABASE_PATH=/data/torrent-rss.db`.

**Fly.io:**
```bash
fly volumes create torrent_rss_data --size 1
# Add [mounts] to fly.toml: source = "torrent_rss_data", destination = "/data"
```

### Bare VPS (with nginx)

```bash
# Install Node.js 20+
# Clone repo, cd into torrent-rss/
npm install
PORT=3000 DATABASE_PATH=/var/lib/torrent-rss/db.sqlite node server.js

# Nginx reverse proxy (snippet):
# location / {
#   proxy_pass http://127.0.0.1:3000;
#   proxy_set_header Host $host;
#   proxy_set_header X-Forwarded-Proto $scheme;
# }
```

> **Note:** When behind a reverse proxy, ensure `X-Forwarded-Proto` is forwarded so the RSS feed URL uses `https://` correctly. Express reads `req.protocol` from this header.

---

## Architecture

```
torrent-rss/
├── server.js        # Express app — all HTTP routes
├── db.js            # SQLite schema init + synchronous query functions
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

### Migrations

There is no migration framework. The schema is applied on every startup via `CREATE TABLE IF NOT EXISTS` in `db.js`. This means:

- **First run** — tables are created
- **Subsequent runs** — `IF NOT EXISTS` skips creation, existing data is untouched
- **Schema changes** — nothing runs automatically; the old schema stays and new code that expects new columns will break silently

If a schema change is needed, run `ALTER TABLE` manually against the live database, or implement a version-based migration runner using SQLite's built-in `PRAGMA user_version` as a schema version counter.

### Concurrent access

No lock issues for a single-instance deployment, for two reasons:

1. **Node.js is single-threaded + `better-sqlite3` is synchronous** — DB operations are naturally serialized within the process; two requests can never write simultaneously.
2. **WAL mode** (`PRAGMA journal_mode = WAL`) — readers never block writers and writers never block readers, so RSS feed reads don't stall incoming posts.

**Horizontal scaling caveat:** SQLite is a file, not a server. Pointing multiple Node.js instances at the same file works for reads but will produce `SQLITE_BUSY` errors under write contention. If you need horizontal scaling, swap `db.js` for a Postgres client — the rest of the app is unchanged.

### `.gitignore` entries

| Entry | Reason |
|---|---|
| `node_modules/` | npm packages — reinstalled via `npm install` |
| `data/` + `*.db*` | SQLite database and WAL/SHM side files — runtime data, not source |
| `.env` | Local secrets — never commit |
| `public/vendor/` | Vendored `ed25519.js` — regenerated by `npm install` |

---

## Security Notes

- Private keys are stored in `sessionStorage` only — they disappear when the browser tab closes
- The server never receives private keys
- The `INVITE_CODE` is a shared secret for channel creation, not per-user authentication
- SQLite WAL mode enables safe concurrent reads from multiple HTTP requests
- No rate limiting is included — add a reverse proxy (nginx, Caddy) with rate limiting for production use
