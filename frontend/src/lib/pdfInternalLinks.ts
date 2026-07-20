import type { TestResultStatus } from '../types/testRun';

export type PdfPosition = {
  page: number;
  y: number;
};

export type PdfLinkArea = PdfPosition & {
  h: number;
  w: number;
  x: number;
};

export type PdfInternalLink = {
  source: PdfLinkArea;
  status: TestResultStatus;
  target: PdfPosition;
};

type PdfLinkDocument = {
  getNumberOfPages: () => number;
  link: (x: number, y: number, w: number, h: number, options: Record<string, unknown>) => void;
  setPage: (page: number) => unknown;
};

export function buildPdfInternalLinks(
  statuses: TestResultStatus[],
  counts: Record<TestResultStatus, number>,
  sourceAreas: Partial<Record<TestResultStatus, PdfLinkArea>>,
  targets: Partial<Record<TestResultStatus, PdfPosition | null>>,
) {
  return statuses.flatMap<PdfInternalLink>((status) => {
    const source = sourceAreas[status];
    const target = targets[status];

    return counts[status] > 0 && source && target ? [{ source, status, target }] : [];
  });
}

export function applyPdfInternalLinks(doc: PdfLinkDocument, links: PdfInternalLink[]) {
  const finalPage = doc.getNumberOfPages();

  for (const link of links) {
    doc.setPage(link.source.page);
    doc.link(link.source.x, link.source.y, link.source.w, link.source.h, {
      left: 0,
      magFactor: 'XYZ',
      pageNumber: link.target.page,
      top: link.target.y,
      zoom: 0,
    });
  }

  doc.setPage(finalPage);
}
