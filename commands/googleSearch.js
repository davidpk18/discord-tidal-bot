const fetch = require('node-fetch');

async function googleTidalSearch(query, limit = 5) {
  const apiKey = process.env.GOOGLE_API_KEY;
  const cx = process.env.GOOGLE_CSE_ID;

  // Only search inside these Tidal paths
  const restrictTo = 'site:tidal.com/playlist/ OR site:tidal.com/track/ OR site:tidal.com/album/ OR site:tidal.com/browse/playlist/ OR site:tidal.com/browse/track/ OR site:tidal.com/browse/album/';
  const q = `${query} ${restrictTo}`;

  const url = `https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${cx}&q=${encodeURIComponent(q)}&num=${limit}`;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`Google API Error: ${res.statusText}`);

  const data = await res.json();

  return (data.items || []).map(item => {
    const link = item.link;
    let type = 'Unknown';
    if (link.includes('/album/')) type = 'Album';
    else if (link.includes('/track/')) type = 'Track';
    else if (link.includes('/playlist/')) type = 'Playlist';

    return {
      title: item.title,
      snippet: item.snippet,
      link,
      type,
      thumbnail: item.pagemap?.cse_image?.[0]?.src || null,
    };
  });
}

module.exports = { googleTidalSearch };
