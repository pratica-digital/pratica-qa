type Environment = {
  APP_FRONTEND_URL: string;
  DATABASE_URL: string;
  FIRST_ACCESS_TOKEN_EXPIRES_IN_MINUTES: number;
  JWT_EXPIRES_IN: string;
  JWT_SECRET: string;
  MAIL_FROM?: string;
  NODE_ENV?: string;
  PORT: number;
  PASSWORD_RESET_TOKEN_EXPIRES_IN_MINUTES: number;
  SMTP_HELO_NAME?: string;
  SMTP_HOST?: string;
  SMTP_PASSWORD?: string;
  SMTP_PORT?: number;
  SMTP_REQUIRE_TLS?: string;
  SMTP_SECURE?: string;
  SMTP_TIMEOUT_MS?: number;
  SMTP_USER?: string;
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

  return {
    APP_FRONTEND_URL: appFrontendUrl,
    DATABASE_URL: databaseUrl,
    FIRST_ACCESS_TOKEN_EXPIRES_IN_MINUTES: firstAccessTokenMinutes,
    JWT_EXPIRES_IN: jwtExpiresIn,
    JWT_SECRET: jwtSecret,
    MAIL_FROM: typeof config.MAIL_FROM === 'string' ? config.MAIL_FROM : undefined,
    NODE_ENV: typeof config.NODE_ENV === 'string' ? config.NODE_ENV : undefined,
    PORT: port,
    PASSWORD_RESET_TOKEN_EXPIRES_IN_MINUTES: passwordResetTokenMinutes,
    SMTP_HELO_NAME: typeof config.SMTP_HELO_NAME === 'string' ? config.SMTP_HELO_NAME : undefined,
    SMTP_HOST: typeof config.SMTP_HOST === 'string' ? config.SMTP_HOST : undefined,
    SMTP_PASSWORD: typeof config.SMTP_PASSWORD === 'string' ? config.SMTP_PASSWORD : undefined,
    SMTP_PORT: smtpPort,
    SMTP_REQUIRE_TLS: typeof config.SMTP_REQUIRE_TLS === 'string' ? config.SMTP_REQUIRE_TLS : undefined,
    SMTP_SECURE: typeof config.SMTP_SECURE === 'string' ? config.SMTP_SECURE : undefined,
    SMTP_TIMEOUT_MS: smtpTimeoutMs,
    SMTP_USER: typeof config.SMTP_USER === 'string' ? config.SMTP_USER : undefined,
  };
}
