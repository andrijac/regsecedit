import { createClient } from '@libsql/client';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

const url = process.env.TURSO_DATABASE_URL ?? 'file:./data/torrent-rss.db';

// For local file databases, ensure the directory exists
if (url.startsWith('file:') && !url.includes(':memory:')) {
  mkdirSync(dirname(url.slice(5)), { recursive: true });
}

const db = createClient({ url, authToken: process.env.TURSO_AUTH_TOKEN });

// Enable WAL and foreign keys for local file databases
// (Turso manages these server-side for remote connections)
if (url.startsWith('file:')) {
  await db.execute('PRAGMA journal_mode = WAL');
  await db.execute('PRAGMA foreign_keys = ON');
}

await db.batch([
  `CREATE TABLE IF NOT EXISTS channels (
    pubkey     TEXT PRIMARY KEY,
    created_at INTEGER NOT NULL,
    label      TEXT
  )`,
  `CREATE TABLE IF NOT EXISTS posts (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    pubkey     TEXT    NOT NULL REFERENCES channels(pubkey),
    title      TEXT,
    content    TEXT    NOT NULL,
    created_at INTEGER NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS idx_posts_pubkey_created ON posts(pubkey, created_at DESC)`,
], 'write');

export async function channelExists(pubkey) {
  const result = await db.execute({ sql: 'SELECT 1 FROM channels WHERE pubkey = ?', args: [pubkey] });
  return result.rows.length > 0;
}

export async function createChannel(pubkey, label) {
  const now = Date.now();
  await db.execute({ sql: 'INSERT INTO channels (pubkey, created_at, label) VALUES (?, ?, ?)', args: [pubkey, now, label ?? null] });
  return { pubkey, created_at: now, label: label ?? null };
}

export async function getChannel(pubkey) {
  const [channelResult, countResult] = await db.batch([
    { sql: 'SELECT * FROM channels WHERE pubkey = ?', args: [pubkey] },
    { sql: 'SELECT COUNT(*) as n FROM posts WHERE pubkey = ?', args: [pubkey] },
  ], 'read');
  if (channelResult.rows.length === 0) return null;
  const row = channelResult.rows[0];
  return {
    pubkey: row.pubkey,
    created_at: Number(row.created_at),
    label: row.label ?? null,
    post_count: Number(countResult.rows[0].n),
  };
}

export async function createPost(pubkey, title, content) {
  const now = Date.now();
  const result = await db.execute({
    sql: 'INSERT INTO posts (pubkey, title, content, created_at) VALUES (?, ?, ?, ?)',
    args: [pubkey, title ?? null, content, now],
  });
  return { id: Number(result.lastInsertRowid), pubkey, title: title ?? null, content, created_at: now };
}

export async function getPostsByChannel(pubkey, limit = 100) {
  const result = await db.execute({
    sql: 'SELECT * FROM posts WHERE pubkey = ? ORDER BY created_at DESC LIMIT ?',
    args: [pubkey, limit],
  });
  return result.rows.map(row => ({
    id: Number(row.id),
    pubkey: row.pubkey,
    title: row.title ?? null,
    content: row.content,
    created_at: Number(row.created_at),
  }));
}
