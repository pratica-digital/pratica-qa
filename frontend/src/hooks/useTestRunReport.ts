import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../auth/useAuth';
import { ApiError, testRunsApi } from '../lib/api';
import { summarizeTestResults, type TestRunSummary } from '../lib/testRunSummary';
import type { TestResult, TestRun } from '../types/testRun';

export type TestRunReport = {
  testRun: TestRun;
  results: TestResult[];
  summary: TestRunSummary;
};

export function useTestRunReport(testRunId: string) {
  const { token } = useAuth();
  const [report, setReport] = useState<TestRunReport | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchReport = useCallback(async () => {
    if (!token || !testRunId) return null;

    setIsLoading(true);
    setError('');

    try {
      const testRun = await testRunsApi.get(token, testRunId);
      const results = testRun.results ?? [];

      const summary = summarizeTestResults(results);
      const nextReport = { testRun, results, summary };

      setReport(nextReport);
      return nextReport;
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        setError('Sessão expirada. Faça login novamente.');
      } else {
        setError(err instanceof Error ? err.message : 'Erro ao carregar relatório.');
      }
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [token, testRunId]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void fetchReport();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [fetchReport]);

  return { report, isLoading, error, refetch: fetchReport };
}
