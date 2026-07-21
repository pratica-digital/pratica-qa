import { describe, expect, it } from "vitest";
import type { ManagedTestCase, ManagedTestSuite } from "../types/testRun";
import {
  summarizeAddTestRunSelection,
  toggleSuiteCases,
} from "./addTestRunSelection";

const suites = [
  { id: "suite-a", name: "Suite A", position: 1 },
  { id: "suite-b", name: "Suite B", position: 2 },
] as ManagedTestSuite[];
const cases = [
  { id: "a-1", suiteId: "suite-a", position: 1, status: "ACTIVE" },
  { id: "a-2", suiteId: "suite-a", position: 2, status: "ACTIVE" },
  { id: "b-1", suiteId: "suite-b", position: 1, status: "ACTIVE" },
] as ManagedTestCase[];

describe("add test run selection", () => {
  it("selects and clears every case in a suite", () => {
    const selected = toggleSuiteCases(new Set(), cases.slice(0, 2));
    expect([...selected]).toEqual(["a-1", "a-2"]);
    expect(toggleSuiteCases(selected, cases.slice(0, 2)).size).toBe(0);
  });

  it("builds a combined suite and individual-case payload without duplication", () => {
    const summary = summarizeAddTestRunSelection(
      suites,
      cases,
      new Set(["a-1", "a-2", "b-1"]),
      new Set(["a-1"]),
    );

    expect(summary.selectedSuiteIds).toEqual(["suite-a", "suite-b"]);
    expect(summary.selectedCaseIds).toEqual([]);
    expect(summary.newCaseIds).toEqual(["a-2", "b-1"]);
    expect(summary.duplicateCaseIds).toEqual(["a-1"]);
  });

  it("keeps partial suite selection as individual cases", () => {
    const summary = summarizeAddTestRunSelection(
      suites,
      cases,
      new Set(["a-2"]),
      new Set(),
    );
    expect(summary.selectedSuiteIds).toEqual([]);
    expect(summary.selectedCaseIds).toEqual(["a-2"]);
  });
});
