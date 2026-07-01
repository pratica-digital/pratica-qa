const fs = require('node:fs');
const path = require('node:path');

const nodeEnv = process.env.NODE_ENV;
const envFileCandidates = [
  nodeEnv ? path.join(__dirname, 'backend', `.env.${nodeEnv}.local`) : undefined,
  nodeEnv ? path.join(__dirname, 'backend', `.env.${nodeEnv}`) : undefined,
  path.join(__dirname, 'backend', '.env.local'),
  path.join(__dirname, 'backend', '.env'),
  nodeEnv ? path.join(__dirname, `.env.${nodeEnv}.local`) : undefined,
  nodeEnv ? path.join(__dirname, `.env.${nodeEnv}`) : undefined,
  path.join(__dirname, '.env.local'),
  path.join(__dirname, '.env'),
].filter(Boolean);

function unquoteEnvValue(value) {
  const trimmed = value.trim();
  const quote = trimmed[0];

  if ((quote === '"' || quote === "'") && trimmed.endsWith(quote)) {
    return trimmed.slice(1, -1);
  }

  return trimmed;
}

function readEnvValueFromFile(filePath, key) {
  if (!fs.existsSync(filePath)) {
    return undefined;
  }

  const envFile = fs.readFileSync(filePath, 'utf8');
  const envLine = envFile
    .split(/\r?\n/)
    .map((line) => line.match(new RegExp(`^\\s*${key}\\s*=\\s*(.+?)\\s*$`)))
    .find(Boolean);

  return envLine ? unquoteEnvValue(envLine[1]) : undefined;
}

function getDatabaseUrl() {
  const databaseUrl =
    process.env.DATABASE_URL ??
    envFileCandidates
      .map((envFile) => readEnvValueFromFile(envFile, 'DATABASE_URL'))
      .find(Boolean);

  if (!databaseUrl) {
    throw new Error('DATABASE_URL is required for Prisma');
  }

  return databaseUrl;
}

module.exports = {
  schema: 'backend/prisma/schema.prisma',
  migrations: {
    path: 'backend/prisma/migrations',
  },
  datasource: {
    url: getDatabaseUrl(),
  },
};
