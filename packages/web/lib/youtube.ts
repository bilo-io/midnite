// Parse a YouTube URL into its embed URL, or null if it isn't a recognizable
// YouTube video link. Handles youtu.be/<id>, watch?v=<id>, /embed/<id>, and
// /shorts/<id>.
export function youtubeEmbedUrl(url: string | undefined): string | null {
  if (!url) return null;
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  const host = parsed.hostname.toLowerCase().replace(/^www\./, '');
  let id: string | null = null;

  if (host === 'youtu.be') {
    id = parsed.pathname.split('/').filter(Boolean)[0] ?? null;
  } else if (host === 'youtube.com' || host === 'm.youtube.com' || host === 'youtube-nocookie.com') {
    if (parsed.pathname === '/watch') {
      id = parsed.searchParams.get('v');
    } else {
      const parts = parsed.pathname.split('/').filter(Boolean);
      if (parts[0] === 'embed' || parts[0] === 'shorts' || parts[0] === 'v') {
        id = parts[1] ?? null;
      }
    }
  }

  if (!id || !/^[\w-]{6,}$/.test(id)) return null;
  return `https://www.youtube.com/embed/${id}`;
}
