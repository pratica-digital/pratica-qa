import { describe, expect, it } from "vitest";
import type { TestResult, TestRun, TestRunSuite } from "../types/testRun";
import {
  getAdjacentResult,
  getGlobalResultPosition,
  groupExecutionResults,
  resolveActiveResultId,
  sortExecutionResults,
  sortExecutionSuites,
  WITHOUT_SUITE_ID,
} from "./testRunNavigation";

function suite(id: string, position: number): TestRunSuite {
  return {
    id: `run-${id}`,
    position,
    testSuiteId: id,
    testSuite: { id, name: `Suite ${id}` },
  };
}

function result(
  id: string,
  suiteId: string | undefined,
  position: number,
  casePosition = position,
): TestResult {
  return {
    id,
    position,
    status: "PENDING",
    testCaseId: `case-${id}`,
    testCase: {
      id: `case-${id}`,
      position: casePosition,
      suiteId,
      title: `Caso ${id}`,
    },
  };
}

function run(suites: TestRunSuite[], results: TestResult[]): TestRun {
  return {
    id: "run",
    assignedToId: "user",
    name: "Run",
    status: "PENDING",
    suites,
    results,
  };
}

describe("test run navigation", () => {
  it("sorts suites and cases numerically, including positions above 9", () => {
    const testRun = run(
      [suite("b", 2), suite("a", 1)],
      [
        result("12", "a", 12),
        result("2", "a", 2),
        result("1", "a", 1),
        result("b", "b", 13),
      ],
    );

    expect(
      sortExecutionSuites(testRun.suites).map((item) => item.testSuiteId),
    ).toEqual(["a", "b"]);
    expect(sortExecutionResults(testRun).map((item) => item.id)).toEqual([
      "1",
      "2",
      "12",
      "b",
    ]);
  });

  it("starts at the first pending test and restores a valid stored test", () => {
    const results = [result("1", "a", 1), result("2", "a", 2)];
    results[0].status = "PASSED";

    expect(resolveActiveResultId(results)).toBe("2");
    expect(resolveActiveResultId(results, "1")).toBe("1");
    expect(resolveActiveResultId(results, "missing")).toBe("2");
  });

  it("navigates forward, backward, and across suites without skipping", () => {
    const results = [
      result("1", "a", 1),
      result("2", "a", 2),
      result("3", "b", 3),
    ];

    expect(getAdjacentResult(results, "2", 1)?.id).toBe("3");
    expect(getAdjacentResult(results, "3", -1)?.id).toBe("2");
    expect(getAdjacentResult(results, "1", -1)).toBeNull();
  });

  it("groups suites, calculates totals, preserves global positions, and includes empty suites", () => {
    const testRun = run(
      [suite("a", 1), suite("empty", 2)],
      [
        result("1", "a", 1),
        result("2", "a", 2),
        result("orphan", undefined, 3),
      ],
    );
    testRun.results![0].status = "PASSED";
    testRun.results![1].status = "FAILED";
    const groups = groupExecutionResults(testRun);

    expect(groups.map((group) => group.id)).toEqual([
      "a",
      "empty",
      WITHOUT_SUITE_ID,
    ]);
    expect(groups[0].summary).toMatchObject({
      total: 2,
      passed: 1,
      failed: 1,
      notRun: 0,
    });
    expect(groups[1].results).toEqual([]);
    expect(
      getGlobalResultPosition(sortExecutionResults(testRun), "orphan"),
    ).toBe(3);
  });

  it("handles a single suite and many cases without duplicates or losses", () => {
    const results = Array.from({ length: 150 }, (_, index) =>
      result(String(index + 1), "a", index + 1),
    );
    const ordered = sortExecutionResults(
      run([suite("a", 1)], [...results].reverse()),
    );

    expect(ordered).toHaveLength(150);
    expect(new Set(ordered.map((item) => item.id)).size).toBe(150);
    expect(ordered[0].id).toBe("1");
    expect(ordered[149].id).toBe("150");
  });
});
