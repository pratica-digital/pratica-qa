import { Injectable } from '@nestjs/common';
import {
  AiCaseAction,
  AiGeneratedTestCase,
  ReleaseAnalysisResult,
} from '../domain/ai-test-generator.types';

const releaseStructure = [
  'Escopo',
  'Destaques da Versao',
  'Novas Funcionalidades',
  'Melhorias',
  'Correcoes de Bugs',
  'Eventos e Auditoria',
  'Impacto Esperado',
  'Observacoes Tecnicas',
];

@Injectable()
export class AiPromptBuilderService {
  buildAnalysisPrompt(releaseNotes: string, promptBase: string, promptUser: string) {
    return [
      promptBase,
      promptUser,
      'Etapa 1: analise a Release Notes e converta TODAS as alteracoes em uma estrutura intermediaria.',
      `A Release Notes sempre possui estas secoes: ${releaseStructure.join(', ')}.`,
      'Prioridade de interpretacao: Observacoes Tecnicas > Impacto Esperado > Correcoes de Bugs > Novas Funcionalidades > Melhorias > Eventos e Auditoria.',
      'Nunca invente funcionalidades. Use o trecho exato da Release Notes em trecho_release.',
      'Retorne exclusivamente JSON valido. A resposta deve comecar com { e terminar com }.',
      'Nao use Markdown, ```json, comentarios, texto explicativo, listas fora do JSON ou virgulas finais.',
      'Formato obrigatorio:',
      JSON.stringify({
        modulo_principal: '',
        resumo: '',
        changes: [
          {
            id: 'REL-001',
            modulo: '',
            tipo: '',
            descricao: '',
            categoria: '',
            impacto: '',
            origem: '',
            trecho_release: '',
            prioridade: 'baixa|media|alta|critica',
            riscos: [],
            funcionalidades_afetadas: [],
            dependencias: [],
          },
        ],
      }),
      'Release Notes:',
      releaseNotes,
    ].join('\n\n');
  }

  buildGenerationPrompt(analysis: ReleaseAnalysisResult, promptBase: string, promptUser: string) {
    return [
      promptBase,
      promptUser,
      'Etapa 2: gere casos de teste completos usando SOMENTE a estrutura intermediaria abaixo.',
      'Nao use diretamente a Release Notes; preserve rastreabilidade por origem_release e trecho_release.',
      'Para cada alteracao gere caso principal, positivos, negativos, regressao, integracao, limite, invalidos, auditoria, logs, persistencia, seguranca quando aplicavel e performance quando fizer sentido.',
      'Inclua dados de teste validos, invalidos, limites, strings especiais, caracteres internacionais, datas, emails, CPFs e valores extremos quando aplicavel.',
      'Ao final gere regression_suite apenas com testes essenciais de maior risco.',
      'Retorne exclusivamente JSON valido. A resposta deve comecar com { e terminar com }.',
      'Nao use Markdown, ```json, comentarios, texto explicativo, listas fora do JSON ou virgulas finais.',
      'Use strings objetivas para evitar resposta truncada.',
      'Formato obrigatorio:',
      JSON.stringify({
        test_cases: [
          {
            id: 'AI-TC-001',
            titulo: '',
            descricao: '',
            pre_condicoes: '',
            passos: [{ descricao: '', resultado_esperado: '' }],
            resultado_esperado: '',
            prioridade: '',
            severidade: '',
            categoria: '',
            modulo: '',
            tipo_teste: '',
            teste_positivo: '',
            teste_negativo: '',
            regressao: '',
            automacao: '',
            risco: '',
            dados_teste: [],
            funcionalidades_afetadas: [],
            origem_release: '',
            trecho_release: '',
            complexidade: '',
            probabilidade_regressao: '',
          },
        ],
        regression_suite: [{ case_id: 'AI-TC-001', titulo: '', risco: '', justificativa: '' }],
        cobertura: {
          novas_funcionalidades: 100,
          melhorias: 100,
          correcoes: 100,
          eventos: 100,
        },
      }),
      'Estrutura intermediaria:',
      JSON.stringify(analysis),
    ].join('\n\n');
  }

  buildRepairPrompt(originalPrompt: string, invalidResponse: string) {
    return [
      originalPrompt,
      'A resposta anterior nao era JSON valido ou nao respeitou o contrato.',
      'Corrija e retorne somente JSON valido. A resposta deve comecar com { e terminar com }.',
      'Nao use Markdown, ```json, comentarios, texto explicativo, listas fora do JSON ou virgulas finais.',
      'Resposta anterior:',
      invalidResponse.slice(0, 6000),
    ].join('\n\n');
  }

  buildCaseActionPrompt(action: AiCaseAction, testCase: AiGeneratedTestCase, context: string) {
    const instructions: Record<AiCaseAction, string> = {
      improve: 'Melhore este caso de teste. Inclua cenarios esquecidos, melhore os passos e a descricao. Nao altere a funcionalidade.',
      'negative-cases': 'Gere apenas cenarios negativos relacionados a este caso.',
      regression: 'Gere apenas testes de regressao relacionados a este caso.',
      'test-data': 'Gere dados de teste completos para este caso.',
      'explain-change': 'Explique resumidamente ao QA qual alteracao foi realizada pelo desenvolvedor.',
    };

    return [
      'Voce e um Analista de QA Senior. Retorne exclusivamente JSON valido, sem Markdown.',
      instructions[action],
      context ? `Contexto adicional: ${context}` : '',
      'Caso de teste:',
      JSON.stringify(testCase),
    ].join('\n\n');
  }
}
