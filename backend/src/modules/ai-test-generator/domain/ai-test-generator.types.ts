export type LLMProviderName = 'openrouter';

export type LLMTokenUsage = {
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
};

export type LLMRuntimeConfig = {
  provider: LLMProviderName;
  model: string;
  endpoint: string;
  apiKey: string;
  httpReferer: string;
  appTitle: string;
  temperature: number;
  maxTokens: number;
  timeoutSeconds: number;
  retries: number;
  streaming: boolean;
  promptBase: string;
  promptUser: string;
};

export type ReleaseChange = {
  id: string;
  modulo: string;
  tipo: string;
  descricao: string;
  categoria: string;
  impacto: string;
  origem: string;
  trecho_release: string;
  prioridade: 'baixa' | 'media' | 'alta' | 'critica';
  riscos: string[];
  funcionalidades_afetadas: string[];
  dependencias: string[];
};

export type ReleaseAnalysisResult = {
  modulo_principal: string;
  resumo: string;
  changes: ReleaseChange[];
};

export type AiGeneratedStep = {
  descricao: string;
  resultado_esperado: string;
};

export type AiGeneratedTestCase = {
  id: string;
  titulo: string;
  descricao: string;
  pre_condicoes: string;
  passos: AiGeneratedStep[];
  resultado_esperado: string;
  prioridade: string;
  severidade: string;
  categoria: string;
  modulo: string;
  tipo_teste: string;
  teste_positivo: string;
  teste_negativo: string;
  regressao: string;
  automacao: string;
  risco: string;
  dados_teste: string[];
  funcionalidades_afetadas: string[];
  origem_release: string;
  trecho_release: string;
  complexidade: string;
  probabilidade_regressao: string;
};

export type AiRegressionSuiteItem = {
  case_id: string;
  titulo: string;
  risco: string;
  justificativa: string;
};

export type AiCoverage = {
  novas_funcionalidades: number;
  melhorias: number;
  correcoes: number;
  eventos: number;
};

export type AiTestGenerationResult = {
  test_cases: AiGeneratedTestCase[];
  regression_suite: AiRegressionSuiteItem[];
  cobertura: AiCoverage;
};

export type AiGenerationRecord = {
  id: string;
  releaseTitle: string;
  fileName: string;
  releaseHash: string;
  releaseText: string;
  analysis: ReleaseAnalysisResult;
  testCases: AiGeneratedTestCase[];
  regressionSuite: AiRegressionSuiteItem[];
  coverage: AiCoverage;
  provider: string;
  model: string;
  status: string;
  durationMs: number | null;
  casesCreated: number;
  createdById: string | null;
  errorMessage: string;
  createdAt: Date;
  updatedAt: Date;
};

export type AiHistoryItem = Omit<AiGenerationRecord, 'releaseText' | 'analysis' | 'testCases' | 'regressionSuite' | 'coverage'> & {
  testCaseCount: number;
};

export type AiCaseAction =
  | 'improve'
  | 'negative-cases'
  | 'regression'
  | 'test-data'
  | 'explain-change';
