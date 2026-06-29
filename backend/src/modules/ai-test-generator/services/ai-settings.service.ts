import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LLMProviderName, LLMRuntimeConfig } from '../domain/ai-test-generator.types';
import {
  AiConfigurationRecord,
  AiConfigurationRepository,
} from '../repositories/ai-configuration.repository';

export const DEFAULT_BASE_PROMPT = [
  'Voce e um Analista de QA Senior especializado em Engenharia de Testes.',
  'Analise todas as secoes da Release Notes.',
  'As Observacoes Tecnicas possuem prioridade maxima.',
  'Nunca invente funcionalidades.',
  'Nunca gere testes que nao estejam relacionados as alteracoes.',
  'Use o Impacto Esperado para criar cenarios complementares.',
  'Pense como um Analista de QA com muitos anos de experiencia.',
  'Retorne exclusivamente JSON valido.',
].join('\n');

export const DEFAULT_USER_PROMPT = [
  'Todo caso de teste deve ter rastreabilidade para origem_release e trecho_release.',
  'Identifique riscos, regressao, auditoria, logs, persistencia, seguranca, performance e automacao quando fizer sentido.',
].join('\n');

const OPENROUTER_PROVIDER: LLMProviderName = 'openrouter';

function toProvider(value: string): LLMProviderName {
  if (value.toLowerCase() === OPENROUTER_PROVIDER) {
    return OPENROUTER_PROVIDER;
  }

  throw new BadRequestException('LLM_PROVIDER must be openrouter.');
}

@Injectable()
export class AiSettingsService {
  constructor(
    private readonly configService: ConfigService,
    private readonly configurationRepository: AiConfigurationRepository,
  ) {}

  async getSettings() {
    const stored = await this.configurationRepository.findDefault();
    return this.normalizeSettings(stored ?? this.getEnvSettings());
  }

  async getRuntimeConfig(): Promise<LLMRuntimeConfig> {
    const settings = await this.getSettings();
    const provider = toProvider(settings.provider);
    const model = settings.model.trim();
    const endpoint = settings.endpoint.trim();

    if (!model) {
      throw new BadRequestException('LLM model is not configured.');
    }

    if (!endpoint) {
      throw new BadRequestException('LLM endpoint is not configured.');
    }

    return {
      provider,
      model,
      endpoint,
      apiKey: this.getOpenRouterApiKey(),
      httpReferer: this.getOpenRouterHttpReferer(),
      appTitle: this.getOpenRouterTitle(),
      temperature: settings.temperature,
      maxTokens: settings.maxTokens,
      timeoutSeconds: settings.timeoutSeconds,
      retries: settings.retries,
      streaming: false,
      promptBase: settings.promptBase,
      promptUser: settings.promptUser,
    };
  }

  async updateSettings(
    dto: {
      provider: string;
      model: string;
      endpoint: string;
      temperature: number;
      maxTokens: number;
      timeoutSeconds: number;
      retries: number;
      streaming: boolean;
      promptBase: string;
      promptUser: string;
    },
    updatedById?: string,
  ) {
    const provider = toProvider(dto.provider);
    const model = dto.model.trim();
    const endpoint = dto.endpoint.trim();

    if (!model) {
      throw new BadRequestException('Model is required.');
    }

    if (!endpoint) {
      throw new BadRequestException('Endpoint is required.');
    }

    return this.configurationRepository.upsertDefault({
      provider,
      model,
      endpoint,
      temperature: dto.temperature,
      maxTokens: dto.maxTokens,
      timeoutSeconds: dto.timeoutSeconds,
      retries: dto.retries,
      streaming: false,
      promptBase: dto.promptBase.trim() || DEFAULT_BASE_PROMPT,
      promptUser: dto.promptUser.trim() || DEFAULT_USER_PROMPT,
      updatedById: updatedById ?? null,
    });
  }

  private getEnvSettings(): AiConfigurationRecord {
    return {
      id: 'default',
      provider: toProvider(this.configService.get<string>('LLM_PROVIDER', OPENROUTER_PROVIDER)),
      model: this.configService.get<string>('OPENROUTER_MODEL', 'openrouter/free'),
      endpoint: this.configService.get<string>(
        'OPENROUTER_ENDPOINT',
        'https://openrouter.ai/api/v1/chat/completions',
      ),
      temperature: this.configService.get<number>('TEMPERATURE', 0.2),
      maxTokens: this.configService.get<number>('MAX_TOKENS', 4096),
      timeoutSeconds: this.configService.get<number>('TIMEOUT', 120),
      retries: this.configService.get<number>('LLM_RETRIES', 3),
      streaming: false,
      promptBase: DEFAULT_BASE_PROMPT,
      promptUser: DEFAULT_USER_PROMPT,
      updatedById: null,
      createdAt: new Date(0),
      updatedAt: new Date(0),
    };
  }

  private normalizeSettings(settings: AiConfigurationRecord): AiConfigurationRecord {
    const envSettings = this.getEnvSettings();
    const isOpenRouterSettings = settings.provider.toLowerCase() === OPENROUTER_PROVIDER;

    return {
      ...settings,
      provider: OPENROUTER_PROVIDER,
      model: isOpenRouterSettings && settings.model.trim() ? settings.model : envSettings.model,
      endpoint: isOpenRouterSettings && settings.endpoint.trim() ? settings.endpoint : envSettings.endpoint,
      temperature: Number.isFinite(settings.temperature) ? settings.temperature : envSettings.temperature,
      maxTokens: settings.maxTokens > 0 ? settings.maxTokens : envSettings.maxTokens,
      timeoutSeconds: settings.timeoutSeconds > 0 ? settings.timeoutSeconds : envSettings.timeoutSeconds,
      retries: settings.retries > 0 ? settings.retries : envSettings.retries,
      streaming: false,
      promptBase: settings.promptBase.trim() || DEFAULT_BASE_PROMPT,
      promptUser: settings.promptUser.trim() || DEFAULT_USER_PROMPT,
    };
  }

  private getOpenRouterApiKey() {
    const apiKey = this.configService.get<string>('OPENROUTER_KEY', '').trim();

    if (!apiKey) {
      throw new BadRequestException('OpenRouter API Key not configured.');
    }

    return apiKey;
  }

  private getOpenRouterHttpReferer() {
    return this.configService.get<string>('OPENROUTER_HTTP_REFERER', 'http://localhost:5173').trim();
  }

  private getOpenRouterTitle() {
    return this.configService.get<string>('OPENROUTER_TITLE', 'QA Platform').trim();
  }
}
