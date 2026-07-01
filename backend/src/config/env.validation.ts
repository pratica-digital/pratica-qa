type Environment = {
  APP_FRONTEND_URL: string;
  DATABASE_URL: string;
  FIRST_ACCESS_TOKEN_EXPIRES_IN_MINUTES: number;
  FRONTEND_URL: string;
  JWT_EXPIRES_IN: string;
  JWT_SECRET: string;
  LLM_PROVIDER: 'openrouter';
  LLM_RETRIES: number;
  LLM_STREAMING: boolean;
  MAIL_FROM?: string;
  MAX_TOKENS: number;
  NODE_ENV?: string;
  OPENROUTER_API_KEY: string;
  OPENROUTER_ENDPOINT: string;
  OPENROUTER_HTTP_REFERER: string;
  OPENROUTER_KEY: string;
  OPENROUTER_MODEL: string;
  OPENROUTER_TITLE: string;
  PORT: number;
  PASSWORD_RESET_TOKEN_EXPIRES_IN_MINUTES: number;
  SHORTCUT_API_URL?: string;
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

function getString(config: Record<string, unknown>, key: string) {
  const value = config[key];
  return typeof value === 'string' ? value.trim() : undefined;
}

function getRequiredString(config: Record<string, unknown>, key: string) {
  const value = getString(config, key);

  if (!value) {
    throw new Error(`${key} is required`);
  }

  return value;
}

function getRequiredNumber(config: Record<string, unknown>, key: string) {
  const value = Number(config[key]);

  if (!Number.isFinite(value)) {
    throw new Error(`${key} must be a number`);
  }

  return value;
}

function getNumber(config: Record<string, unknown>, key: string, fallback: number) {
  if (config[key] === undefined || config[key] === null || config[key] === '') {
    return fallback;
  }

  const value = Number(config[key]);

  if (!Number.isFinite(value)) {
    throw new Error(`${key} must be a number`);
  }

  return value;
}

function getOptionalString(config: Record<string, unknown>, key: string) {
  const value = getString(config, key);
  return value || undefined;
}

function getOptionalNumber(config: Record<string, unknown>, key: string) {
  if (config[key] === undefined || config[key] === null || config[key] === '') {
    return undefined;
  }

  return Number(config[key]);
}

function getFrontendUrl(config: Record<string, unknown>) {
  const value = getString(config, 'FRONTEND_URL') ?? getString(config, 'APP_FRONTEND_URL');

  if (!value) {
    throw new Error('FRONTEND_URL is required');
  }

  return value;
}

export function validateEnv(config: Record<string, unknown>): Environment {
  const databaseUrl = getRequiredString(config, 'DATABASE_URL');
  const jwtSecret = getRequiredString(config, 'JWT_SECRET');
  const jwtExpiresIn = getRequiredString(config, 'JWT_EXPIRES_IN');
  const port = getRequiredNumber(config, 'PORT');
  const frontendUrl = getFrontendUrl(config);
  const firstAccessTokenMinutes = getNumber(config, 'FIRST_ACCESS_TOKEN_EXPIRES_IN_MINUTES', 1440);
  const passwordResetTokenMinutes = getNumber(config, 'PASSWORD_RESET_TOKEN_EXPIRES_IN_MINUTES', 30);
  const mailFrom = getOptionalString(config, 'MAIL_FROM');
  const smtpHost = getOptionalString(config, 'SMTP_HOST');
  const smtpHeloName = getOptionalString(config, 'SMTP_HELO_NAME') ?? 'qa-platform.local';
  const smtpPort = getOptionalNumber(config, 'SMTP_PORT');
  const smtpPassword = getOptionalString(config, 'SMTP_PASSWORD');
  const smtpRequireTls = getOptionalString(config, 'SMTP_REQUIRE_TLS');
  const smtpSecure = getOptionalString(config, 'SMTP_SECURE');
  const smtpTimeoutMs = getOptionalNumber(config, 'SMTP_TIMEOUT_MS') ?? 10000;
  const smtpUser = getOptionalString(config, 'SMTP_USER');
  const temperature = getNumber(config, 'TEMPERATURE', 0.2);
  const maxTokens = getNumber(config, 'MAX_TOKENS', 4096);
  const timeout = getNumber(config, 'TIMEOUT', 120);
  const llmRetries = getNumber(config, 'LLM_RETRIES', 3);
  const llmProvider = (getOptionalString(config, 'LLM_PROVIDER') ?? 'openrouter').toLowerCase();
  const openRouterEndpoint =
    getOptionalString(config, 'OPENROUTER_ENDPOINT') ?? 'https://openrouter.ai/api/v1/chat/completions';
  const openRouterApiKey = getString(config, 'OPENROUTER_API_KEY') ?? getString(config, 'OPENROUTER_KEY') ?? '';
  const openRouterModel = getOptionalString(config, 'OPENROUTER_MODEL') ?? 'openrouter/openrouter/free';
  const openRouterHttpReferer = getString(config, 'OPENROUTER_HTTP_REFERER') ?? frontendUrl;
  const openRouterTitle = getOptionalString(config, 'OPENROUTER_TITLE') ?? 'QA Platform';
  const shortcutApiToken = getOptionalString(config, 'SHORTCUT_API_TOKEN');
  const shortcutApiUrl = getOptionalString(config, 'SHORTCUT_API_URL') ?? 'https://api.app.shortcut.com/api/v3';

  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('PORT must be a valid TCP port');
  }

  if (jwtSecret.length < 32) {
    throw new Error('JWT_SECRET must be at least 32 characters long');
  }

  if (!Number.isInteger(firstAccessTokenMinutes) || firstAccessTokenMinutes < 1) {
    throw new Error('FIRST_ACCESS_TOKEN_EXPIRES_IN_MINUTES must be a positive integer');
  }

  if (!Number.isInteger(passwordResetTokenMinutes) || passwordResetTokenMinutes < 1) {
    throw new Error('PASSWORD_RESET_TOKEN_EXPIRES_IN_MINUTES must be a positive integer');
  }

  if (smtpPort !== undefined && (!Number.isInteger(smtpPort) || smtpPort < 1 || smtpPort > 65535)) {
    throw new Error('SMTP_PORT must be a valid TCP port');
  }

  if (smtpTimeoutMs !== undefined && (!Number.isInteger(smtpTimeoutMs) || smtpTimeoutMs < 1000)) {
    throw new Error('SMTP_TIMEOUT_MS must be at least 1000');
  }

  if (smtpHost) {
    if (!mailFrom) {
      throw new Error('MAIL_FROM is required when SMTP_HOST is configured');
    }

    if (smtpPort === undefined) {
      throw new Error('SMTP_PORT is required when SMTP_HOST is configured');
    }

    if (!smtpSecure) {
      throw new Error('SMTP_SECURE is required when SMTP_HOST is configured');
    }

    if (!smtpRequireTls) {
      throw new Error('SMTP_REQUIRE_TLS is required when SMTP_HOST is configured');
    }

  }

  if ((smtpUser && !smtpPassword) || (!smtpUser && smtpPassword)) {
    throw new Error('SMTP_USER and SMTP_PASSWORD must be configured together');
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

  return {
    APP_FRONTEND_URL: frontendUrl,
    DATABASE_URL: databaseUrl,
    FIRST_ACCESS_TOKEN_EXPIRES_IN_MINUTES: firstAccessTokenMinutes,
    FRONTEND_URL: frontendUrl,
    JWT_EXPIRES_IN: jwtExpiresIn,
    JWT_SECRET: jwtSecret,
    LLM_PROVIDER: 'openrouter',
    LLM_RETRIES: llmRetries,
    LLM_STREAMING: false,
    MAIL_FROM: mailFrom,
    MAX_TOKENS: maxTokens,
    NODE_ENV: getOptionalString(config, 'NODE_ENV'),
    OPENROUTER_API_KEY: openRouterApiKey,
    OPENROUTER_ENDPOINT: openRouterEndpoint,
    OPENROUTER_HTTP_REFERER: openRouterHttpReferer,
    OPENROUTER_KEY: openRouterApiKey,
    OPENROUTER_MODEL: openRouterModel,
    OPENROUTER_TITLE: openRouterTitle,
    PORT: port,
    PASSWORD_RESET_TOKEN_EXPIRES_IN_MINUTES: passwordResetTokenMinutes,
    SHORTCUT_API_TOKEN: shortcutApiToken,
    SHORTCUT_API_URL: shortcutApiUrl,
    SHORTCUT_PROJECT_ID: getOptionalString(config, 'SHORTCUT_PROJECT_ID'),
    SHORTCUT_SPACE_ID: getOptionalString(config, 'SHORTCUT_SPACE_ID'),
    SHORTCUT_TEAM_ID: getOptionalString(config, 'SHORTCUT_TEAM_ID'),
    SHORTCUT_WORKFLOW_STATE_ID: getOptionalString(config, 'SHORTCUT_WORKFLOW_STATE_ID'),
    SMTP_HELO_NAME: smtpHeloName,
    SMTP_HOST: smtpHost,
    SMTP_PASSWORD: smtpPassword,
    SMTP_PORT: smtpPort,
    SMTP_REQUIRE_TLS: smtpRequireTls,
    SMTP_SECURE: smtpSecure,
    SMTP_TIMEOUT_MS: smtpTimeoutMs,
    SMTP_USER: smtpUser,
    TEMPERATURE: temperature,
    TIMEOUT: timeout,
  };
}
