import jsPDF from 'jspdf';
import { describe, expect, it } from 'vitest';
import type { TestResult } from '../types/testRun';
import {
  getPdfShortcutStoryUrl,
  PDF_SHORTCUT_LINK_LABEL,
} from './pdfShortcutLink';

function result(status: TestResult['status'], shortcutStoryUrl?: string | null) {
  return { shortcutStoryUrl, status } as TestResult;
}

describe('Shortcut links in test report PDFs', () => {
  it('returns the real Shortcut Story URL for a failed test', () => {
    expect(
      getPdfShortcutStoryUrl(
        result('FAILED', ' https://app.shortcut.com/acme/story/321/failing-checkout '),
      ),
    ).toBe('https://app.shortcut.com/acme/story/321/failing-checkout');
  });

  it('does not expose a link without a linked Story or for a non-failed test', () => {
    expect(getPdfShortcutStoryUrl(result('FAILED', null))).toBeNull();
    expect(
      getPdfShortcutStoryUrl({
        shortcutStoryId: '321',
        shortcutStoryUrl: null,
        status: 'FAILED',
      } as TestResult),
    ).toBeNull();
    expect(getPdfShortcutStoryUrl(result('FAILED', 'undefined'))).toBeNull();
    expect(getPdfShortcutStoryUrl(result('FAILED', 'javascript:alert(1)'))).toBeNull();
    expect(
      getPdfShortcutStoryUrl(result('PASSED', 'https://app.shortcut.com/acme/story/321')),
    ).toBeNull();
  });

  it('writes a clickable external URI annotation without displaying the long URL', () => {
    const url = getPdfShortcutStoryUrl(
      result('FAILED', 'https://app.shortcut.com/acme/story/987/a-very-long-story-slug'),
    );
    const doc = new jsPDF();

    expect(url).not.toBeNull();
    doc.text(PDF_SHORTCUT_LINK_LABEL, 20, 20);
    doc.link(20, 16, doc.getTextWidth(PDF_SHORTCUT_LINK_LABEL), 5, { url: url! });

    const pdf = doc.output();
    expect(pdf).toContain('/Subtype /Link');
    expect(pdf).toContain('/URI (https://app.shortcut.com/acme/story/987/a-very-long-story-slug)');
    expect(doc.getTextWidth(PDF_SHORTCUT_LINK_LABEL)).toBeLessThan(170);
  });
});
