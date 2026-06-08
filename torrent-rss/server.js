import express from 'express';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import * as db from './db.js';
import { verifyPost, isValidPubkeyFormat } from './auth.js';
import { buildRss } from './rss.js';
import { renderChannelPage, renderNotFoundPage, POSTS_PER_PAGE } from './channelPage.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT ?? 3000;

app.use(express.json());
app.use(express.static(join(__dirname, 'public')));

app.post('/api/channel', async (req, res) => {
  const { pubkey, invite_code, label } = req.body ?? {};

  const inviteRequired = process.env.INVITE_CODE;
  if (inviteRequired && invite_code !== inviteRequired) {
    return res.status(403).json({ error: 'Invalid or missing invite code' });
  }
  if (!isValidPubkeyFormat(pubkey)) {
    return res.status(400).json({ error: 'pubkey must be 64 lowercase hex chars (Ed25519 public key)' });
  }
  if (await db.channelExists(pubkey)) {
    return res.status(409).json({ error: 'Channel already exists' });
  }

  const channel = await db.createChannel(pubkey, label);
  res.status(201).json(channel);
});

app.post('/api/post', async (req, res) => {
  const { pubkey, title, content, timestamp, signature } = req.body ?? {};

  if (!content || typeof content !== 'string' || content.trim() === '') {
    return res.status(400).json({ error: 'content is required' });
  }
  if (!(await db.channelExists(pubkey))) {
    return res.status(404).json({ error: 'Channel not found — register it first via POST /api/channel' });
  }

  try {
    await verifyPost({ pubkey, content, timestamp, signature });
  } catch (err) {
    return res.status(401).json({ error: err.message });
  }

  const post = await db.createPost(pubkey, title, content);
  res.status(201).json(post);
});

async function rssHandler(req, res) {
  const pubkey = req.params.pubkey.replace(/\.xml$/, '');
  if (!isValidPubkeyFormat(pubkey)) {
    return res.status(400).type('text/plain').send('Invalid pubkey format');
  }
  const channel = await db.getChannel(pubkey);
  if (!channel) {
    return res.status(404).type('text/plain').send('Channel not found');
  }
  const posts = await db.getPostsByChannel(pubkey);
  const baseUrl = `${req.protocol}://${req.get('host')}`;
  res.type('application/rss+xml').send(buildRss(channel, posts, baseUrl));
}

app.get('/rss/:pubkey', rssHandler);
app.get('/rss/:pubkey.xml', rssHandler);

app.get('/channel/:pubkey', async (req, res) => {
  const { pubkey } = req.params;
  if (!isValidPubkeyFormat(pubkey)) {
    return res.status(400).type('html').send(renderNotFoundPage('Invalid pubkey format — must be 64 lowercase hex characters.'));
  }
  const channel = await db.getChannel(pubkey);
  if (!channel) {
    return res.status(404).type('html').send(renderNotFoundPage('No channel is registered for that public key.'));
  }

  const totalPages = Math.max(1, Math.ceil(channel.post_count / POSTS_PER_PAGE));
  const requestedPage = parseInt(req.query.page, 10);
  const page = Number.isFinite(requestedPage) && requestedPage >= 1
    ? Math.min(requestedPage, totalPages)
    : 1;
  const offset = (page - 1) * POSTS_PER_PAGE;
  const posts = await db.getPostsByChannelPaged(pubkey, POSTS_PER_PAGE, offset);
  const baseUrl = `${req.protocol}://${req.get('host')}`;
  res.type('html').send(renderChannelPage({ channel, posts, page, totalPages, baseUrl }));
});

app.get('/api/channel/:pubkey', async (req, res) => {
  const { pubkey } = req.params;
  if (!isValidPubkeyFormat(pubkey)) {
    return res.status(400).json({ error: 'Invalid pubkey format' });
  }
  const channel = await db.getChannel(pubkey);
  if (!channel) return res.status(404).json({ error: 'Channel not found' });
  res.json(channel);
});

app.listen(PORT, () => {
  console.log(`torrent-rss running on port ${PORT}`);
});
