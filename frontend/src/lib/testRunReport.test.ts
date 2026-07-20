import { describe, expect, it, vi } from 'vitest';
import jsPDF from 'jspdf';
import type { TestResult, TestResultStatus } from '../types/testRun';
import { applyPdfInternalLinks, buildPdfInternalLinks } from './pdfInternalLinks';
import { summarizeTestResults } from './testRunSummary';

function result(id: string, status: TestResultStatus) {
  return { id, status } as TestResult;
}

describe('test run report data', () => {
  it('recalculates totals and percentages from the latest result statuses', () => {
    const before = summarizeTestResults([
      result('1', 'PASSED'),
      result('2', 'FAILED'),
      result('3', 'PENDING'),
    ]);
    const after = summarizeTestResults([
      result('1', 'FAILED'),
      result('2', 'FAILED'),
      result('3', 'SKIPPED'),
    ]);

    expect(before).toMatchObject({ passed: 1, failed: 1, notRun: 1, progressPercentage: 67 });
    expect(after).toMatchObject({ passed: 0, failed: 2, skipped: 1, notRun: 0, progressPercentage: 100 });
    expect(after.approvalPercentage).toBe(0);
  });

  it('creates links only for non-empty status sections and targets their pages', () => {
    const counts: Record<TestResultStatus, number> = {
      FAILED: 2,
      PASSED: 1,
      PENDING: 0,
      SKIPPED: 0,
    };
    const source = {
      FAILED: { page: 1, x: 20, y: 100, w: 40, h: 30 },
      PASSED: { page: 1, x: 63, y: 100, w: 40, h: 30 },
      PENDING: { page: 1, x: 149, y: 100, w: 40, h: 30 },
    };
    const targets = {
      FAILED: { page: 2, y: 25 },
      PASSED: { page: 4, y: 30 },
      PENDING: { page: 5, y: 35 },
    };
    const links = buildPdfInternalLinks(
      ['FAILED', 'PASSED', 'SKIPPED', 'PENDING'],
      counts,
      source,
      targets,
    );

    expect(links.map((link) => link.status)).toEqual(['FAILED', 'PASSED']);

    const doc = {
      getNumberOfPages: vi.fn(() => 5),
      link: vi.fn(),
      setPage: vi.fn(),
    };

    applyPdfInternalLinks(doc, links);

    expect(doc.link).toHaveBeenCalledWith(20, 100, 40, 30, expect.objectContaining({
      pageNumber: 2,
      top: 25,
    }));
    expect(doc.link).toHaveBeenCalledWith(63, 100, 40, 30, expect.objectContaining({
      pageNumber: 4,
      top: 30,
    }));
    expect(doc.setPage).toHaveBeenLastCalledWith(5);
  });

  it('writes a real internal GoTo annotation into a jsPDF document', () => {
    const doc = new jsPDF();
    doc.text('Resumo', 20, 20);
    doc.addPage();
    doc.text('Falhas', 20, 20);

    applyPdfInternalLinks(doc, [{
      source: { page: 1, x: 20, y: 25, w: 40, h: 20 },
      status: 'FAILED',
      target: { page: 2, y: 20 },
    }]);

    const pdf = doc.output();
    expect(pdf).toContain('/Subtype /Link');
    expect(pdf).toContain('/Dest [');
  });
});
