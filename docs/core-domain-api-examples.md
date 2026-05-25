# Core QA Domain API Examples

## Entity Relationships

- `TestSuite` has many `TestCase`.
- `TestCase` belongs to one `TestSuite`.
- `TestCase` has ordered `TestStep` records.
- `TestPlan` belongs to one `Project`.
- `TestRun` belongs to one `Project` and one `TestPlan`.
- `TestRun` contains multiple `TestSuite` records through `TestRunSuite`.
- `TestRun` has many `TestResult` records.
- `TestResult` belongs to one `TestRun` and one `TestCase`.

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
  "name": "Release 1.8 regression run",
  "description": "Full regression pass before release candidate approval.",
  "suiteIds": [
    "1bf9f67e-88be-45d5-9c7d-cd7de3ab1aa0",
    "a08e865c-d291-46f8-a869-8f81c737ca2b"
  ]
}
```

## Start And Complete A Test Run

`POST /api/test-runs/{id}/start`

`POST /api/test-runs/{id}/complete`

## Mark A Test Result

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
