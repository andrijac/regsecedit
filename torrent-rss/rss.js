function escapeXml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export function buildRss(channel, posts, baseUrl) {
  const label = channel.label ?? channel.pubkey.slice(0, 16) + '...';
  const feedUrl = `${baseUrl}/rss/${channel.pubkey}`;
  const lastBuild = posts.length > 0
    ? new Date(posts[0].created_at).toUTCString()
    : new Date().toUTCString();

  const items = posts.map(post => {
    const title = escapeXml(post.title ?? post.content.slice(0, 100));
    return `    <item>
      <title>${title}</title>
      <link>${escapeXml(post.content)}</link>
      <description>${escapeXml(post.content)}</description>
      <guid isPermaLink="false">${escapeXml(feedUrl)}#${post.id}</guid>
      <pubDate>${new Date(post.created_at).toUTCString()}</pubDate>
    </item>`;
  }).join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(label)}</title>
    <link>${escapeXml(feedUrl)}</link>
    <description>Torrent RSS feed for ${escapeXml(label)}</description>
    <atom:link href="${escapeXml(feedUrl)}" rel="self" type="application/rss+xml"/>
    <lastBuildDate>${lastBuild}</lastBuildDate>
${items}
  </channel>
</rss>`;
}
