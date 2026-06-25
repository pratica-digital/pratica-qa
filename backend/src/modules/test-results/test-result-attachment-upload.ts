import { BadRequestException } from '@nestjs/common';
import { mkdirSync } from 'node:fs';
import { extname, join } from 'node:path';
import { diskStorage } from 'multer';

type UploadedTestResultAttachment = {
  filename: string;
  mimetype: string;
  originalname: string;
  size: number;
};

export type PersistedTestResultAttachmentInput = {
  fileName: string;
  originalName: string;
  mimeType: string;
  size: number;
  url: string;
};

const attachmentDirectory = join(process.cwd(), 'uploads', 'test-result-attachments');
const allowedMimeTypes = new Set([
  'application/json',
  'application/msword',
  'application/pdf',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/zip',
  'image/gif',
  'image/jpeg',
  'image/png',
  'image/webp',
  'text/csv',
  'text/plain',
  'video/mp4',
  'video/quicktime',
  'video/webm',
]);

const extensionByMimeType: Record<string, string> = {
  'application/json': '.json',
  'application/msword': '.doc',
  'application/pdf': '.pdf',
  'application/vnd.ms-excel': '.xls',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '.xlsx',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
  'application/zip': '.zip',
  'image/gif': '.gif',
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'text/csv': '.csv',
  'text/plain': '.txt',
  'video/mp4': '.mp4',
  'video/quicktime': '.mov',
  'video/webm': '.webm',
};

function getSafeExtension(mimeType: string, originalName: string) {
  return extensionByMimeType[mimeType] ?? extname(originalName).toLowerCase();
}

export const testResultAttachmentUploadOptions = {
  fileFilter: (
    _request: unknown,
    file: { mimetype: string },
    callback: (error: Error | null, acceptFile: boolean) => void,
  ) => {
    if (!allowedMimeTypes.has(file.mimetype)) {
      callback(
        new BadRequestException('Evidence must be an image, video, PDF, document, spreadsheet, archive, CSV, JSON, or plain text file.'),
        false,
      );
      return;
    }

    callback(null, true);
  },
  limits: {
    fileSize: 50 * 1024 * 1024,
    files: 10,
  },
  storage: diskStorage({
    destination: (_request, _file, callback) => {
      mkdirSync(attachmentDirectory, { recursive: true });
      callback(null, attachmentDirectory);
    },
    filename: (_request, file, callback) => {
      const uniqueName = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
      callback(null, `${uniqueName}${getSafeExtension(file.mimetype, file.originalname)}`);
    },
  }),
};

export function getTestResultAttachmentInputs(
  files: UploadedTestResultAttachment[] = [],
): PersistedTestResultAttachmentInput[] {
  return files.map((file) => ({
    fileName: file.filename,
    originalName: file.originalname,
    mimeType: file.mimetype,
    size: file.size,
    url: `/uploads/test-result-attachments/${file.filename}`,
  }));
}
