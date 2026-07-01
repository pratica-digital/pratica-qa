import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { LLMRuntimeConfig } from '../domain/ai-test-generator.types';
import { isOpenRouterException } from './openrouter-error.service';

@Injectable()
export class OpenRouterRetryService {
  private readonly logger = new Logger(OpenRouterRetryService.name);
  private readonly baseDelayMs = 500;
  private readonly maxDelayMs = 8000;

  maxAttempts(config: LLMRuntimeConfig) {
    return Math.max(1, config.retries);
  }

  canRetry(error: unknown, attempt: number, maxAttempts: number) {
    if (attempt >= maxAttempts) {
      return false;
    }

    if (isOpenRouterException(error)) {
      return error.retryable;
    }

    return !(error instanceof BadRequestException);
  }

  async wait(attempt: number) {
    const delayMs = Math.min(this.baseDelayMs * 2 ** (attempt - 1), this.maxDelayMs);
    await new Promise((resolve) => {
      setTimeout(resolve, delayMs);
    });
  }

  logFailure(error: unknown, config: LLMRuntimeConfig, attempt: number, maxAttempts: number) {
    this.logger.warn(
      JSON.stringify({
        event: 'openrouter.request.failure',
        provider: config.provider,
        model: config.model,
        attempt,
        maxAttempts,
        reason: this.getReason(error),
      }),
    );
  }

  private getReason(error: unknown) {
    if (isOpenRouterException(error)) {
      return error.reason;
    }

    return error instanceof Error ? error.message : 'unknown_error';
  }
}
