import { UnsupportedMediaTypeException, UnprocessableEntityException } from '@nestjs/common';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import sharp from 'sharp';
import {
  PDF_EVIDENCE_MAX_DIMENSION_PX,
  PdfEvidenceImageService,
} from './pdf-evidence-image.service';

describe('PdfEvidenceImageService', () => {
  let directory: string;
  let service: PdfEvidenceImageService;

  beforeEach(async () => {
    directory = await mkdtemp(join(tmpdir(), 'pdf-evidence-'));
    service = new PdfEvidenceImageService();
  });

  afterEach(async () => {
    await rm(directory, { force: true, recursive: true });
  });

  async function createImage(
    name: string,
    format: 'gif' | 'jpeg' | 'png' | 'webp',
    width = 320,
    height = 180,
  ) {
    const filePath = join(directory, name);
    const pipeline = sharp({
      create: {
        background: { alpha: 1, b: 90, g: 120, r: 30 },
        channels: 4,
        height,
        width,
      },
    });
    const buffer = await pipeline[format]().toBuffer();
    await writeFile(filePath, buffer);
    return filePath;
  }

  it.each([
    ['png', 'imagem.png', 'image/png'],
    ['jpeg', 'imagem.jpg', 'image/jpeg'],
    ['webp', 'imagem.webp', 'image/webp'],
    ['gif', 'imagem.gif', 'image/gif'],
  ] as const)('converts a valid %s image to an embedded JPEG', async (format, name, mimeType) => {
    const filePath = await createImage(name, format);

    const result = await service.prepare(filePath, mimeType);
    const metadata = await sharp(result.buffer).metadata();

    expect(result.mimeType).toBe('image/jpeg');
    expect(metadata.format).toBe('jpeg');
    expect(result.width).toBe(320);
    expect(result.height).toBe(180);
  });

  it.each([
    ['portrait.jpg', 600, 1200],
    ['landscape.jpg', 1200, 600],
  ] as const)('preserves the aspect ratio of %s images', async (name, width, height) => {
    const result = await service.prepare(
      await createImage(name, 'jpeg', width, height),
      'image/jpeg',
    );

    expect(result.width / result.height).toBeCloseTo(width / height, 2);
  });

  it('rotates JPEG images according to EXIF orientation', async () => {
    const filePath = join(directory, 'rotated.jpg');
    const buffer = await sharp({
      create: {
        background: 'red',
        channels: 3,
        height: 100,
        width: 200,
      },
    })
      .jpeg()
      .withMetadata({ orientation: 6 })
      .toBuffer();
    await writeFile(filePath, buffer);

    const result = await service.prepare(filePath, 'image/jpeg');

    expect(result.width).toBe(100);
    expect(result.height).toBe(200);
  });

  it('reduces oversized images before returning them', async () => {
    const result = await service.prepare(
      await createImage('large.jpg', 'jpeg', 4_000, 1_000),
      'image/jpeg',
    );

    expect(result.width).toBe(PDF_EVIDENCE_MAX_DIMENSION_PX);
    expect(result.height).toBe(500);
  });

  it('supports names with accents and special characters', async () => {
    await expect(
      service.prepare(await createImage('evidência pré-aquecimento (1).png', 'png'), 'image/png'),
    ).resolves.toMatchObject({ mimeType: 'image/jpeg' });
  });

  it('rejects corrupted images', async () => {
    const filePath = join(directory, 'corrupted.png');
    await writeFile(filePath, Buffer.from('not an image'));

    await expect(service.prepare(filePath, 'image/png')).rejects.toBeInstanceOf(
      UnprocessableEntityException,
    );
  });

  it('rejects content whose real MIME type differs from the declared MIME type', async () => {
    const filePath = await createImage('fake.png', 'jpeg');

    await expect(service.prepare(filePath, 'image/png')).rejects.toBeInstanceOf(
      UnsupportedMediaTypeException,
    );
  });

  it('rejects an image format that is not supported for PDF conversion', async () => {
    const filePath = join(directory, 'vector.svg');
    await writeFile(
      filePath,
      Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"/>'),
    );

    await expect(service.prepare(filePath, 'image/svg+xml')).rejects.toBeInstanceOf(
      UnsupportedMediaTypeException,
    );
  });

  it('rejects a missing file', async () => {
    await expect(
      service.prepare(join(directory, 'missing.png'), 'image/png'),
    ).rejects.toMatchObject({ status: 404 });
  });
});
