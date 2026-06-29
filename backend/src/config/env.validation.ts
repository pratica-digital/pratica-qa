type Environment = {
  APP_FRONTEND_URL: string;
  DATABASE_URL: string;
  FIRST_ACCESS_TOKEN_EXPIRES_IN_MINUTES: number;
  JWT_EXPIRES_IN: string;
  JWT_SECRET: string;
  LLM_PROVIDER: 'openrouter';
  LLM_RETRIES: number;
  LLM_STREAMING: boolean;
  MAIL_FROM?: string;
  MAX_TOKENS: number;
  NODE_ENV?: string;
  OPENROUTER_ENDPOINT: string;
  OPENROUTER_HTTP_REFERER: string;
  OPENROUTER_KEY: string;
  OPENROUTER_MODEL: string;
  OPENROUTER_TITLE: string;
  PORT: number;
  PASSWORD_RESET_TOKEN_EXPIRES_IN_MINUTES: number;
  SHORTCUT_API_TOKEN?: string;
  SHORTCUT_PROJECT_ID?: string;
  SHORTCUT_SPACE_ID?: string;
  SHORTCUT_TEAM_ID?: string;
  SHORTCUT_WORKFLOW_STATE_ID?: string;
  SMTP_HELO_NAME?: string;
  SMTP_HOST?: string;
  SMTP_PASSWORD?: string;
  SMTP_PORT?: number;
  SMTP_REQUIRE_TLS?: string;
  SMTP_SECURE?: string;
  SMTP_TIMEOUT_MS?: number;
  SMTP_USER?: string;
  TEMPERATURE: number;
  TIMEOUT: number;
};

