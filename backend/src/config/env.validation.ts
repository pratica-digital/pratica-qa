type Environment = {
  DATABASE_URL: string;
  JWT_EXPIRES_IN: string;
  JWT_SECRET: string;
  PORT: number;
};

export function validateEnv(config: Record<string, unknown>): Environment {
  const databaseUrl = config.DATABASE_URL;
  const jwtSecret = config.JWT_SECRET;
  const jwtExpiresIn = config.JWT_EXPIRES_IN ?? '15m';
  const port = Number(config.PORT ?? 3000);

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

  return {
    DATABASE_URL: databaseUrl,
    JWT_EXPIRES_IN: jwtExpiresIn,
    JWT_SECRET: jwtSecret,
    PORT: port,
  };
}
