import { Injectable, Logger } from '@nestjs/common';
import { LLMRuntimeConfig } from '../domain/ai-test-generator.types';
import { OpenRouterHttpService } from './openrouter-http.service';
import { OpenRouterResponseParserService } from './openrouter-response-parser.service';

@Injectable()
export class OpenRouterClientService {
  private readonly logger = new Logger(OpenRouterClientService.name);

  constructor(
    private readonly http: OpenRouterHttpService,
    private readonly parser: OpenRouterResponseParserService,
  ) {}

  async generate(prompt: string, config: LLMRuntimeConfig, attempt: number): Promise<string> {
    const response = await this.http.post(config, {
      model: config.model,
      messages: [{ role: 'user', content: prompt }],
      temperature: config.temperature,
      max_tokens: config.maxTokens,
      stream: false,
    });
    const parsed = this.parser.parse(response.data);

    this.logger.log(
      JSON.stringify({
        event: 'openrouter.request.success',
        provider: config.provider,
        model: config.model,
        durationMs: response.durationMs,
        usage: parsed.usage,
        attempt,
      }),
    );

    return parsed.text;
  }
}
