import { realpath, unlink } from 'node:fs/promises';
import { resolve, sep } from 'node:path';

const uploadRoot = resolve(process.cwd(), 'uploads');

export function resolveRuntimeUploadPath(url: string) {
  if (!url.startsWith('/uploads/')) {
    return null;
  }

  const filePath = resolve(process.cwd(), url.slice(1));
  return filePath.startsWith(`${uploadRoot}${sep}`) ? filePath : null;
}

export async function resolveExistingRuntimeUploadPath(url: string) {
  const candidate = resolveRuntimeUploadPath(url);
  if (!candidate) return null;

  try {
    const [realUploadRoot, realFilePath] = await Promise.all([
      realpath(uploadRoot),
      realpath(candidate),
    ]);
    return realFilePath.startsWith(`${realUploadRoot}${sep}`) ? realFilePath : null;
  } catch {
    return null;
  }
}

export async function removeRuntimeUpload(url?: string | null) {
  if (!url) {
    return false;
  }

  const filePath = resolveRuntimeUploadPath(url);
  if (!filePath) {
    return false;
  }

  try {
    await unlink(filePath);
    return true;
  } catch {
    return false;
  }
}

export async function removeRuntimeUploads(urls: Array<string | null | undefined>) {
  return Promise.all(urls.map((url) => removeRuntimeUpload(url)));
}
