// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useAuth } from '../../auth/useAuth';
import { testRunsApi } from '../../lib/api';
import { TEST_RUN_NAME_MAX_LENGTH, validateTestRunName } from '../../lib/testRunName';
import type { TestRun } from '../../types/testRun';
import { EditTestRunNameModal } from './EditTestRunNameModal';

vi.mock('../../auth/useAuth', () => ({ useAuth: vi.fn() }));
vi.mock('../../lib/api', () => ({
  testRunsApi: { update: vi.fn() },
}));

const testRun: TestRun = {
  id: 'run-id',
  assignedToId: 'qa-id',
  name: 'Regressão da release 2.4',
  status: 'IN_PROGRESS',
  suites: [],
  results: [],
};

function setup() {
  vi.mocked(useAuth).mockReturnValue({ token: 'token' } as ReturnType<typeof useAuth>);
  const onClose = vi.fn();
  const onUpdated = vi.fn();
  render(
    <EditTestRunNameModal
      onClose={onClose}
      onUpdated={onUpdated}
      testRun={testRun}
    />,
  );
  return { onClose, onUpdated };
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('EditTestRunNameModal', () => {
  it('opens with the current name and cancels without a request', () => {
    const { onClose } = setup();

    expect(screen.getByRole('dialog')).toBeTruthy();
    expect(screen.getByRole('textbox', { name: 'Nome' })).toHaveProperty(
      'value',
      testRun.name,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(testRunsApi.update).not.toHaveBeenCalled();
  });

  it.each(['', '   '])('shows validation for an empty name: %p', (name) => {
    setup();
    const input = screen.getByRole('textbox', { name: 'Nome' });

    fireEvent.change(input, { target: { value: name } });
    fireEvent.blur(input);

    expect(screen.getByRole('alert').textContent).toContain(
      'O nome do Test Run é obrigatório.',
    );
    expect(screen.getByRole('button', { name: 'Salvar alterações' })).toHaveProperty(
      'disabled',
      true,
    );
  });

  it('normalizes and saves the changed name', async () => {
    const updatedRun = { ...testRun, name: 'Novo nome' };
    vi.mocked(testRunsApi.update).mockResolvedValue(updatedRun);
    const { onClose, onUpdated } = setup();

    fireEvent.change(screen.getByRole('textbox', { name: 'Nome' }), {
      target: { value: '  Novo nome  ' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar alterações' }));

    await waitFor(() => expect(onUpdated).toHaveBeenCalledWith(updatedRun));
    expect(testRunsApi.update).toHaveBeenCalledWith('token', 'run-id', {
      name: 'Novo nome',
    });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('keeps the modal and typed value after a request failure', async () => {
    vi.mocked(testRunsApi.update).mockRejectedValue(new Error('Falha ao atualizar'));
    setup();
    const input = screen.getByRole('textbox', { name: 'Nome' });

    fireEvent.change(input, { target: { value: 'Nome para tentar novamente' } });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar alterações' }));

    expect(await screen.findByText('Falha ao atualizar')).toBeTruthy();
    expect(screen.getByRole('dialog')).toBeTruthy();
    expect(input).toHaveProperty('value', 'Nome para tentar novamente');
  });

  it('disables controls while saving and prevents duplicate requests', async () => {
    let resolveUpdate!: (value: TestRun) => void;
    vi.mocked(testRunsApi.update).mockImplementation(
      () => new Promise<TestRun>((resolve) => { resolveUpdate = resolve; }),
    );
    const { onClose } = setup();

    const input = screen.getByRole('textbox', { name: 'Nome' });
    fireEvent.change(input, { target: { value: 'Nome em atualização' } });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar alterações' }));

    const loadingButton = await screen.findByRole('button', { name: 'Salvando' });
    expect(input).toHaveProperty('disabled', true);
    expect(loadingButton).toHaveProperty('disabled', true);
    fireEvent.click(loadingButton);
    expect(testRunsApi.update).toHaveBeenCalledTimes(1);

    resolveUpdate({ ...testRun, name: 'Nome em atualização' });
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
  });

  it('does not allow an unchanged name and shares the 160 character limit', () => {
    setup();

    expect(screen.getByRole('button', { name: 'Salvar alterações' })).toHaveProperty(
      'disabled',
      true,
    );
    expect(validateTestRunName('x'.repeat(TEST_RUN_NAME_MAX_LENGTH + 1))).toContain(
      '160 caracteres',
    );
  });
});
