import { Injectable } from '@nestjs/common';
import { LLMRuntimeConfig } from '../domain/ai-test-generator.types';
import { OpenRouterErrorService, isOpenRouterException } from './openrouter-error.service';

export type OpenRouterHttpResult = {
  data: unknown;
  durationMs: number;
};

@Injectable()
export class OpenRouterHttpService {
  constructor(private readonly errors: OpenRouterErrorService) {}

  async post(config: LLMRuntimeConfig, body: unknown): Promise<OpenRouterHttpResult> {
    if (!config.endpoint.trim()) {
      throw this.errors.configuration('OpenRouter endpoint is not configured.');
    }

    if (!config.apiKey.trim()) {
      throw this.errors.configuration('OpenRouter API Key not configured.');
    }

    const startedAt = Date.now();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), config.timeoutSeconds * 1000);

    try {
      const response = await fetch(config.endpoint, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${config.apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': config.httpReferer,
          'X-Title': config.appTitle,
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      const responseText = await response.text();
      const durationMs = Date.now() - startedAt;

      if (!response.ok) {
        throw this.errors.fromStatus(response.status);
      }

      return {
        data: this.parseResponse(responseText),
        durationMs,
      };
    } catch (error) {
      if (isOpenRouterException(error)) {
        throw error;
      }

      if (error instanceof Error && error.name === 'AbortError') {
        throw this.errors.timeout();
      }

      throw this.errors.network();
    } finally {
      clearTimeout(timeout);
    }
  }

  private parseResponse(responseText: string): unknown {
    if (!responseText.trim()) {
      return {};
    }

    try {
      return JSON.parse(responseText) as unknown;
    } catch {
      return responseText;
    }
  }
}
