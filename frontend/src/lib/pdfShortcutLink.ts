import type { TestResult } from "../types/testRun";

export const PDF_SHORTCUT_LINK_LABEL = "Acessar card no Shortcut";

type ShortcutResult = Pick<TestResult, 'shortcutStoryUrl' | 'status'>;

export function getPdfShortcutStoryUrl(result: ShortcutResult) {
  if (result.status !== "FAILED") {
    return null;
  }

  const value = result.shortcutStoryUrl?.trim();

  if (!value) {
    return null;
  }

  try {
    const url = new URL(value);

    if (
      (url.protocol !== "http:" && url.protocol !== "https:") ||
      !url.hostname
    ) {
      return null;
    }

    return url.href;
  } catch {
    return null;
  }
}
