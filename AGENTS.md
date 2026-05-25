
# AGENTS.md

## Project Overview

This project is a modern QA Test Management Platform inspired by TestLodge.

Main goals:

* Manage manual test cases
* Execute test runs
* Generate reports
* Track QA workflows

---

## Tech Stack

Frontend:

* React
* Vite
* TypeScript
* TailwindCSS

Backend:

* Node.js
* NestJS
* PostgreSQL
* Prisma ORM

Infrastructure:

* Docker
* Docker Compose

---

## Architecture Rules

* Use clean architecture
* Separate business logic from controllers
* Use DTOs
* Use repository pattern
* Avoid duplicated code
* Keep files small and modular

---

## Frontend Rules

* Use functional React components
* Use hooks
* Use responsive layouts
* Prefer composition over prop drilling
* Use modern UI patterns similar to Linear, Notion, Jira

---

## Backend Rules

* Use REST API
* Use validation pipes
* Use Prisma for database access
* Create modules by domain

Domains:

* projects
* suites
* test-cases
* test-runs
* reports
* users

---

## Database Rules

Always:

* use UUIDs
* add createdAt and updatedAt
* use proper foreign keys
* avoid nullable fields unless necessary

---

## Testing

Backend:
run: npm run test

Frontend:
run: npm run test

Lint:
run: npm run lint

---

## UI Goals

The platform must feel:

* fast
* keyboard-friendly
* minimalistic
* professional

---

## Important

Before implementing:

1. Analyze existing structure
2. Explain plan
3. Then implement incrementally

Never rewrite large sections unnecessarily.
