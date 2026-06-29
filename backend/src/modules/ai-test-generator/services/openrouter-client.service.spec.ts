import { Logger } from '@nestjs/common';
import { LLMRuntimeConfig } from '../domain/ai-test-generator.types';
import { OpenRouterClientService } from './openrouter-client.service';
import { OpenRouterErrorService } from './openrouter-error.service';
import { OpenRouterHttpService } from './openrouter-http.service';
import { OpenRouterResponseParserService } from './openrouter-response-parser.service';
import { OpenRouterRetryService } from './openrouter-retry.service';

const config: LLMRuntimeConfig = {
  provider: 'openrouter',
  model: 'openrouter/free',
  endpoint: 'https://openrouter.ai/api/v1/chat/completions',
  apiKey: 'test-key',
  httpReferer: 'http://localhost:5173',
  appTitle: 'QA Platform',
  temperature: 0.2,
  maxTokens: 4096,
  timeoutSeconds: 10,
  retries: 3,
  streaming: false,
  promptBase: '',
  promptUser: '',
};

function createClient() {
  const errors = new OpenRouterErrorService();
  const http = new OpenRouterHttpService(errors);
  const parser = new OpenRouterResponseParserService(errors);
  return {
    client: new OpenRouterClientService(http, parser),
    errors,
  };
}

function mockFetchResponse(status: number, body: unknown) {
  global.fetch = jest.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    text: jest.fn().mockResolvedValue(typeof body === 'string' ? body : JSON.stringify(body)),
  } as unknown as Response);
}

describe('OpenRouterClientService', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'warn').mockImplementation();
  });

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it('sends a valid OpenRouter request and returns a content string', async () => {
    const { client } = createClient();
    mockFetchResponse(200, {
      choices: [{ message: { content: 'valid response' } }],
      usage: { prompt_tokens: 3, completion_tokens: 5, total_tokens: 8 },
    });

    await expect(client.generate('prompt text', config, 1)).resolves.toBe('valid response');
    expect(global.fetch).toHaveBeenCalledWith(
      config.endpoint,
      expect.objectContaining({
        method: 'POST',
        headers: {
          Authorization: 'Bearer test-key',
          'Content-Type': 'application/json',
          'HTTP-Referer': 'http://localhost:5173',
          'X-Title': 'QA Platform',
        },
        body: JSON.stringify({
          model: 'openrouter/free',
          messages: [{ role: 'user', content: 'prompt text' }],
          temperature: 0.2,
          max_tokens: 4096,
          stream: false,
        }),
      }),
    );
  });

  it('extracts text from content arrays', async () => {
    const { client } = createClient();
    mockFetchResponse(200, {
      choices: [
        {
          message: {
            content: [
              { type: 'text', text: 'first ' },
              { type: 'text', text: 'second' },
            ],
          },
        },
      ],
    });

    await expect(client.generate('prompt text', config, 1)).resolves.toBe('first second');
  });

  it('throws a clear error for empty OpenRouter responses', async () => {
    const { client } = createClient();
    mockFetchResponse(200, { choices: [{ message: { content: '' } }] });

    await expect(client.generate('prompt text', config, 1)).rejects.toThrow(
      'OpenRouter returned an empty response.',
    );
  });

  it('throws a clear timeout error', async () => {
    const { client } = createClient();
    const abortError = new Error('aborted');
    abortError.name = 'AbortError';
    global.fetch = jest.fn().mockRejectedValue(abortError);

    await expect(client.generate('prompt text', config, 1)).rejects.toThrow('OpenRouter request timeout.');
  });

  it.each([
    [401, 'OpenRouter authentication failed. Verify OPENROUTER_KEY.'],
    [403, 'Access denied by OpenRouter.'],
    [404, 'Configured model does not exist or is unavailable.'],
    [429, 'Rate limit exceeded.'],
    [500, 'OpenRouter service unavailable.'],
  ])('maps status %i to a specific OpenRouter error', async (status, message) => {
    const { client } = createClient();
    mockFetchResponse(status, { error: { message: 'provider details' } });

    await expect(client.generate('prompt text', config, 1)).rejects.toThrow(message);
  });

  it('does not allow retry for authentication errors', () => {
    const { errors } = createClient();
    const retry = new OpenRouterRetryService();
    const authError = errors.fromStatus(401);
    const rateLimitError = errors.fromStatus(429);

    expect(retry.canRetry(authError, 1, 3)).toBe(false);
    expect(retry.canRetry(rateLimitError, 1, 3)).toBe(true);
  });
});
