export const POSTS_PER_PAGE = 20;

function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function isSafeUrl(url) {
  return /^(magnet:|https?:\/\/)/i.test(String(url).trim());
}

function formatDate(ms) {
  return new Date(ms).toISOString().replace('T', ' ').slice(0, 16) + ' UTC';
}

function renderPost(post) {
  const title = post.title ?? post.content.slice(0, 100);
  const safeTitle = escapeHtml(title);
  const safeContent = escapeHtml(post.content);
  const isoDate = new Date(post.created_at).toISOString();
  const displayDate = formatDate(post.created_at);

  const link = isSafeUrl(post.content)
    ? `<a class="post-link" href="${safeContent}" rel="nofollow noopener">${safeContent}</a>`
    : `<span class="post-link">${safeContent}</span>`;

  return `      <article class="post">
        <h3 class="post-title">${safeTitle}</h3>
        ${link}
        <time class="post-date" datetime="${isoDate}">${displayDate}</time>
      </article>`;
}

function renderPagination(page, totalPages, channelUrl) {
  if (totalPages <= 1) return '';
  const prev = page > 1
    ? `<a class="page-btn" href="${channelUrl}?page=${page - 1}" rel="prev">&larr; Previous</a>`
    : `<span class="page-btn disabled">&larr; Previous</span>`;
  const next = page < totalPages
    ? `<a class="page-btn" href="${channelUrl}?page=${page + 1}" rel="next">Next &rarr;</a>`
    : `<span class="page-btn disabled">Next &rarr;</span>`;
  return `    <nav class="pagination" aria-label="Pagination">
      ${prev}
      <span class="page-info">Page ${page} of ${totalPages}</span>
      ${next}
    </nav>`;
}

export function renderChannelPage({ channel, posts, page, totalPages, baseUrl }) {
  const label = channel.label ?? channel.pubkey.slice(0, 16) + '...';
  const safeLabel = escapeHtml(label);
  const safePubkey = escapeHtml(channel.pubkey);
  const feedUrl = `${baseUrl}/rss/${channel.pubkey}`;
  const channelUrl = `${baseUrl}/channel/${channel.pubkey}`;
  const safeFeedUrl = escapeHtml(feedUrl);

  const start = channel.post_count === 0 ? 0 : (page - 1) * POSTS_PER_PAGE + 1;
  const end = Math.min(start + posts.length - 1, channel.post_count);
  const showing = channel.post_count === 0
    ? 'No posts yet.'
    : `Showing ${start}–${end} of ${channel.post_count} post${channel.post_count === 1 ? '' : 's'}.`;

  const postsHtml = posts.length === 0
    ? `      <p class="empty">No posts on this page.</p>`
    : posts.map(renderPost).join('\n');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${safeLabel} — Torrent RSS</title>
  <link rel="alternate" type="application/rss+xml" title="${safeLabel}" href="${safeFeedUrl}">
  <style>
    *, *::before, *::after { box-sizing: border-box; }
    body {
      font-family: system-ui, -apple-system, sans-serif;
      max-width: 760px;
      margin: 2rem auto;
      padding: 0 1rem;
      color: #1a1a1a;
      background: #f8f8f8;
    }
    .back { color: #555; text-decoration: none; font-size: 0.875rem; }
    .back:hover { color: #e63946; }
    h1 { margin: 0.5rem 0 0.25rem; }
    h1 span { color: #e63946; }
    .pubkey {
      font-family: monospace;
      font-size: 0.78rem;
      color: #666;
      word-break: break-all;
      margin: 0 0 0.5rem;
    }
    .feed { font-size: 0.875rem; color: #555; margin: 0 0 1.5rem; }
    .feed a { color: #e63946; word-break: break-all; }
    hr { border: 0; border-top: 1px solid #ddd; margin: 1.5rem 0; }
    .showing { font-size: 0.875rem; color: #666; margin: 0 0 1rem; }
    .posts { display: flex; flex-direction: column; gap: 0.75rem; }
    .post {
      background: white;
      border: 1px solid #e0e0e0;
      border-radius: 8px;
      padding: 1rem 1.25rem;
    }
    .post-title {
      font-size: 1rem;
      margin: 0 0 0.5rem;
      word-break: break-word;
    }
    .post-link {
      display: block;
      font-family: monospace;
      font-size: 0.8rem;
      color: #1e40af;
      word-break: break-all;
      background: #f0f0f0;
      padding: 0.4rem 0.6rem;
      border-radius: 4px;
      text-decoration: none;
    }
    .post-link:hover { background: #e5e5e5; text-decoration: underline; }
    .post-date {
      display: block;
      font-size: 0.78rem;
      color: #888;
      margin-top: 0.5rem;
    }
    .empty {
      text-align: center;
      color: #999;
      padding: 2rem 0;
    }
    .pagination {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-top: 1.5rem;
      gap: 0.5rem;
      flex-wrap: wrap;
    }
    .page-btn {
      padding: 0.5rem 1rem;
      background: #e63946;
      color: white;
      border-radius: 4px;
      text-decoration: none;
      font-size: 0.9rem;
    }
    .page-btn:hover { background: #c1121f; }
    .page-btn.disabled {
      background: #ccc;
      color: #888;
      cursor: not-allowed;
    }
    .page-info { font-size: 0.875rem; color: #555; }
  </style>
</head>
<body>
  <header>
    <p><a class="back" href="/">&larr; Home</a></p>
    <h1>${safeLabel}</h1>
    <p class="pubkey">${safePubkey}</p>
    <p class="feed">RSS feed: <a href="${safeFeedUrl}">${safeFeedUrl}</a></p>
  </header>
  <hr>
  <p class="showing">${showing}</p>
  <section class="posts">
${postsHtml}
  </section>
${renderPagination(page, totalPages, channelUrl)}
</body>
</html>
`;
}

export function renderNotFoundPage(message) {
  const safeMessage = escapeHtml(message);
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Channel not found — Torrent RSS</title>
  <style>
    body {
      font-family: system-ui, -apple-system, sans-serif;
      max-width: 600px;
      margin: 4rem auto;
      padding: 0 1rem;
      text-align: center;
      color: #1a1a1a;
    }
    h1 { color: #e63946; }
    a { color: #e63946; }
  </style>
</head>
<body>
  <h1>Channel not found</h1>
  <p>${safeMessage}</p>
  <p><a href="/">&larr; Back to home</a></p>
</body>
</html>
`;
}
