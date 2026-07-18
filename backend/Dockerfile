FROM node:24-alpine AS dependencies

WORKDIR /app

COPY package*.json ./
RUN npm ci

FROM dependencies AS build

WORKDIR /app

COPY nest-cli.json tsconfig*.json prisma.config.ts ./
COPY prisma ./prisma
COPY src ./src

# Prisma only validates the URL format while generating the client. The real
# DATABASE_URL is injected by Docker Compose when the container starts.
RUN DATABASE_URL=postgresql://build:build@localhost:5432/build npm run build

FROM node:24-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ARG APP_PORT=3000

COPY package*.json ./
RUN npm ci --omit=dev

COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules/.prisma ./node_modules/.prisma
COPY prisma ./prisma
COPY prisma.config.ts ./

EXPOSE ${APP_PORT}

CMD ["node", "dist/main.js"]
