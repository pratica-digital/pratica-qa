import { AlertCircle, Tags, X } from "lucide-react";
import { useState } from "react";
import { createPortal } from "react-dom";
import { useAuth } from "../../auth/useAuth";
import { testRunsApi } from "../../lib/api";
import {
  TEST_RUN_TYPE_OPTIONS,
  TEST_RUN_TYPE_NOT_DEFINED,
  testRunTypeLabel,
} from "../../lib/testRunTypes";
import type { TestRun, TestRunTestType } from "../../types/testRun";

type Props = {
  testRun: TestRun;
  onClose: () => void;
  onUpdated: (testRun: TestRun) => void;
};

function initialAssignments(testRun: TestRun) {
  return Object.fromEntries(
    (testRun?.suites ?? []).map((suite) => [
      suite.testSuiteId,
      suite.testType ?? "FUNCIONAL",
    ]),
  ) as Record<string, TestRunTestType>;
}

export function EditTestRunTypesModal({ testRun, onClose, onUpdated }: Props) {
  const { token } = useAuth();
  const [assignments, setAssignments] = useState<Record<string, TestRunTestType>>(
    () => initialAssignments(testRun),
  );
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    if (!token) return;

    const testTypes = TEST_RUN_TYPE_OPTIONS.map(({ type }) => ({
      type,
      suites: (testRun.suites ?? [])
        .filter((suite) => assignments[suite.testSuiteId] === type)
        .map((suite) => suite.testSuiteId),
    })).filter(({ suites }) => suites.length > 0);

    setSubmitting(true);
    setError("");
    try {
      onUpdated(await testRunsApi.update(token, testRun.id, { testTypes }));
      onClose();
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Não foi possível atualizar os tipos de teste.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/40 p-4">
      <div className="w-full max-w-xl overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
        <div className="flex items-center gap-3 border-b border-slate-200 px-5 py-4">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-100 text-blue-700">
            <Tags className="h-4 w-4" aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-sm font-semibold text-slate-950">Editar tipos de teste</h2>
            <p className="truncate text-xs text-slate-500">{testRun.name}</p>
          </div>
          <button className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100" onClick={onClose} type="button">
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <div className="max-h-[60vh] space-y-3 overflow-y-auto p-5">
          <p className="text-sm text-slate-600">
            Classifique cada suíte já associada. Os casos e resultados da execução não serão alterados.
          </p>
          {error ? (
            <p className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              <AlertCircle className="h-4 w-4" aria-hidden="true" /> {error}
            </p>
          ) : null}
          {(testRun.suites ?? []).length === 0 ? (
            <p className="rounded-lg border border-dashed border-slate-300 p-4 text-sm text-slate-500">
              {TEST_RUN_TYPE_NOT_DEFINED}. Esta execução não possui suítes para classificar.
            </p>
          ) : (
            (testRun.suites ?? []).map((suite) => (
              <label className="grid gap-2 rounded-lg border border-slate-200 p-3 sm:grid-cols-[1fr_12rem] sm:items-center" key={suite.id}>
                <span className="min-w-0 truncate text-sm font-medium text-slate-900">
                  {suite.testSuite?.name ?? suite.testSuiteId}
                </span>
                <select
                  className="h-9 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900"
                  onChange={(event) =>
                    setAssignments((current) => ({
                      ...current,
                      [suite.testSuiteId]: event.target.value as TestRunTestType,
                    }))
                  }
                  value={assignments[suite.testSuiteId] ?? "FUNCIONAL"}
                >
                  {TEST_RUN_TYPE_OPTIONS.map(({ type }) => (
                    <option key={type} value={type}>{testRunTypeLabel(type)}</option>
                  ))}
                </select>
              </label>
            ))
          )}
        </div>

        <div className="flex justify-end gap-2 border-t border-slate-200 px-5 py-4">
          <button className="h-9 rounded-lg bg-slate-600 px-4 text-sm font-medium text-white hover:bg-slate-700" onClick={onClose} type="button">Cancelar</button>
          <button
            className="h-9 rounded-lg bg-blue-700 px-4 text-sm font-medium text-white hover:bg-blue-800 disabled:opacity-50"
            disabled={submitting || (testRun.suites ?? []).length === 0}
            onClick={() => void handleSubmit()}
            type="button"
          >
            {submitting ? "Salvando" : "Salvar tipos"}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
