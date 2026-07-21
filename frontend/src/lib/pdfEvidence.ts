import type { TestResultAttachment } from "../types/testRun";

export const PDF_EVIDENCE_DOWNLOAD_TIMEOUT_MS = 15_000;
export const PDF_EVIDENCE_MAX_HEIGHT_MM = 120;
export const PDF_EVIDENCE_MAX_COUNT = 100;

export type PdfEvidenceImage = {
  dataUrl: string;
  height: number;
  width: number;
};

export type PdfImagePlacement = {
  height: number;
  width: number;
};

type ImageDimensions = { height: number; width: number };

type PreparePdfEvidenceOptions = {
  blobToDataUrl?: (blob: Blob) => Promise<string>;
  getDimensions?: (blob: Blob) => Promise<ImageDimensions>;
  timeoutMs?: number;
};

export function calculatePdfImagePlacement(
  pixelWidth: number,
  pixelHeight: number,
  maxWidth: number,
  maxHeight = PDF_EVIDENCE_MAX_HEIGHT_MM,
): PdfImagePlacement {
  if (pixelWidth <= 0 || pixelHeight <= 0 || maxWidth <= 0 || maxHeight <= 0) {
    throw new Error("Invalid evidence image dimensions");
  }

  const scale = Math.min(maxWidth / pixelWidth, maxHeight / pixelHeight);
  return {
    height: pixelHeight * scale,
    width: pixelWidth * scale,
  };
}

export function shouldStartNewPdfPage(
  currentY: number,
  blockHeight: number,
  pageContentBottom: number,
) {
  return currentY + blockHeight > pageContentBottom;
}

export function canEmbedMorePdfEvidence(
  embeddedCount: number,
  maximum = PDF_EVIDENCE_MAX_COUNT,
) {
  return embeddedCount < maximum;
}

export function formatAttachmentSize(size?: number | null) {
  if (!size || size < 0) return "tamanho não informado";
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

export function getAttachmentTypeLabel(attachment: TestResultAttachment) {
  const mimeType = attachment.mimeType.toLowerCase();
  if (mimeType.startsWith("video/")) return "Vídeo";
  if (mimeType === "application/pdf") return "PDF";
  if (mimeType.includes("word")) return "Documento";
  if (mimeType.includes("sheet") || mimeType.includes("excel"))
    return "Planilha";
  if (mimeType.includes("zip")) return "Arquivo compactado";
  if (mimeType.startsWith("text/")) return "Texto";
  return attachment.mimeType || "Formato não informado";
}

export function orderPdfEvidenceAttachments(
  attachments: TestResultAttachment[],
) {
  return [...attachments].sort(
    (left, right) =>
      new Date(left.createdAt).getTime() -
        new Date(right.createdAt).getTime() || left.id.localeCompare(right.id),
  );
}

async function assertPreparedJpeg(blob: Blob) {
  if (blob.type.toLowerCase() !== "image/jpeg") {
    throw new Error("The prepared evidence did not return a JPEG image");
  }

  const signature = new Uint8Array(await blob.slice(0, 3).arrayBuffer());
  if (
    signature.length < 3 ||
    signature[0] !== 0xff ||
    signature[1] !== 0xd8 ||
    signature[2] !== 0xff
  ) {
    throw new Error("The prepared evidence has an invalid image signature");
  }
}

function defaultBlobToDataUrl(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

async function defaultGetDimensions(blob: Blob): Promise<ImageDimensions> {
  if (typeof createImageBitmap === "function") {
    const bitmap = await createImageBitmap(blob);
    const dimensions = { height: bitmap.height, width: bitmap.width };
    bitmap.close();
    return dimensions;
  }

  const objectUrl = URL.createObjectURL(blob);
  try {
    return await new Promise<ImageDimensions>((resolve, reject) => {
      const image = new Image();
      image.onload = () =>
        resolve({ height: image.naturalHeight, width: image.naturalWidth });
      image.onerror = () =>
        reject(new Error("The prepared evidence could not be decoded"));
      image.src = objectUrl;
    });
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

export async function preparePdfEvidenceImage(
  fetchBlob: (signal: AbortSignal) => Promise<Blob>,
  options: PreparePdfEvidenceOptions = {},
): Promise<PdfEvidenceImage> {
  const controller = new AbortController();
  const timeoutMs = options.timeoutMs ?? PDF_EVIDENCE_DOWNLOAD_TIMEOUT_MS;
  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  try {
    const timeout = new Promise<never>((_, reject) => {
      timeoutId = setTimeout(() => {
        controller.abort();
        reject(new Error("Evidence download timed out"));
      }, timeoutMs);
    });
    const blob = await Promise.race([fetchBlob(controller.signal), timeout]);
    await assertPreparedJpeg(blob);
    const getDimensions = options.getDimensions ?? defaultGetDimensions;
    const blobToDataUrl = options.blobToDataUrl ?? defaultBlobToDataUrl;
    const dimensions = await getDimensions(blob);

    if (dimensions.width <= 0 || dimensions.height <= 0) {
      throw new Error("The prepared evidence has invalid dimensions");
    }

    return {
      dataUrl: await blobToDataUrl(blob),
      height: dimensions.height,
      width: dimensions.width,
    };
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}
