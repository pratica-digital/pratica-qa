import { ChevronDown, ChevronRight, Plus, Search, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useAuth } from "../../auth/useAuth";
import {
  getCasesForSuite,
  summarizeAddTestRunSelection,
  toggleSuiteCases,
} from "../../lib/addTestRunSelection";
import { testCasesApi, testRunsApi, testSuitesApi } from "../../lib/api";
import type {
  AddTestRunTestsResponse,
  ManagedTestCase,
  ManagedTestSuite,
  TestRun,
} from "../../types/testRun";

type AddTestsToRunModalProps = {
  onAdded: (summary: AddTestRunTestsResponse, testRun: TestRun) => void;
  onClose: () => void;
  testRun: TestRun;
};

export function AddTestsToRunModal({
  onAdded,
  onClose,
  testRun,
}: AddTestsToRunModalProps) {
  const { token } = useAuth();
  const [suites, setSuites] = useState<ManagedTestSuite[]>([]);
  const [cases, setCases] = useState<ManagedTestCase[]>([]);
  const [selectedCaseIds, setSelectedCaseIds] = useState<Set<string>>(
    new Set(),
  );
  const [expandedSuiteIds, setExpandedSuiteIds] = useState<Set<string>>(
    new Set(),
  );
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(Boolean(token));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const existingRunCaseIds = useMemo(
    () => new Set((testRun.results ?? []).map((result) => result.testCaseId)),
    [testRun.results],
  );
  const summary = useMemo(
    () =>
      summarizeAddTestRunSelection(
        suites,
        cases,
        selectedCaseIds,
        existingRunCaseIds,
      ),
    [cases, existingRunCaseIds, selectedCaseIds, suites],
  );
  const selectedTotal =
    summary.newCaseIds.length + summary.duplicateCaseIds.length;
  const filteredSuites = useMemo(() => {
    const normalizedSearch = search.trim().toLocaleLowerCase("pt-BR");
    if (!normalizedSearch) {
      return suites;
    }

    return suites.filter(
      (suite) =>
        suite.name.toLocaleLowerCase("pt-BR").includes(normalizedSearch) ||
        getCasesForSuite(cases, suite.id).some((testCase) =>
          testCase.title.toLocaleLowerCase("pt-BR").includes(normalizedSearch),
        ),
    );
  }, [cases, search, suites]);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  useEffect(() => {
    if (!token) {
      return;
    }

    let cancelled = false;
    Promise.all([
      testSuitesApi.list(token, { projectId: testRun.projectId, limit: 100 }),
      testCasesApi.list(token, {
        projectId: testRun.projectId,
        status: "ACTIVE",
        limit: 100,
      }),
    ])
      .then(([nextSuites, nextCases]) => {
        if (!cancelled) {
          setSuites(nextSuites);
          setCases(nextCases);
        }
      })
      .catch((loadError) => {
        if (!cancelled) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Não foi possível carregar os testes.",
          );
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [testRun.projectId, token]);

  function toggleExpanded(suiteId: string) {
    setExpandedSuiteIds((current) => {
      const next = new Set(current);
      if (next.has(suiteId)) {
        next.delete(suiteId);
      } else {
        next.add(suiteId);
      }
      return next;
    });
  }

  function toggleCase(testCaseId: string) {
    setSelectedCaseIds((current) => {
      const next = new Set(current);
      if (next.has(testCaseId)) {
        next.delete(testCaseId);
      } else {
        next.add(testCaseId);
      }
      return next;
    });
  }

  async function handleConfirm() {
    if (!token || selectedTotal === 0 || submitting) {
      return;
    }

    setSubmitting(true);
    setError("");
    try {
      const response = await testRunsApi.addTests(token, testRun.id, {
        testSuiteIds: summary.selectedSuiteIds,
        testCaseIds: summary.selectedCaseIds,
      });
      const freshRun = await testRunsApi.get(token, testRun.id);
      onAdded(response, freshRun);
      onClose();
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Não foi possível adicionar os testes.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-[10000] flex items-end justify-center bg-slate-950/40 p-0 backdrop-blur-sm sm:items-center sm:p-4">
      <div
        aria-labelledby="add-tests-title"
        aria-modal="true"
        className="flex max-h-[95dvh] w-full max-w-4xl flex-col overflow-hidden rounded-t-xl bg-white shadow-2xl sm:max-h-[90vh] sm:rounded-xl"
        role="dialog"
      >
        <header className="flex items-center justify-between gap-3 border-b border-slate-200 px-5 py-4">
          <div>
            <h2
              className="text-base font-semibold text-slate-950"
              id="add-tests-title"
            >
              Adicionar testes
            </h2>
            <p className="mt-1 text-xs text-slate-500">{testRun.name}</p>
          </div>
          <button
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            disabled={submitting}
            onClick={onClose}
            title="Fechar"
            type="button"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </header>

        <div className="grid min-h-0 flex-1 md:grid-cols-[1fr_18rem]">
          <div className="flex min-h-0 flex-col border-b border-slate-200 md:border-b-0 md:border-r">
            <div className="p-4">
              <label className="relative block">
                <Search
                  className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400"
                  aria-hidden="true"
                />
                <input
                  className="h-9 w-full rounded-lg border border-slate-300 pl-9 pr-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Pesquisar suítes ou casos"
                  value={search}
                />
              </label>
            </div>

            <div className="min-h-0 flex-1 space-y-2 overflow-y-auto px-4 pb-4">
              {loading ? (
                <p className="py-8 text-center text-sm text-slate-500">
                  Carregando testes...
                </p>
              ) : null}
              {!loading && filteredSuites.length === 0 ? (
                <p className="py-8 text-center text-sm text-slate-500">
                  Nenhuma suíte encontrada.
                </p>
              ) : null}
              {filteredSuites.map((suite) => {
                const suiteCases = getCasesForSuite(cases, suite.id);
                const selectedCount = suiteCases.filter((testCase) =>
                  selectedCaseIds.has(testCase.id),
                ).length;
                const allSelected =
                  suiteCases.length > 0 && selectedCount === suiteCases.length;
                const expanded =
                  expandedSuiteIds.has(suite.id) || Boolean(search.trim());

                return (
                  <section
                    className="overflow-hidden rounded-lg border border-slate-200"
                    key={suite.id}
                  >
                    <div className="flex items-center gap-2 bg-slate-50 px-3 py-2.5">
                      <input
                        aria-label={`Selecionar todos os casos de ${suite.name}`}
                        checked={allSelected}
                        disabled={suiteCases.length === 0}
                        onChange={() =>
                          setSelectedCaseIds((current) =>
                            toggleSuiteCases(current, suiteCases),
                          )
                        }
                        type="checkbox"
                      />
                      <button
                        className="flex min-w-0 flex-1 items-center justify-between gap-3 text-left"
                        onClick={() => toggleExpanded(suite.id)}
                        type="button"
                      >
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-semibold text-slate-900">
                            {suite.name}
                          </span>
                          <span className="block text-xs text-slate-500">
                            {suiteCases.length} casos · {selectedCount}{" "}
                            selecionados
                          </span>
                        </span>
                        {expanded ? (
                          <ChevronDown className="h-4 w-4 shrink-0 text-slate-500" />
                        ) : (
                          <ChevronRight className="h-4 w-4 shrink-0 text-slate-500" />
                        )}
                      </button>
                    </div>

                    {expanded ? (
                      <div className="space-y-1 border-t border-slate-200 p-2">
                        {suiteCases.length === 0 ? (
                          <p className="px-2 py-3 text-xs text-slate-500">
                            Suíte sem casos ativos.
                          </p>
                        ) : null}
                        {suiteCases.map((testCase) => {
                          const alreadyInRun = existingRunCaseIds.has(
                            testCase.id,
                          );
                          return (
                            <label
                              className="flex cursor-pointer items-start gap-3 rounded-md px-2 py-2 hover:bg-blue-50"
                              key={testCase.id}
                            >
                              <input
                                checked={selectedCaseIds.has(testCase.id)}
                                className="mt-0.5"
                                onChange={() => toggleCase(testCase.id)}
                                type="checkbox"
                              />
                              <span className="min-w-0 flex-1">
                                <span className="block text-sm text-slate-800">
                                  {testCase.position}. {testCase.title}
                                </span>
                                {alreadyInRun ? (
                                  <span className="mt-0.5 block text-xs font-medium text-amber-700">
                                    Já pertence ao Test Run — será ignorado
                                  </span>
                                ) : null}
                              </span>
                            </label>
                          );
                        })}
                      </div>
                    ) : null}
                  </section>
                );
              })}
            </div>
          </div>

          <aside className="space-y-4 overflow-y-auto bg-slate-50 p-4">
            <h3 className="text-sm font-semibold text-slate-950">
              Resumo da seleção
            </h3>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between gap-3">
                <dt className="text-slate-600">Suítes completas</dt>
                <dd className="font-semibold text-slate-950">
                  {summary.selectedSuiteIds.length}
                </dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-slate-600">Casos selecionados</dt>
                <dd className="font-semibold text-slate-950">
                  {selectedTotal}
                </dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-slate-600">Novos casos</dt>
                <dd className="font-semibold text-emerald-700">
                  {summary.newCaseIds.length}
                </dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-slate-600">Já existentes</dt>
                <dd className="font-semibold text-amber-700">
                  {summary.duplicateCaseIds.length}
                </dd>
              </div>
              <div className="flex justify-between gap-3 border-t border-slate-200 pt-2">
                <dt className="text-slate-600">Novo total estimado</dt>
                <dd className="font-semibold text-slate-950">
                  {existingRunCaseIds.size + summary.newCaseIds.length}
                </dd>
              </div>
            </dl>
            {!token || error ? (
              <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {error || "Autenticação obrigatória."}
              </p>
            ) : null}
          </aside>
        </div>

        <footer className="flex flex-col-reverse gap-2 border-t border-slate-200 px-5 py-4 sm:flex-row sm:justify-end">
          <button
            className="h-9 rounded-lg border border-slate-300 bg-white px-4 text-sm font-medium text-slate-700 hover:bg-slate-50"
            disabled={submitting}
            onClick={onClose}
            type="button"
          >
            Cancelar
          </button>
          <button
            className="inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-blue-700 px-4 text-sm font-medium text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={loading || submitting || selectedTotal === 0}
            onClick={() => void handleConfirm()}
            type="button"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            {submitting ? "Adicionando..." : "Adicionar testes"}
          </button>
        </footer>
      </div>
    </div>,
    document.body,
  );
}
