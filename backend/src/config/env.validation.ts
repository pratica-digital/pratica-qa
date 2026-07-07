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
  CLIENT_ID?: string;
  CLIENT_SECRET?: string;
  MAIL_GRAPH_CLIENT_ID?: string;
  MAIL_GRAPH_CLIENT_SECRET?: string;
  MAIL_GRAPH_ENDPOINT?: string;
  MAIL_GRAPH_SAVE_TO_SENT_ITEMS?: string;
  MAIL_GRAPH_SCOPE?: string;
  MAIL_GRAPH_TENANT_ID?: string;
  MAIL_GRAPH_TOKEN_ENDPOINT?: string;
  MAIL_GRAPH_USER?: string;
  MAIL_SENDER_ADDRESS?: string;
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
  TENANT_ID?: string;
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

function getFrontendUrl(config: Record<string, unknown>) {
  const value = getString(config, 'APP_FRONTEND_URL') ?? getString(config, 'FRONTEND_URL');

  if (!value) {
    throw new Error('APP_FRONTEND_URL is required');
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
    CLIENT_ID: getOptionalString(config, 'CLIENT_ID'),
    CLIENT_SECRET: getOptionalString(config, 'CLIENT_SECRET'),
    MAIL_GRAPH_CLIENT_ID: getOptionalString(config, 'MAIL_GRAPH_CLIENT_ID'),
    MAIL_GRAPH_CLIENT_SECRET: getOptionalString(config, 'MAIL_GRAPH_CLIENT_SECRET'),
    MAIL_GRAPH_ENDPOINT: getOptionalString(config, 'MAIL_GRAPH_ENDPOINT'),
    MAIL_GRAPH_SAVE_TO_SENT_ITEMS: getOptionalString(config, 'MAIL_GRAPH_SAVE_TO_SENT_ITEMS'),
    MAIL_GRAPH_SCOPE: getOptionalString(config, 'MAIL_GRAPH_SCOPE'),
    MAIL_GRAPH_TENANT_ID: getOptionalString(config, 'MAIL_GRAPH_TENANT_ID'),
    MAIL_GRAPH_TOKEN_ENDPOINT: getOptionalString(config, 'MAIL_GRAPH_TOKEN_ENDPOINT'),
    MAIL_GRAPH_USER: getOptionalString(config, 'MAIL_GRAPH_USER'),
    MAIL_SENDER_ADDRESS: getOptionalString(config, 'MAIL_SENDER_ADDRESS'),
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
    TENANT_ID: getOptionalString(config, 'TENANT_ID'),
    TEMPERATURE: temperature,
    TIMEOUT: timeout,
  };
}
