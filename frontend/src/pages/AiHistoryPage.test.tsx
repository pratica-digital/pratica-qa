// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useAuth } from '../auth/useAuth';
import { aiTestGeneratorApi } from '../lib/api';
import { formatAiGenerationDuration, getHistoryUserLabel } from '../lib/aiHistory';
import type { AiHistoryItem } from '../types/testRun';
import { AiHistoryPage } from './AiHistoryPage';

vi.mock('../auth/useAuth', () => ({ useAuth: vi.fn() }));
vi.mock('../lib/api', () => ({
  aiTestGeneratorApi: {
    getHistory: vi.fn(),
    historyAll: vi.fn(),
    regenerate: vi.fn(),
    removeHistory: vi.fn(),
  },
}));

const item: AiHistoryItem = {
  id: '0d4c694b-33d9-43ce-ae01-444f28cb533a',
  releaseTitle: 'Release 2.4',
  fileName: 'release.pdf',
  releaseHash: '66216fb6fa144bce1234',
  provider: 'OpenRouter',
  model: 'model-name',
  status: 'COMPLETED',
  durationMs: 166000,
  casesCreated: 2,
  createdById: '8fa5e94a-55cd-4aa4-962b-97d856eb6578',
  createdBy: { name: 'Aline Silva', email: 'aline@example.com' },
  errorMessage: '',
  createdAt: '2026-07-22T10:00:00Z',
  updatedAt: '2026-07-22T10:00:00Z',
  testCaseCount: 3,
};

function authenticate(role: 'ADMIN' | 'QA' = 'ADMIN') {
  vi.mocked(useAuth).mockReturnValue({
    token: 'token',
    user: { role },
  } as ReturnType<typeof useAuth>);
}

async function renderHistory(role: 'ADMIN' | 'QA' = 'ADMIN') {
  authenticate(role);
  vi.mocked(aiTestGeneratorApi.historyAll).mockResolvedValue([item]);
  render(<AiHistoryPage embedded />);
  await screen.findByText('Release 2.4');
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('AiHistoryPage', () => {
  it('shows creator name, clear case counts and duration without the release hash', async () => {
    await renderHistory();

    expect(screen.getByText('Aline Silva')).toBeTruthy();
    expect(screen.getByText('3 gerados · 2 salvos')).toBeTruthy();
    expect(screen.getByText('2min 46s')).toBeTruthy();
    expect(screen.queryByText('66216fb6fa144bce')).toBeNull();
  });

  it('uses email and UUID as creator fallbacks', () => {
    expect(getHistoryUserLabel({ ...item, createdBy: { name: '', email: 'aline@example.com' } })).toBe('aline@example.com');
    expect(getHistoryUserLabel({ ...item, createdBy: null })).toBe(item.createdById);
    expect(formatAiGenerationDuration(42000)).toBe('42s');
  });

  it('hides deletion from users without permission', async () => {
    await renderHistory('QA');

    expect(screen.queryByRole('button', { name: /Excluir geração/ })).toBeNull();
  });

  it('opens, identifies and cancels the confirmation modal', async () => {
    await renderHistory();

    fireEvent.click(screen.getByRole('button', { name: 'Excluir geração Release 2.4' }));
    expect(screen.getByRole('dialog')).toBeTruthy();
    expect(screen.getByText(/Release 2.4.*não poderá ser desfeita/)).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(aiTestGeneratorApi.removeHistory).not.toHaveBeenCalled();
  });

  it('removes the row and reports success after deletion', async () => {
    vi.mocked(aiTestGeneratorApi.removeHistory).mockResolvedValue(undefined);
    await renderHistory();

    fireEvent.click(screen.getByRole('button', { name: 'Excluir geração Release 2.4' }));
    fireEvent.click(screen.getByRole('button', { name: 'Excluir geração' }));

    await waitFor(() => expect(screen.queryByText('Release 2.4')).toBeNull());
    expect(screen.getByRole('status').textContent).toContain('excluída com sucesso');
    expect(aiTestGeneratorApi.removeHistory).toHaveBeenCalledTimes(1);
  });

  it('keeps the row and reports the error when deletion fails', async () => {
    vi.mocked(aiTestGeneratorApi.removeHistory).mockRejectedValue(new Error('Falha ao excluir'));
    await renderHistory();

    fireEvent.click(screen.getByRole('button', { name: 'Excluir geração Release 2.4' }));
    fireEvent.click(screen.getByRole('button', { name: 'Excluir geração' }));

    expect(await screen.findByText('Falha ao excluir')).toBeTruthy();
    expect(screen.getByText('Release 2.4')).toBeTruthy();
  });

  it('disables confirmation while deleting and prevents duplicate requests', async () => {
    let resolveDelete!: () => void;
    vi.mocked(aiTestGeneratorApi.removeHistory).mockImplementation(
      () => new Promise<void>((resolve) => { resolveDelete = resolve; }),
    );
    await renderHistory();

    fireEvent.click(screen.getByRole('button', { name: 'Excluir geração Release 2.4' }));
    const confirm = screen.getByRole('button', { name: 'Excluir geração' });
    fireEvent.click(confirm);

    const loadingButton = await screen.findByRole('button', { name: 'Excluindo' });
    expect(loadingButton).toHaveProperty('disabled', true);
    fireEvent.click(loadingButton);
    expect(aiTestGeneratorApi.removeHistory).toHaveBeenCalledTimes(1);

    resolveDelete();
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  });
});
