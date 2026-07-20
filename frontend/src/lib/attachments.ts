import type { TestResultAttachment } from '../types/testRun';

export function getAttachmentUrl(attachment: TestResultAttachment) {
  return attachment.url;
}

export function getAttachmentName(attachment: TestResultAttachment) {
  return (
    attachment.originalName ||
    attachment.fileName ||
    decodeURIComponent(getAttachmentUrl(attachment).split('/').pop() ?? 'Evidência')
  );
}

export function isImageAttachment(attachment: TestResultAttachment) {
  return (
    attachment.mimeType.startsWith('image/') ||
    /\.(gif|jpe?g|png|webp)$/i.test(getAttachmentUrl(attachment).split('?')[0] ?? '')
  );
}

export function isVideoAttachment(attachment: TestResultAttachment) {
  return (
    attachment.mimeType.startsWith('video/') ||
    /\.(mp4|mov|webm)$/i.test(getAttachmentUrl(attachment).split('?')[0] ?? '')
  );
}
