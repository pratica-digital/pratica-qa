import type { PaginatedResponse } from '../types/testRun';

export async function collectAllPages<T>(
  fetchPage: (page: number) => Promise<PaginatedResponse<T>>,
) {
  const firstPage = await fetchPage(1);
  const items = [...firstPage.data];
  const pageSize = Math.max(1, (firstPage.meta?.limit ?? items.length) || 1);
  const totalPages = Math.ceil((firstPage.meta?.total ?? items.length) / pageSize);

  for (let page = 2; page <= totalPages; page += 1) {
    const nextPage = await fetchPage(page);
    items.push(...nextPage.data);
  }

  return items;
}
