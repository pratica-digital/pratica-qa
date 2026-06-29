import { useCallback, useEffect, useState } from 'react';
import { Bot, Lock, RefreshCw, Save, SlidersHorizontal } from 'lucide-react';
import { useAuth } from '../auth/useAuth';
import { aiTestGeneratorApi } from '../lib/api';
import type { AiSettings } from '../types/testRun';

const emptySettings: AiSettings = {
  provider: 'openrouter',
  model: 'openrouter/free',
  endpoint: 'https://openrouter.ai/api/v1/chat/completions',
  temperature: 0.2,
  maxTokens: 4096,
  timeoutSeconds: 120,
  retries: 3,
  streaming: false,
  promptBase: '',
  promptUser: '',
};

type AiSettingsPageProps = {
  embedded?: boolean;
};

export function AiSettingsPage({ embedded = false }: AiSettingsPageProps = {}) {
  const { token, user } = useAuth();
  const canEdit = user?.role === 'ADMIN';
  const [settings, setSettings] = useState<AiSettings>(emptySettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const runtimeFields = [
    { label: 'Provedor', value: settings.provider },
    { label: 'Modelo', value: settings.model },
    { label: 'Endpoint', value: settings.endpoint },
    { label: 'Temperatura', value: String(settings.temperature) },
    { label: 'Tokens maximos', value: String(settings.maxTokens) },
    { label: 'Timeout', value: `${settings.timeoutSeconds}s` },
    { label: 'Tentativas', value: String(settings.retries) },
    { label: 'Streaming', value: settings.streaming ? 'Ativo' : 'Inativo' },
    { label: 'Chaves de API', value: 'Configuradas no backend' },
  ];

  const fetchSettings = useCallback(async () => {
    if (!token) {
      return;
    }

    setLoading(true);
    setError('');

    try {
      const nextSettings = await aiTestGeneratorApi.getSettings(token);
      setSettings({ ...nextSettings, provider: 'openrouter', streaming: false });
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : 'Nao foi possivel carregar as configuracoes.');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void fetchSettings();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [fetchSettings]);

  function setField<FieldName extends keyof AiSettings>(
    field: FieldName,
    value: AiSettings[FieldName],
  ) {
    setSettings((current) => ({ ...current, [field]: value }));
    setSuccess('');
  }

  async function handleSave() {
    if (!token || !canEdit) {
      return;
    }

    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const saved = await aiTestGeneratorApi.updateSettings(token, settings);
      setSettings({ ...saved, provider: 'openrouter', streaming: false });
      setSuccess('Configuracoes salvas.');
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Nao foi possivel salvar.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          {embedded ? (
            <h2 className="mt-1 text-xl font-semibold tracking-normal text-slate-950">
              Configuracoes
            </h2>
          ) : (
            <h1 className="mt-1 text-2xl font-semibold tracking-normal text-slate-950">
              Configuracoes de IA
            </h1>
          )}
          <p className="text-sm font-medium text-slate-500">
            Provedor ativo: {settings.provider} / {settings.model}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-slate-600 bg-slate-600 px-3 text-sm font-medium text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={loading}
            onClick={() => void fetchSettings()}
            title="Atualizar"
            type="button"
          >
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
          </button>
          <button
            className="inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-blue-700 px-3 text-sm font-medium text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={!canEdit || saving || loading}
            onClick={() => void handleSave()}
            title={canEdit ? 'Salvar prompts' : 'Somente administradores podem editar'}
            type="button"
          >
            <Save className="h-4 w-4" aria-hidden="true" />
            {saving ? 'Salvando' : 'Salvar'}
          </button>
        </div>
      </div>

      {error ? (
        <p className="rounded-lg border border-red-200 bg-red-100 px-3 py-2 text-sm text-red-800">
          {error}
        </p>
      ) : null}

      {success ? (
        <p className="rounded-lg border border-emerald-200 bg-emerald-100 px-3 py-2 text-sm text-emerald-800">
          {success}
        </p>
      ) : null}

      {!canEdit ? (
        <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <Lock className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <p>Configuracoes globais da IA sao administradas pela equipe responsavel pela aplicacao.</p>
        </div>
      ) : null}

      <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center gap-3 border-b border-slate-200 px-4 py-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-100 text-blue-700">
            <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
          </span>
          <h2 className="text-sm font-semibold text-slate-950">Runtime</h2>
        </div>
        <div className="grid gap-3 p-4 md:grid-cols-2 xl:grid-cols-3">
          {runtimeFields.map((field) => (
            <div className="min-w-0 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2" key={field.label}>
              <p className="text-xs font-medium uppercase text-slate-500">{field.label}</p>
              <p className="mt-1 break-words text-sm font-semibold text-slate-950">{field.value}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <label className="block rounded-lg border border-slate-200 bg-white p-4 text-sm font-medium text-slate-700 shadow-sm">
          <span className="mb-2 flex items-center gap-2">
            <Bot className="h-4 w-4 text-slate-500" aria-hidden="true" />
            Prompt base
          </span>
          <textarea
            className="min-h-80 w-full resize-y rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500 disabled:bg-slate-50"
            disabled={!canEdit || saving}
            onChange={(event) => setField('promptBase', event.target.value)}
            value={settings.promptBase}
          />
        </label>

        <label className="block rounded-lg border border-slate-200 bg-white p-4 text-sm font-medium text-slate-700 shadow-sm">
          <span className="mb-2 flex items-center gap-2">
            <Bot className="h-4 w-4 text-slate-500" aria-hidden="true" />
            Prompt do usuario
          </span>
          <textarea
            className="min-h-80 w-full resize-y rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500 disabled:bg-slate-50"
            disabled={!canEdit || saving}
            onChange={(event) => setField('promptUser', event.target.value)}
            value={settings.promptUser}
          />
        </label>
      </div>
    </div>
  );
}
