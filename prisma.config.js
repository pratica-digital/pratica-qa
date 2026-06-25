const fs = require('node:fs');
const path = require('node:path');

const backendEnvPath = path.join(__dirname, 'backend', '.env');
const fallbackDatabaseUrl = 'postgresql://qa_user:qa_pass@localhost:5432/qa_platform';

function unquoteEnvValue(value) {
  const trimmed = value.trim();
  const quote = trimmed[0];

  if ((quote === '"' || quote === "'") && trimmed.endsWith(quote)) {
    return trimmed.slice(1, -1);
  }

  return trimmed;
}

function readDatabaseUrlFromBackendEnv() {
  if (!fs.existsSync(backendEnvPath)) {
    return undefined;
  }

  const envFile = fs.readFileSync(backendEnvPath, 'utf8');
  const databaseUrlLine = envFile
    .split(/\r?\n/)
    .map((line) => line.match(/^\s*DATABASE_URL\s*=\s*(.+?)\s*$/))
    .find(Boolean);

  return databaseUrlLine ? unquoteEnvValue(databaseUrlLine[1]) : undefined;
}

module.exports = {
  schema: 'backend/prisma/schema.prisma',
  migrations: {
    path: 'backend/prisma/migrations',
  },
  datasource: {
    url: process.env.DATABASE_URL ?? readDatabaseUrlFromBackendEnv() ?? fallbackDatabaseUrl,
  },
};
