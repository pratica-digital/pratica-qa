# QA Platform

Modern QA Test Management Platform inspired by TestLodge.

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

Backend only:

```bash
cd backend
npm install
npm run prisma:generate
npm run build
npm run start:dev
```

Docker:

```bash
docker compose up --build
```

Health check:

```bash
GET http://localhost:3000/api/health
```
