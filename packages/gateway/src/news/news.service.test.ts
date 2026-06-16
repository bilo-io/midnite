import { afterEach, describe, expect, it, vi } from 'vitest';
import { NewsService } from './news.service';

function mockHn(items: Record<number, unknown>, ids: number[]) {
  return vi.fn(async (url: string | URL) => {
    const u = String(url);
    if (u.endsWith('/topstories.json')) {
      return new Response(JSON.stringify(ids), { status: 200 });
    }
    const match = u.match(/\/item\/(\d+)\.json$/);
    if (match) {
      const id = Number(match[1]);
      return new Response(JSON.stringify(items[id] ?? null), { status: 200 });
    }
    return new Response('not found', { status: 404 });
  });
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('NewsService', () => {
  it('maps HN items and respects the requested count', async () => {
    const ids = [1, 2, 3];
    const items = {
      1: { id: 1, title: 'First', url: 'https://a.test', score: 10, by: 'alice', descendants: 4, time: 100 },
      2: { id: 2, title: 'Second', score: 5, by: 'bob', descendants: 0, time: 200 }, // no url (Ask HN)
      3: { id: 3, title: 'Third', url: 'https://c.test', score: 1, by: 'carol', descendants: 2, time: 300 },
    };
    vi.stubGlobal('fetch', mockHn(items, ids));

    const service = new NewsService();
    const stories = await service.topStories(2);

    expect(stories).toHaveLength(2);
    expect(stories[0]).toEqual({
      id: 1,
      title: 'First',
      url: 'https://a.test',
      score: 10,
      by: 'alice',
      comments: 4,
      time: 100,
    });
    expect(stories[1]?.url).toBeUndefined();
    expect(stories[1]?.comments).toBe(0);
  });

  it('caches results across calls (one topstories fetch)', async () => {
    const fetchMock = mockHn({ 1: { id: 1, title: 'Only', score: 1, by: 'x', descendants: 0, time: 1 } }, [1]);
    vi.stubGlobal('fetch', fetchMock);

    const service = new NewsService();
    await service.topStories(1);
    await service.topStories(1);

    const topCalls = fetchMock.mock.calls.filter(([u]) => String(u).endsWith('/topstories.json'));
    expect(topCalls).toHaveLength(1);
  });

  it('drops items missing a title', async () => {
    vi.stubGlobal('fetch', mockHn({ 1: { id: 1, score: 1, by: 'x', time: 1 }, 2: { id: 2, title: 'Real', score: 2, by: 'y', descendants: 1, time: 2 } }, [1, 2]));

    const service = new NewsService();
    const stories = await service.topStories(10);

    expect(stories.map((s) => s.id)).toEqual([2]);
  });
});
