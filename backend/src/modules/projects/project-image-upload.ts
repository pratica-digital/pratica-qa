import { BadRequestException } from '@nestjs/common';
import { mkdirSync } from 'node:fs';
import { extname, join } from 'node:path';
import { diskStorage } from 'multer';

type UploadedProjectImage = {
  filename: string;
};

const projectImageDirectory = join(process.cwd(), 'uploads', 'project-images');
const allowedImageMimeTypes = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
const extensionByMimeType: Record<string, string> = {
  'image/gif': '.gif',
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
};

function getSafeExtension(mimeType: string, originalName: string) {
  return extensionByMimeType[mimeType] ?? extname(originalName).toLowerCase();
}

export const projectImageUploadOptions = {
  fileFilter: (
    _request: unknown,
    file: { mimetype: string },
    callback: (error: Error | null, acceptFile: boolean) => void,
  ) => {
    if (!allowedImageMimeTypes.has(file.mimetype)) {
      callback(new BadRequestException('Project image must be JPG, PNG, WEBP, or GIF.'), false);
      return;
    }

    callback(null, true);
  },
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
  storage: diskStorage({
    destination: (_request, _file, callback) => {
      mkdirSync(projectImageDirectory, { recursive: true });
      callback(null, projectImageDirectory);
    },
    filename: (_request, file, callback) => {
      const uniqueName = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
      callback(null, `${uniqueName}${getSafeExtension(file.mimetype, file.originalname)}`);
    },
  }),
};

export function getProjectImageUrl(file?: UploadedProjectImage) {
  return file ? `/uploads/project-images/${file.filename}` : undefined;
}