export function validateEnv(config: Record<string, unknown>): Environment {
  const databaseUrl = config.DATABASE_URL;
  const jwtSecret = config.JWT_SECRET;
  const jwtExpiresIn = config.JWT_EXPIRES_IN ?? '15m';
  const port = Number(config.PORT ?? 3000);
  const appFrontendUrl = config.APP_FRONTEND_URL ?? 'http://localhost:5173';
  const firstAccessTokenMinutes = Number(config.FIRST_ACCESS_TOKEN_EXPIRES_IN_MINUTES ?? 1440);
  const passwordResetTokenMinutes = Number(config.PASSWORD_RESET_TOKEN_EXPIRES_IN_MINUTES ?? 30);
  const smtpPort = config.SMTP_PORT === undefined ? undefined : Number(config.SMTP_PORT);
  const smtpTimeoutMs = config.SMTP_TIMEOUT_MS === undefined ? undefined : Number(config.SMTP_TIMEOUT_MS);
  const temperature = Number(config.TEMPERATURE ?? 0.2);
  const maxTokens = Number(config.MAX_TOKENS ?? 4096);
  const timeout = Number(config.TIMEOUT ?? 120);
  const llmRetries = Number(config.LLM_RETRIES ?? 3);
  const llmProvider = String(config.LLM_PROVIDER ?? 'openrouter').toLowerCase();
  const openRouterEndpoint = String(
    config.OPENROUTER_ENDPOINT ?? 'https://openrouter.ai/api/v1/chat/completions',
  ).trim();
  const openRouterKey = typeof config.OPENROUTER_KEY === 'string' ? config.OPENROUTER_KEY.trim() : '';
  const openRouterModel = String(config.OPENROUTER_MODEL ?? 'openrouter/free').trim();
  const openRouterHttpReferer = String(config.OPENROUTER_HTTP_REFERER ?? appFrontendUrl).trim();
  const openRouterTitle = String(config.OPENROUTER_TITLE ?? 'QA Platform').trim();

  if (typeof databaseUrl !== 'string' || databaseUrl.length === 0) {
    throw new Error('DATABASE_URL is required');
  }

  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('PORT must be a valid TCP port');
  }

  if (typeof jwtSecret !== 'string' || jwtSecret.length < 32) {
    throw new Error('JWT_SECRET must be at least 32 characters long');
  }

  if (typeof jwtExpiresIn !== 'string' || jwtExpiresIn.length === 0) {
    throw new Error('JWT_EXPIRES_IN must be a non-empty string');
  }

  if (!Number.isInteger(firstAccessTokenMinutes) || firstAccessTokenMinutes < 1) {
    throw new Error('FIRST_ACCESS_TOKEN_EXPIRES_IN_MINUTES must be a positive integer');
  }

  if (!Number.isInteger(passwordResetTokenMinutes) || passwordResetTokenMinutes < 1) {
    throw new Error('PASSWORD_RESET_TOKEN_EXPIRES_IN_MINUTES must be a positive integer');
  }

  if (typeof appFrontendUrl !== 'string' || appFrontendUrl.length === 0) {
    throw new Error('APP_FRONTEND_URL must be a non-empty string');
  }

  if (smtpPort !== undefined && (!Number.isInteger(smtpPort) || smtpPort < 1 || smtpPort > 65535)) {
    throw new Error('SMTP_PORT must be a valid TCP port');
  }

  if (smtpTimeoutMs !== undefined && (!Number.isInteger(smtpTimeoutMs) || smtpTimeoutMs < 1000)) {
    throw new Error('SMTP_TIMEOUT_MS must be at least 1000');
  }

  if (llmProvider !== 'openrouter') {
    throw new Error('LLM_PROVIDER must be openrouter');
  }

  if (!Number.isFinite(temperature) || temperature < 0 || temperature > 2) {
    throw new Error('TEMPERATURE must be a number between 0 and 2');
  }

  if (!Number.isInteger(maxTokens) || maxTokens < 1) {
    throw new Error('MAX_TOKENS must be a positive integer');
  }

  if (!Number.isInteger(timeout) || timeout < 1) {
    throw new Error('TIMEOUT must be a positive integer in seconds');
  }

  if (!Number.isInteger(llmRetries) || llmRetries < 1 || llmRetries > 10) {
    throw new Error('LLM_RETRIES must be an integer between 1 and 10');
  }

  if (!openRouterEndpoint) {
    throw new Error('OPENROUTER_ENDPOINT must be a non-empty string');
  }

  if (!openRouterModel) {
    throw new Error('OPENROUTER_MODEL must be a non-empty string');
  }

  if (!openRouterKey) {
    throw new Error('OpenRouter API Key not configured.');
  }

  if (!openRouterHttpReferer) {
    throw new Error('OPENROUTER_HTTP_REFERER must be a non-empty string');
  }

  if (!openRouterTitle) {
    throw new Error('OPENROUTER_TITLE must be a non-empty string');
  }

  return {
    APP_FRONTEND_URL: appFrontendUrl,
    DATABASE_URL: databaseUrl,
    FIRST_ACCESS_TOKEN_EXPIRES_IN_MINUTES: firstAccessTokenMinutes,
    JWT_EXPIRES_IN: jwtExpiresIn,
    JWT_SECRET: jwtSecret,
    LLM_PROVIDER: 'openrouter',
    LLM_RETRIES: llmRetries,
    LLM_STREAMING: false,
    MAIL_FROM: typeof config.MAIL_FROM === 'string' ? config.MAIL_FROM : undefined,
    MAX_TOKENS: maxTokens,
    NODE_ENV: typeof config.NODE_ENV === 'string' ? config.NODE_ENV : undefined,
    OPENROUTER_ENDPOINT: openRouterEndpoint,
    OPENROUTER_HTTP_REFERER: openRouterHttpReferer,
    OPENROUTER_KEY: openRouterKey,
    OPENROUTER_MODEL: openRouterModel,
    OPENROUTER_TITLE: openRouterTitle,
    PORT: port,
    PASSWORD_RESET_TOKEN_EXPIRES_IN_MINUTES: passwordResetTokenMinutes,
    SHORTCUT_API_TOKEN: typeof config.SHORTCUT_API_TOKEN === 'string' ? config.SHORTCUT_API_TOKEN : undefined,
    SHORTCUT_PROJECT_ID: typeof config.SHORTCUT_PROJECT_ID === 'string' ? config.SHORTCUT_PROJECT_ID : undefined,
    SHORTCUT_SPACE_ID: typeof config.SHORTCUT_SPACE_ID === 'string' ? config.SHORTCUT_SPACE_ID : undefined,
    SHORTCUT_TEAM_ID: typeof config.SHORTCUT_TEAM_ID === 'string' ? config.SHORTCUT_TEAM_ID : undefined,
    SHORTCUT_WORKFLOW_STATE_ID:
      typeof config.SHORTCUT_WORKFLOW_STATE_ID === 'string' ? config.SHORTCUT_WORKFLOW_STATE_ID : undefined,
    SMTP_HELO_NAME: typeof config.SMTP_HELO_NAME === 'string' ? config.SMTP_HELO_NAME : undefined,
    SMTP_HOST: typeof config.SMTP_HOST === 'string' ? config.SMTP_HOST : undefined,
    SMTP_PASSWORD: typeof config.SMTP_PASSWORD === 'string' ? config.SMTP_PASSWORD : undefined,
    SMTP_PORT: smtpPort,
    SMTP_REQUIRE_TLS: typeof config.SMTP_REQUIRE_TLS === 'string' ? config.SMTP_REQUIRE_TLS : undefined,
    SMTP_SECURE: typeof config.SMTP_SECURE === 'string' ? config.SMTP_SECURE : undefined,
    SMTP_TIMEOUT_MS: smtpTimeoutMs,
    SMTP_USER: typeof config.SMTP_USER === 'string' ? config.SMTP_USER : undefined,
    TEMPERATURE: temperature,
    TIMEOUT: timeout,
  };
}
