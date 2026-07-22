import type { AiHistoryItem } from '../types/testRun';

export function formatAiGenerationDuration(value?: number | null) {
  if (value === undefined || value === null) {
    return '-';
  }

  const totalSeconds = Math.max(0, Math.round(value / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  if (minutes === 0) {
    return `${seconds}s`;
  }

  return seconds > 0 ? `${minutes}min ${seconds}s` : `${minutes}min`;
}

export function getHistoryUserLabel(item: AiHistoryItem) {
  return item.createdBy?.name.trim() || item.createdBy?.email.trim() || item.createdById || '-';
}

export function getGenerationLabel(item: AiHistoryItem) {
  return item.releaseTitle || item.fileName || item.releaseHash.slice(0, 10);
}
