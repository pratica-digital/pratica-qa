import { describe, expect, it, vi } from 'vitest';
import { collectAllPages } from './pagination';

describe('collectAllPages', () => {
  it('loads every page while preserving the server order', async () => {
    const fetchPage = vi.fn(async (page: number) => ({
      data: page === 1 ? ['case-1', 'case-2'] : page === 2 ? ['case-3', 'case-4'] : ['case-5'],
      meta: { limit: 2, page, total: 5 },
    }));

    await expect(collectAllPages(fetchPage)).resolves.toEqual([
      'case-1',
      'case-2',
      'case-3',
      'case-4',
      'case-5',
    ]);
    expect(fetchPage).toHaveBeenCalledTimes(3);
    expect(fetchPage).toHaveBeenNthCalledWith(3, 3);
  });

  it('does not request nonexistent pages for an empty result', async () => {
    const fetchPage = vi.fn(async (page: number) => ({
      data: [],
      meta: { limit: 100, page, total: 0 },
    }));

    await expect(collectAllPages(fetchPage)).resolves.toEqual([]);
    expect(fetchPage).toHaveBeenCalledTimes(1);
  });
});
