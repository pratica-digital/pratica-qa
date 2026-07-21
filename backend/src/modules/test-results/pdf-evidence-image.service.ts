import {
  Injectable,
  NotFoundException,
  PayloadTooLargeException,
  UnsupportedMediaTypeException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { readFile, stat } from 'node:fs/promises';
import sharp from 'sharp';

export const PDF_EVIDENCE_MAX_SOURCE_BYTES = 50 * 1024 * 1024;
export const PDF_EVIDENCE_MAX_INPUT_PIXELS = 40_000_000;
export const PDF_EVIDENCE_MAX_DIMENSION_PX = 2_000;
export const PDF_EVIDENCE_JPEG_QUALITY = 82;

const mimeTypeByFormat: Record<string, string> = {
  gif: 'image/gif',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
};

export type PreparedPdfEvidenceImage = {
  buffer: Buffer;
  height: number;
  mimeType: 'image/jpeg';
  width: number;
};

function normalizeImageMimeType(mimeType: string) {
  return mimeType.trim().toLowerCase().replace('image/jpg', 'image/jpeg');
}

@Injectable()
export class PdfEvidenceImageService {
  async prepare(filePath: string, declaredMimeType: string): Promise<PreparedPdfEvidenceImage> {
    let fileStats: Awaited<ReturnType<typeof stat>>;
    try {
      fileStats = await stat(filePath);
    } catch {
      throw new NotFoundException('Evidence file not found');
    }

    if (fileStats.size > PDF_EVIDENCE_MAX_SOURCE_BYTES) {
      throw new PayloadTooLargeException('Evidence image exceeds the PDF processing limit');
    }

    const source = await readFile(filePath);
    if (source.length > PDF_EVIDENCE_MAX_SOURCE_BYTES) {
      throw new PayloadTooLargeException('Evidence image exceeds the PDF processing limit');
    }
    const image = sharp(source, {
      animated: false,
      failOn: 'warning',
      limitInputPixels: PDF_EVIDENCE_MAX_INPUT_PIXELS,
      page: 0,
    });

    let metadata: Awaited<ReturnType<typeof image.metadata>>;
    try {
      metadata = await image.metadata();
    } catch {
      throw new UnprocessableEntityException('Evidence image is corrupted or invalid');
    } finally {
      image.destroy();
    }

    const detectedMimeType = metadata.format ? mimeTypeByFormat[metadata.format] : undefined;

    if (!detectedMimeType) {
      throw new UnsupportedMediaTypeException('Evidence format cannot be embedded in PDF');
    }

    const normalizedDeclaredMimeType = normalizeImageMimeType(declaredMimeType);
    if (
      normalizedDeclaredMimeType.startsWith('image/') &&
      normalizedDeclaredMimeType !== detectedMimeType
    ) {
      throw new UnsupportedMediaTypeException(
        'Evidence content does not match its declared MIME type',
      );
    }

    try {
      const { data, info } = await sharp(source, {
        animated: false,
        failOn: 'warning',
        limitInputPixels: PDF_EVIDENCE_MAX_INPUT_PIXELS,
        page: 0,
      })
        .rotate()
        .resize({
          fit: 'inside',
          height: PDF_EVIDENCE_MAX_DIMENSION_PX,
          width: PDF_EVIDENCE_MAX_DIMENSION_PX,
          withoutEnlargement: true,
        })
        .flatten({ background: '#ffffff' })
        .jpeg({ mozjpeg: true, quality: PDF_EVIDENCE_JPEG_QUALITY })
        .toBuffer({ resolveWithObject: true });

      return {
        buffer: data,
        height: info.height,
        mimeType: 'image/jpeg',
        width: info.width,
      };
    } catch {
      throw new UnprocessableEntityException('Evidence image could not be prepared for PDF');
    }
  }
}
