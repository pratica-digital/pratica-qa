import { afterEach, describe, expect, it, vi } from "vitest";
import type { TestResultAttachment } from "../types/testRun";
import {
  calculatePdfImagePlacement,
  canEmbedMorePdfEvidence,
  formatAttachmentSize,
  getAttachmentTypeLabel,
  orderPdfEvidenceAttachments,
  preparePdfEvidenceImage,
  shouldStartNewPdfPage,
} from "./pdfEvidence";

function attachment(mimeType: string): TestResultAttachment {
  return {
    createdAt: "2026-07-21T10:00:00.000Z",
    fileName: "stored-file",
    id: "attachment-id",
    mimeType,
    originalName: "evidência çãõ.png",
    size: 2048,
    testCaseId: "case-id",
    testResultId: "result-id",
    testRunId: "run-id",
    url: "/uploads/test-result-attachments/stored-file",
  };
}

function jpegBlob() {
  return new Blob([new Uint8Array([0xff, 0xd8, 0xff, 0xd9])], {
    type: "image/jpeg",
  });
}

describe("PDF evidence preparation", () => {
  afterEach(() => vi.useRealTimers());

  it("prepares a server-validated JPEG for embedding", async () => {
    await expect(
      preparePdfEvidenceImage(async () => jpegBlob(), {
        blobToDataUrl: async () => "data:image/jpeg;base64,/9j/2Q==",
        getDimensions: async () => ({ height: 600, width: 800 }),
      }),
    ).resolves.toEqual({
      dataUrl: "data:image/jpeg;base64,/9j/2Q==",
      height: 600,
      width: 800,
    });
  });

  it.each([
    [800, 600, 160, 120],
    [600, 800, 90, 120],
    [4_000, 1_000, 160, 40],
  ])(
    "preserves the aspect ratio for %sx%s images",
    (width, height, expectedWidth, expectedHeight) => {
      expect(calculatePdfImagePlacement(width, height, 160, 120)).toEqual({
        height: expectedHeight,
        width: expectedWidth,
      });
    },
  );

  it("rejects a corrupted image signature", async () => {
    const corruptBlob = new Blob(["not-an-image"], { type: "image/jpeg" });

    await expect(
      preparePdfEvidenceImage(async () => corruptBlob, {
        blobToDataUrl: async () => "unused",
        getDimensions: async () => ({ height: 1, width: 1 }),
      }),
    ).rejects.toThrow("invalid image signature");
  });

  it("rejects an unexpected real MIME type", async () => {
    const pngBlob = new Blob([new Uint8Array([0x89, 0x50, 0x4e, 0x47])], {
      type: "image/png",
    });

    await expect(preparePdfEvidenceImage(async () => pngBlob)).rejects.toThrow(
      "did not return a JPEG",
    );
  });

  it("propagates unavailable evidence without blocking subsequent preparation", async () => {
    const load = vi
      .fn<(signal: AbortSignal) => Promise<Blob>>()
      .mockRejectedValueOnce(new Error("404"))
      .mockResolvedValueOnce(jpegBlob());

    await expect(preparePdfEvidenceImage(load)).rejects.toThrow("404");
    await expect(
      preparePdfEvidenceImage(load, {
        blobToDataUrl: async () => "data:image/jpeg;base64,/9j/2Q==",
        getDimensions: async () => ({ height: 10, width: 10 }),
      }),
    ).resolves.toMatchObject({ height: 10, width: 10 });
  });

  it("aborts a download that exceeds the configured timeout", async () => {
    vi.useFakeTimers();
    let receivedSignal: AbortSignal | undefined;
    const preparation = preparePdfEvidenceImage(
      (signal) => {
        receivedSignal = signal;
        return new Promise<Blob>(() => undefined);
      },
      { timeoutMs: 25 },
    );
    const expectation = expect(preparation).rejects.toThrow("timed out");

    await vi.advanceTimersByTimeAsync(25);

    await expectation;
    expect(receivedSignal?.aborted).toBe(true);
  });

  it("detects when an image block must move to the next page", () => {
    expect(shouldStartNewPdfPage(220, 55, 269)).toBe(true);
    expect(shouldStartNewPdfPage(100, 55, 269)).toBe(false);
  });

  it("limits reports with many image evidences", () => {
    expect(canEmbedMorePdfEvidence(99, 100)).toBe(true);
    expect(canEmbedMorePdfEvidence(100, 100)).toBe(false);
    expect(canEmbedMorePdfEvidence(150, 100)).toBe(false);
  });

  it("describes non-image attachments with type and size", () => {
    expect(getAttachmentTypeLabel(attachment("video/mp4"))).toBe("Vídeo");
    expect(getAttachmentTypeLabel(attachment("application/pdf"))).toBe("PDF");
    expect(getAttachmentTypeLabel(attachment("application/zip"))).toBe(
      "Arquivo compactado",
    );
    expect(formatAttachmentSize(2048)).toBe("2.0 KB");
  });

  it("keeps multiple attachments in upload order, including identical timestamps", () => {
    const latest = {
      ...attachment("image/png"),
      id: "c",
      createdAt: "2026-07-21T12:00:00Z",
    };
    const first = {
      ...attachment("image/jpeg"),
      id: "a",
      createdAt: "2026-07-21T10:00:00Z",
    };
    const second = {
      ...attachment("image/webp"),
      id: "b",
      createdAt: "2026-07-21T10:00:00Z",
    };

    expect(
      orderPdfEvidenceAttachments([latest, second, first]).map(
        (item) => item.id,
      ),
    ).toEqual(["a", "b", "c"]);
    expect(orderPdfEvidenceAttachments([])).toEqual([]);
  });

  it("rejects invalid dimensions instead of distorting the PDF layout", () => {
    expect(() => calculatePdfImagePlacement(0, 100, 160)).toThrow(
      "Invalid evidence image dimensions",
    );
  });
});
