type Environment = {
  DATABASE_URL: string;
  PORT: number;
};

export function validateEnv(config: Record<string, unknown>): Environment {
  const databaseUrl = config.DATABASE_URL;
  const port = Number(config.PORT ?? 3000);

  if (typeof databaseUrl !== 'string' || databaseUrl.length === 0) {
    throw new Error('DATABASE_URL is required');
  }

  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('PORT must be a valid TCP port');
  }

  return {
    DATABASE_URL: databaseUrl,
    PORT: port,
  };
}
