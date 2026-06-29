declare module 'multer' {
  import type { Request } from 'express';

  type MulterFile = {
    buffer?: Buffer;
    fieldname?: string;
    mimetype: string;
    originalname: string;
    size?: number;
  };

  type FileFilterCallback = (error: Error | null, acceptFile: boolean) => void;
  type DestinationCallback = (error: Error | null, destination: string) => void;
  type FilenameCallback = (error: Error | null, filename: string) => void;

  export type Options = {
    fileFilter?: (req: Request, file: MulterFile, callback: FileFilterCallback) => void;
    limits?: {
      fileSize?: number;
    };
    storage?: unknown;
  };

  export function diskStorage(options: {
    destination: (req: Request, file: MulterFile, callback: DestinationCallback) => void;
    filename: (req: Request, file: MulterFile, callback: FilenameCallback) => void;
  }): unknown;

  export function memoryStorage(): unknown;
}
