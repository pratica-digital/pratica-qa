import { describe, expect, it } from "vitest";
import type { TestResult } from "../types/testRun";
import { summarizeTestResults } from "./testRunSummary";

describe("test run summary after adding tests", () => {
  it("recalculates progress and every indicator using the new pending results", () => {
    const existingResults = Array.from({ length: 94 }, (_, index) => ({
      id: `existing-${index}`,
      status: "PASSED",
    })) as TestResult[];
    const addedResults = Array.from({ length: 6 }, (_, index) => ({
      id: `added-${index}`,
      status: "PENDING",
    })) as TestResult[];

    expect(
      summarizeTestResults([...existingResults, ...addedResults]),
    ).toMatchObject({
      approvalPercentage: 100,
      executed: 94,
      failed: 0,
      notRun: 6,
      passed: 94,
      progressPercentage: 94,
      skipped: 0,
      total: 100,
    });
  });
});
