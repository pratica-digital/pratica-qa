# QA Platform

Modern QA Test Management Platform.

## Features

* Projects
* Test Suites
* Test Cases
* Test Runs
* Reports
* Integrations

## Stack

* React
* NestJS
* PostgreSQL
* Prisma
* Docker

## Setup

Create environment files from the templates before running the apps:

```bash
cp .env.example .env
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

Backend only:

```bash
cd backend
npm install
npm run prisma:generate
npm run build
npm run start:dev
```

Frontend only:

```bash
cd frontend
npm install
npm run dev
```

Docker:

```bash
docker compose up --build
```

Production migrations:

```bash
cd backend
npm run prisma:migrate:deploy
```

Health check:

```bash
GET ${BACKEND_URL}/api/health
```
