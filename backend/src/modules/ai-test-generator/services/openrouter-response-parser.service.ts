import { Injectable } from '@nestjs/common';
import { LLMTokenUsage } from '../domain/ai-test-generator.types';
import { OpenRouterErrorService } from './openrouter-error.service';

type ParsedOpenRouterResponse = {
  text: string;
  usage?: LLMTokenUsage;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function asNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

@Injectable()
export class OpenRouterResponseParserService {
  constructor(private readonly errors: OpenRouterErrorService) {}

  parse(response: unknown): ParsedOpenRouterResponse {
    const text = this.extractText(response).trim();

    if (!text) {
      throw this.errors.emptyResponse();
    }

    return {
      text,
      usage: this.extractUsage(response),
    };
  }

  private extractText(response: unknown): string {
    if (!isRecord(response)) {
      return '';
    }

    const choices = response.choices;

    if (!Array.isArray(choices) || choices.length === 0) {
      return '';
    }

    const firstChoice = choices[0];

    if (!isRecord(firstChoice)) {
      return '';
    }

    const message = firstChoice.message;

    if (isRecord(message)) {
      return this.extractContent(message.content);
    }

    return this.extractContent(firstChoice.text);
  }

  private extractContent(content: unknown): string {
    if (typeof content === 'string') {
      return content;
    }

    if (Array.isArray(content)) {
      return content.map((item) => this.extractContentBlock(item)).join('');
    }

    if (isRecord(content)) {
      return this.extractContentBlock(content);
    }

    return '';
  }

  private extractContentBlock(block: unknown): string {
    if (typeof block === 'string') {
      return block;
    }

    if (!isRecord(block)) {
      return '';
    }

    if (typeof block.text === 'string') {
      return block.text;
    }

    if (typeof block.content === 'string') {
      return block.content;
    }

    if (Array.isArray(block.content)) {
      return this.extractContent(block.content);
    }

    return '';
  }

  private extractUsage(response: unknown): LLMTokenUsage | undefined {
    if (!isRecord(response) || !isRecord(response.usage)) {
      return undefined;
    }

    const usage: LLMTokenUsage = {
      promptTokens: asNumber(response.usage.prompt_tokens),
      completionTokens: asNumber(response.usage.completion_tokens),
      totalTokens: asNumber(response.usage.total_tokens),
    };

    return Object.values(usage).some((value) => value !== undefined) ? usage : undefined;
  }
}
