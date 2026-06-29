import { Injectable, Logger } from '@nestjs/common';
import {
  AiCaseAction,
  AiGeneratedTestCase,
  AiTestGenerationResult,
  LLMRuntimeConfig,
  ReleaseAnalysisResult,
} from '../domain/ai-test-generator.types';
import { AiJsonService } from './ai-json.service';
import { AiPromptBuilderService } from './ai-prompt-builder.service';
import { AiSettingsService } from './ai-settings.service';
import { OpenRouterClientService } from './openrouter-client.service';
import { OpenRouterRetryService } from './openrouter-retry.service';

@Injectable()
export class LLMService {
  private readonly logger = new Logger(LLMService.name);

  constructor(
    private readonly settingsService: AiSettingsService,
    private readonly openRouterClient: OpenRouterClientService,
    private readonly retryService: OpenRouterRetryService,
    private readonly promptBuilder: AiPromptBuilderService,
    private readonly jsonService: AiJsonService,
  ) {}

  async analyzeRelease(
    releaseNotes: string,
    runtimeConfig?: LLMRuntimeConfig,
  ): Promise<ReleaseAnalysisResult> {
    const config = runtimeConfig ?? (await this.settingsService.getRuntimeConfig());
    const prompt = this.promptBuilder.buildAnalysisPrompt(
      releaseNotes,
      config.promptBase,
      config.promptUser,
    );

    return this.generateValidated(prompt, config, (raw) =>
      this.jsonService.normalizeAnalysis(this.jsonService.parseJson(raw)),
    );
  }

  async generateTestCases(
    releaseNotes: string,
    runtimeConfig?: LLMRuntimeConfig,
  ): Promise<{ analysis: ReleaseAnalysisResult; generation: AiTestGenerationResult }> {
    const config = runtimeConfig ?? (await this.settingsService.getRuntimeConfig());
    const analysis = await this.analyzeRelease(releaseNotes, config);
    const generation = await this.generateTestCasesFromAnalysis(analysis, config);
    return { analysis, generation };
  }

  async generateTestCasesFromAnalysis(
    analysis: ReleaseAnalysisResult,
    runtimeConfig?: LLMRuntimeConfig,
  ): Promise<AiTestGenerationResult> {
    const config = runtimeConfig ?? (await this.settingsService.getRuntimeConfig());
    const prompt = this.promptBuilder.buildGenerationPrompt(
      analysis,
      config.promptBase,
      config.promptUser,
    );

    return this.generateValidated(prompt, config, (raw) =>
      this.jsonService.normalizeGeneration(this.jsonService.parseJson(raw)),
    );
  }

  async generateCaseAction(
    action: AiCaseAction,
    testCase: AiGeneratedTestCase,
    context = '',
  ): Promise<unknown> {
    const config = await this.settingsService.getRuntimeConfig();
    const prompt = this.promptBuilder.buildCaseActionPrompt(action, testCase, context);

    return this.generateValidated(prompt, config, (raw) => this.jsonService.parseJson(raw));
  }

  private async generateValidated<T>(
    prompt: string,
    config: LLMRuntimeConfig,
    validate: (rawResponse: string) => T,
  ): Promise<T> {
    let currentPrompt = prompt;
    let lastResponse = '';
    let lastError: unknown;
    const maxAttempts = this.retryService.maxAttempts(config);

    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      let shouldRepairPrompt = false;

      try {
        const rawResponse = await this.openRouterClient.generate(currentPrompt, config, attempt);
        lastResponse = rawResponse;
        shouldRepairPrompt = true;
        return validate(rawResponse);
      } catch (error) {
        lastError = error;
        this.retryService.logFailure(error, config, attempt, maxAttempts);

        if (!this.retryService.canRetry(error, attempt, maxAttempts)) {
          throw error;
        }

        if (shouldRepairPrompt && lastResponse) {
          this.logger.warn(
            JSON.stringify({
              event: 'openrouter.response.repair_requested',
              provider: config.provider,
              model: config.model,
              attempt,
            }),
          );
          currentPrompt = this.promptBuilder.buildRepairPrompt(currentPrompt, lastResponse);
        }

        await this.retryService.wait(attempt);
      }
    }

    throw lastError instanceof Error ? lastError : new Error('LLM generation failed.');
  }
}
