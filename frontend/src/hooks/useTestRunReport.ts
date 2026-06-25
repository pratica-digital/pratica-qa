import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../auth/useAuth';
import { ApiError, testRunsApi } from '../lib/api';
import type { TestResult, TestRun } from '../types/testRun';

export type TestRunReport = {
  testRun: TestRun;
  results: TestResult[];
  summary: {
    passed: number;
    failed: number;
    skipped: number;
    notRun: number;
    total: number;
  };
};

export function useTestRunReport(testRunId: string) {
  const { token } = useAuth();
  const [report, setReport] = useState<TestRunReport | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchReport = useCallback(async () => {
    if (!token || !testRunId) return;

    setIsLoading(true);
    setError('');

    try {
      const testRun = await testRunsApi.get(token, testRunId);
      const results = testRun.results ?? [];

      const summary = {
        passed: results.filter((r) => r.status === 'PASSED').length,
        failed: results.filter((r) => r.status === 'FAILED').length,
        skipped: results.filter((r) => r.status === 'SKIPPED').length,
        notRun: results.filter((r) => r.status === 'PENDING').length,
        total: results.length,
      };

      setReport({ testRun, results, summary });
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        setError('Sessão expirada. Faça login novamente.');
      } else {
        setError(err instanceof Error ? err.message : 'Erro ao carregar relatório.');
      }
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
