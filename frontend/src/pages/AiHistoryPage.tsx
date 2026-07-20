import { useCallback, useEffect, useState } from 'react';
import { Bot, RefreshCw, RotateCcw } from 'lucide-react';
import { canManageTests } from '../auth/permissions';
import { useAuth } from '../auth/useAuth';
import { aiTestGeneratorApi } from '../lib/api';
import type { AiGenerationRecord, AiHistoryItem } from '../types/testRun';

function formatDate(value?: string) {
  if (!value) {
    return '-';
  }

  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(value));
}

function formatDuration(value?: number | null) {
  if (!value) {
    return '-';
  }

  return `${Math.round(value / 1000)}s`;
}

type AiHistoryPageProps = {
  embedded?: boolean;
};

export function AiHistoryPage({ embedded = false }: AiHistoryPageProps = {}) {
  const { token, user } = useAuth();
  const canEdit = canManageTests(user);
  const [items, setItems] = useState<AiHistoryItem[]>([]);
  const [selected, setSelected] = useState<AiGenerationRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [regeneratingId, setRegeneratingId] = useState('');
  const [error, setError] = useState('');

  const fetchHistory = useCallback(async () => {
    if (!token) {
      return;
    }

    setLoading(true);
    setError('');

    try {
      setItems(await aiTestGeneratorApi.historyAll(token));
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : 'Não foi possível carregar o histórico.');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void fetchHistory();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [fetchHistory]);

  async function openItem(id: string) {
    if (!token) {
      return;
    }

    try {
      const detail = await aiTestGeneratorApi.getHistory(token, id);
      setSelected(detail);
    } catch (detailError) {
      setError(detailError instanceof Error ? detailError.message : 'Não foi possível abrir a geração.');
    }
  }

  async function regenerate(id: string) {
    if (!token) {
      return;
    }

    setRegeneratingId(id);
    setError('');

    try {
      const regenerated = await aiTestGeneratorApi.regenerate(token, id);
      setSelected(regenerated);
      await fetchHistory();
    } catch (regenerateError) {
      setError(regenerateError instanceof Error ? regenerateError.message : 'Não foi possível regenerar.');
    } finally {
      setRegeneratingId('');
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          {embedded ? (
            <h2 className="mt-1 text-xl font-semibold tracking-normal text-slate-950">
              Historico
            </h2>
          ) : (
            <h1 className="mt-1 text-2xl font-semibold tracking-normal text-slate-950">
              Histórico IA
            </h1>
          )}
          <p className="text-sm font-medium text-slate-500">{items.length} geracoes listadas</p>
        </div>
        <button
          className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-slate-600 bg-slate-600 px-3 text-sm font-medium text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={loading}
          onClick={() => void fetchHistory()}
          title="Atualizar"
          type="button"
        >
          <RefreshCw className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>

      {error ? (
        <p className="rounded-lg border border-red-200 bg-red-100 px-3 py-2 text-sm text-red-800">
          {error}
        </p>
      ) : null}

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-4 py-3">
          <h2 className="text-sm font-semibold text-slate-950">Geracoes</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-left text-sm">
            <thead className="bg-slate-100 text-xs font-medium uppercase text-slate-700">
              <tr>
                <th className="px-4 py-3">Release</th>
                <th className="px-4 py-3">Modelo</th>
                <th className="px-4 py-3">Tempo</th>
                <th className="px-4 py-3">Usuário</th>
                <th className="px-4 py-3">Casos</th>
                <th className="px-4 py-3">Data</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {loading ? (
                <tr>
                  <td className="px-4 py-6 text-center text-slate-500" colSpan={8}>
                    Carregando histórico
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td className="px-4 py-6 text-center text-slate-500" colSpan={8}>
                    Nenhuma geração encontrada
                  </td>
                </tr>
              ) : (
                items.map((item) => (
                  <tr className="hover:bg-slate-50" key={item.id}>
                    <td className="px-4 py-3">
                      <button
                        className="text-left font-medium text-slate-950 hover:text-blue-700"
                        onClick={() => void openItem(item.id)}
                        type="button"
                      >
                        {item.releaseTitle || item.fileName || item.releaseHash.slice(0, 10)}
                      </button>
                      <p className="text-xs text-slate-500">{item.releaseHash.slice(0, 16)}</p>
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      <p>{item.provider}</p>
                      <p className="text-xs text-slate-500">{item.model}</p>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{formatDuration(item.durationMs)}</td>
                    <td className="px-4 py-3 text-slate-600">{item.createdById ?? '-'}</td>
                    <td className="px-4 py-3 text-slate-600">
                      {item.testCaseCount} / {item.casesCreated} salvos
                    </td>
                    <td className="px-4 py-3 text-slate-600">{formatDate(item.createdAt)}</td>
                    <td className="px-4 py-3">
                      <span className="rounded-lg border border-slate-200 px-2 py-1 text-xs font-medium text-slate-700">
                        {item.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        className="inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-blue-700 px-3 text-sm font-medium text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50"
                        disabled={!canEdit || regeneratingId === item.id}
                        onClick={() => void regenerate(item.id)}
                        title="Regenerar com configuracao atual"
                        type="button"
                      >
                        <RotateCcw className="h-4 w-4" aria-hidden="true" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selected ? (
        <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-start gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-100 text-blue-700">
              <Bot className="h-4 w-4" aria-hidden="true" />
            </span>
            <div className="min-w-0 flex-1">
              <h2 className="text-sm font-semibold text-slate-950">
                {selected.releaseTitle || selected.fileName || selected.id}
              </h2>
              <p className="text-xs text-slate-500">
                {selected.provider} / {selected.model} / {formatDuration(selected.durationMs)}
              </p>
            </div>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-4">
            {Object.entries(selected.coverage).map(([key, value]) => (
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3" key={key}>
                <p className="text-xs text-slate-500">{key.replace(/_/g, ' ')}</p>
                <p className="mt-1 text-2xl font-semibold text-slate-950">{value}%</p>
              </div>
            ))}
          </div>
          <div className="mt-4 max-h-96 overflow-y-auto rounded-lg border border-slate-200">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="bg-slate-100 text-xs font-medium uppercase text-slate-700">
                <tr>
                  <th className="px-4 py-3">Caso</th>
                  <th className="px-4 py-3">Modulo</th>
                  <th className="px-4 py-3">Origem</th>
                  <th className="px-4 py-3">Risco</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {selected.testCases.map((testCase) => (
                  <tr key={testCase.id}>
                    <td className="px-4 py-3 font-medium text-slate-950">{testCase.titulo}</td>
                    <td className="px-4 py-3 text-slate-600">{testCase.modulo}</td>
                    <td className="px-4 py-3 text-slate-600">{testCase.origem_release}</td>
                    <td className="px-4 py-3 text-slate-600">{testCase.risco}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}
    </div>
  );
}
