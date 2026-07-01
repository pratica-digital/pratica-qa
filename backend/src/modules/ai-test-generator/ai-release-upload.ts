import { BadRequestException } from '@nestjs/common';
import { memoryStorage } from 'multer';

const allowedMimeTypes = new Set([
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/markdown',
  'text/plain',
]);

const allowedExtensions = new Set(['.docx', '.md', '.markdown', '.pdf', '.txt']);

function getExtension(fileName: string) {
  const dotIndex = fileName.lastIndexOf('.');
  return dotIndex >= 0 ? fileName.slice(dotIndex).toLowerCase() : '';
}

export const aiReleaseUploadOptions = {
  fileFilter: (
    _request: unknown,
    file: { mimetype: string; originalname: string },
    callback: (error: Error | null, acceptFile: boolean) => void,
  ) => {
    const extension = getExtension(file.originalname);

    if (!allowedMimeTypes.has(file.mimetype) && !allowedExtensions.has(extension)) {
      callback(new BadRequestException('Release Notes must be PDF, DOCX, TXT, or Markdown.'), false);
      return;
    }

    callback(null, true);
  },
  limits: {
    fileSize: 15 * 1024 * 1024,
  },
  storage: memoryStorage(),
};
