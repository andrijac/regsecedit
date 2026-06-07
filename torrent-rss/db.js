import Database from 'better-sqlite3';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

const dbPath = process.env.DATABASE_PATH ?? './data/torrent-rss.db';
mkdirSync(dirname(dbPath), { recursive: true });

const db = new Database(dbPath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS channels (
    pubkey     TEXT PRIMARY KEY,
    created_at INTEGER NOT NULL,
    label      TEXT
  );
  CREATE TABLE IF NOT EXISTS posts (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    pubkey     TEXT    NOT NULL REFERENCES channels(pubkey),
    title      TEXT,
    content    TEXT    NOT NULL,
    created_at INTEGER NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_posts_pubkey_created ON posts(pubkey, created_at DESC);
`);

export function channelExists(pubkey) {
  return db.prepare('SELECT 1 FROM channels WHERE pubkey = ?').get(pubkey) != null;
}

export function createChannel(pubkey, label) {
  const now = Date.now();
  db.prepare('INSERT INTO channels (pubkey, created_at, label) VALUES (?, ?, ?)').run(pubkey, now, label ?? null);
  return { pubkey, created_at: now, label: label ?? null };
}

export function getChannel(pubkey) {
  const channel = db.prepare('SELECT * FROM channels WHERE pubkey = ?').get(pubkey);
  if (!channel) return null;
  const { n } = db.prepare('SELECT COUNT(*) as n FROM posts WHERE pubkey = ?').get(pubkey);
  return { ...channel, post_count: n };
}

export function createPost(pubkey, title, content) {
  const now = Date.now();
  const result = db.prepare(
    'INSERT INTO posts (pubkey, title, content, created_at) VALUES (?, ?, ?, ?)'
  ).run(pubkey, title ?? null, content, now);
  return { id: result.lastInsertRowid, pubkey, title: title ?? null, content, created_at: now };
}

export function getPostsByChannel(pubkey, limit = 100) {
  return db.prepare(
    'SELECT * FROM posts WHERE pubkey = ? ORDER BY created_at DESC LIMIT ?'
  ).all(pubkey, limit);
}
