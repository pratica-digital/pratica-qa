# QA Test Management Platform Design

## Product direction

The platform is a modern manual QA management system inspired by TestLodge, with a simpler flow and faster daily usage. The core loop is: organize projects, write reusable test cases, execute test runs, record results, re-run failures, and report release confidence.

## Data model

### Project

- `id`: UUID
- `name`: project name
- `key`: unique short key, used in navigation and future identifiers
- `description`: project context
- `status`: `ACTIVE` or `ARCHIVED`
- `createdAt`, `updatedAt`
- Relations: has many `TestSuite`, `TestRun`, and `Requirement`

### TestSuite

- `id`: UUID
- `projectId`: FK to `Project`
- `name`: suite name
- `description`: suite scope
- `status`: `ACTIVE` or `ARCHIVED`
- `position`: manual ordering
- `createdAt`, `updatedAt`
- Relations: belongs to `Project`; has many `TestCase` and `TestRun`

### TestCase

- `id`: UUID
- `suiteId`: FK to `TestSuite`
- `clonedFromId`: optional FK to another `TestCase`
- `title`, `description`, `preconditions`, `expectedResult`
- `status`: `ACTIVE` or `ARCHIVED`
- `priority`: `LOW`, `MEDIUM`, or `HIGH`
- `severity`: `LOW`, `MEDIUM`, `HIGH`, or `CRITICAL`
- `version`: increments when important case content/status changes
- `tags`: searchable labels
- `createdAt`, `updatedAt`
- Relations: belongs to `TestSuite`; has many `TestStep` and `TestResult`; can link to many `Requirement`

### TestStep

- `id`: UUID
- `testCaseId`: FK to `TestCase`
- `position`: step order
- `action`: instruction to perform
- `expectedResult`: expected step outcome
- `createdAt`, `updatedAt`
- Relations: belongs to `TestCase`

### TestRun

- `id`: UUID
- `projectId`: FK to `Project`
- `suiteId`: optional FK to `TestSuite`
- `createdById`: optional FK to `User`
- `name`, `description`
- `status`: `PENDING`, `IN_PROGRESS`, or `COMPLETED`
- `startedAt`, `completedAt`
- `createdAt`, `updatedAt`
- Relations: belongs to `Project`; optionally belongs to `TestSuite`; has many `TestResult`

### TestResult

- `id`: UUID
- `testRunId`: FK to `TestRun`
- `testCaseId`: FK to `TestCase`
- `executedById`: optional FK to `User`
- `status`: `PENDING`, `PASSED`, `FAILED`, or `SKIPPED`
- `comment`, `attachments`
- `executedAt`
- `createdAt`, `updatedAt`
- Relations: belongs to `TestRun`, `TestCase`, and optionally `User`

### User

- `id`: UUID
- `name`, `email`
- `password`: bcrypt hash, never returned by the API
- `role`: `ADMIN`, `QA`, or `VIEWER`
- `status`: `ACTIVE` or `INACTIVE`
- `createdAt`, `updatedAt`
- Relations: creates, is assigned to, and executes `TestRun`/`TestResult` records

### Requirement

- `id`: UUID
- `projectId`: FK to `Project`
- `referenceKey`, `title`, `description`, `status`
- `createdAt`, `updatedAt`
- Relations: belongs to `Project`; can link to many `TestCase`

## Main flows

1. Project creation: user creates a project with `name` and `key`; the dashboard shows project health and test coverage.
2. Suite creation: user creates suites inside a project, ordered by feature, release area, or product module.
3. Test case creation: user writes title, preconditions, expected result, tags, priority, severity, and ordered steps.
4. Test run execution: user creates a run from a project or suite; the system snapshots eligible cases into executable results.
5. Result registration: runner records `PASSED`, `FAILED`, or `SKIPPED`, plus comments and attachments.
6. Failed test re-run: user filters failed results, creates a focused re-run, and tracks whether failures were fixed.
7. Report generation: reports summarize pass rate, failure clusters, blocked areas, execution history, and release readiness.

## UX/UI screens

### Dashboard

Fast overview with active projects, latest test runs, pass/fail trend, blocked tests, and high-severity failures.

### Project list

Searchable table/list with project key, status, suite count, active runs, last update, and quick actions.

### Suite screen

Left navigation for suites and tags; main area lists test cases with status, priority, severity, version, and bulk actions.

### Test case screen

Compact editor for title, metadata, preconditions, expected result, and steps. Changes should feel document-like, closer to Notion than a heavy admin form.

### Runner mode

Keyboard-friendly execution view with one case at a time, visible steps, result buttons, notes, defect reference, and next/previous navigation.

### Reports

Filters by project, suite, run, tag, priority, severity, and date. Reports should highlight execution progress, pass rate, failed cases, flaky areas, and blocked work.

## Essential capabilities

- Search and filters across projects, suites, cases, tags, priority, severity, and status.
- Tags for flexible grouping beyond suite hierarchy.
- Priority and severity for risk-based planning.
- Execution history from `TestResult`.
- Version field on `TestCase`, with room for a future immutable version history table.
- Clone endpoint for reusable cases.
- Bulk status endpoint for initial bulk action support.
