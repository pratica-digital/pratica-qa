import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { config as loadEnv } from 'dotenv';
import { defineConfig } from 'prisma/config';

const nodeEnv = process.env.NODE_ENV;
const envFileCandidates = [
  nodeEnv ? `.env.${nodeEnv}.local` : undefined,
  nodeEnv ? `.env.${nodeEnv}` : undefined,
  '.env.local',
  '.env',
].filter((path): path is string => Boolean(path));

for (const envFile of envFileCandidates) {
  const envPath = join(process.cwd(), envFile);

  if (existsSync(envPath)) {
    loadEnv({ path: envPath, override: false });
  }
}

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is required for Prisma');
}

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    url: process.env.DATABASE_URL,
  },
});
