# Core QA Domain API Examples

## Entity Relationships

- `User` has a role: `ADMIN`, `QA`, or `VIEWER`.
- `User` has many assigned `TestRun` records.
- `User` has many executed `TestResult` records.
- `TestSuite` has many `TestCase`.
- `TestCase` belongs to one `TestSuite`.
- `TestCase` has ordered `TestStep` records.
- `TestPlan` belongs to one `Project`.
- `TestRun` belongs to one `Project` and one `TestPlan`.
- `TestRun` contains multiple `TestSuite` records through `TestRunSuite`.
- `TestRun` has many `TestResult` records.
- `TestResult` belongs to one `TestRun` and one `TestCase`.
- `TestResult` optionally belongs to one executing `User` until it is executed.

## Login

`POST /api/auth/login`

```json
{
  "email": "qa.lead@example.com",
  "password": "correct-horse-battery"
}
```

Response:

```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "tokenType": "Bearer",
  "user": {
    "id": "bff9c875-5965-42fa-aea2-23b0927cc85a",
    "name": "QA Lead",
    "email": "qa.lead@example.com",
    "role": "ADMIN",
    "status": "ACTIVE"
  }
}
```

## Create User

Admin only.

`POST /api/users`

```json
{
  "name": "Ana QA",
  "email": "ana.qa@example.com",
  "password": "strong-password-123",
  "role": "QA",
  "status": "ACTIVE"
}
```

## Create Test Suite

`POST /api/test-suites`

```json
{
  "projectId": "2fe32a34-6874-4511-b204-7b7bb5a6f8ab",
  "name": "Checkout",
  "description": "Payment, cart, and order confirmation scenarios",
  "position": 1
}
```

## Create Test Case With Ordered Steps

`POST /api/test-cases`

```json
{
  "suiteId": "1bf9f67e-88be-45d5-9c7d-cd7de3ab1aa0",
  "title": "Checkout keeps cart after payment failure",
  "description": "Validates recovery behavior when a payment provider rejects a charge.",
  "expectedResult": "The cart remains available and the user can retry payment.",
  "priority": "HIGH",
  "status": "ACTIVE",
  "tags": ["checkout", "payments", "regression"],
  "steps": [
    {
      "order": 1,
      "description": "Add an item to the cart",
      "expectedResult": "The cart shows one item"
    },
    {
      "order": 2,
      "description": "Submit payment with a failing test card",
      "expectedResult": "The payment is rejected with a clear error"
    }
  ]
}
```

## Create Test Plan

`POST /api/test-plans`

```json
{
  "projectId": "2fe32a34-6874-4511-b204-7b7bb5a6f8ab",
  "name": "Release 1.8 Regression Strategy",
  "version": "1.8.0",
  "description": "Risk-based QA plan for the 1.8.0 release.",
  "sections": [
    {
      "type": "scope",
      "title": "In scope",
      "content": "Checkout, authentication, reporting, and public API smoke coverage.",
      "priority": "HIGH"
    },
    {
      "type": "risk",
      "title": "Payment provider changes",
      "content": "Prioritize failed payment recovery and retry flows.",
      "priority": "HIGH"
    }
  ]
}
```

## Create Test Run

Creating a test run links it to a test plan and one or more suites. The backend creates a pending `TestResult` for each active test case in the selected suites.

`POST /api/test-runs`

```json
{
  "projectId": "2fe32a34-6874-4511-b204-7b7bb5a6f8ab",
  "testPlanId": "5ecda431-298b-4fe5-8c59-78a55d0ff53d",
  "assignedToId": "bff9c875-5965-42fa-aea2-23b0927cc85a",
  "name": "Release 1.8 regression run",
  "description": "Full regression pass before release candidate approval.",
  "suiteIds": [
    "1bf9f67e-88be-45d5-9c7d-cd7de3ab1aa0",
    "a08e865c-d291-46f8-a869-8f81c737ca2b"
  ]
}
```

## Assign Test Run

Admin only.

`POST /api/test-runs/{id}/assign`

```json
{
  "assignedToId": "bff9c875-5965-42fa-aea2-23b0927cc85a"
}
```

## Start And Complete A Test Run

`POST /api/test-runs/{id}/start`

`POST /api/test-runs/{id}/complete`

Only the assigned user or an admin can start, complete, execute, or re-run a test run.

## Execute A Test Result Through A Test Run

`POST /api/test-runs/{id}/execute`

```json
{
  "testCaseId": "e5554459-d2cf-4325-ad37-877fc9f8a8c3",
  "status": "FAILED",
  "comment": "Payment error is shown, but cart is emptied after redirect.",
  "attachments": [
    "https://storage.example.com/test-runs/run-123/payment-error.png",
    "https://storage.example.com/test-runs/run-123/browser-console.log"
  ]
}
```

The authenticated user is stored as `executedBy`, and `executedAt` is set automatically.

## Mark A Test Result Directly

`PATCH /api/test-results/{id}`

```json
{
  "status": "FAILED",
  "comment": "Payment error is shown, but cart is emptied after redirect.",
  "attachments": [
    "https://storage.example.com/test-runs/run-123/payment-error.png",
    "https://storage.example.com/test-runs/run-123/browser-console.log"
  ]
}
```

Direct result updates are also restricted to the assigned user or an admin.

## Add Result Attachments

`POST /api/test-results/{id}/attachments`

```json
{
  "attachments": [
    "https://storage.example.com/test-runs/run-123/retry-video.mp4"
  ]
}
```

## Re-run Failed Tests

`POST /api/test-runs/{id}/rerun-failed`

```json
{
  "name": "Release 1.8 failed cases re-run",
  "description": "Focused re-run after checkout fixes."
}
```
