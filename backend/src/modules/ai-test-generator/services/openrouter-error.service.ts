import { HttpException, HttpStatus, Injectable } from '@nestjs/common';

type OpenRouterExceptionOptions = {
  providerStatus?: number;
  reason: string;
  retryable: boolean;
};

export class OpenRouterException extends HttpException {
  readonly providerStatus?: number;
  readonly reason: string;
  readonly retryable: boolean;

  constructor(message: string, status: HttpStatus, options: OpenRouterExceptionOptions) {
    super(message, status);
    this.name = OpenRouterException.name;
    this.providerStatus = options.providerStatus;
    this.reason = options.reason;
    this.retryable = options.retryable;
  }
}

export function isOpenRouterException(error: unknown): error is OpenRouterException {
  return error instanceof OpenRouterException;
}

@Injectable()
export class OpenRouterErrorService {
  configuration(message: string) {
    return new OpenRouterException(message, HttpStatus.INTERNAL_SERVER_ERROR, {
      reason: 'configuration',
      retryable: false,
    });
  }

  emptyResponse() {
    return new OpenRouterException('OpenRouter returned an empty response.', HttpStatus.BAD_GATEWAY, {
      reason: 'empty_response',
      retryable: true,
    });
  }

  network() {
    return new OpenRouterException('OpenRouter service unavailable.', HttpStatus.BAD_GATEWAY, {
      reason: 'network',
      retryable: true,
    });
  }

  timeout() {
    return new OpenRouterException('OpenRouter request timeout.', HttpStatus.REQUEST_TIMEOUT, {
      reason: 'timeout',
      retryable: true,
    });
  }

  fromStatus(status: number) {
    if (status === 401) {
      return new OpenRouterException(
        'OpenRouter authentication failed. Verify OPENROUTER_API_KEY.',
        HttpStatus.UNAUTHORIZED,
        {
          providerStatus: status,
          reason: 'authentication_failed',
          retryable: false,
        },
      );
    }

    if (status === 403) {
      return new OpenRouterException('Access denied by OpenRouter.', HttpStatus.FORBIDDEN, {
        providerStatus: status,
        reason: 'access_denied',
        retryable: false,
      });
    }

    if (status === 404) {
      return new OpenRouterException(
        'Configured model does not exist or is unavailable.',
        HttpStatus.BAD_GATEWAY,
        {
          providerStatus: status,
          reason: 'model_unavailable',
          retryable: false,
        },
      );
    }

    if (status === 429) {
      return new OpenRouterException('Rate limit exceeded.', HttpStatus.TOO_MANY_REQUESTS, {
        providerStatus: status,
        reason: 'rate_limited',
        retryable: true,
      });
    }

    if (status >= 500) {
      return new OpenRouterException('OpenRouter service unavailable.', HttpStatus.BAD_GATEWAY, {
        providerStatus: status,
        reason: 'service_unavailable',
        retryable: true,
      });
    }

    return new OpenRouterException('OpenRouter request failed.', HttpStatus.BAD_GATEWAY, {
      providerStatus: status,
      reason: 'request_failed',
      retryable: false,
    });
  }
}
