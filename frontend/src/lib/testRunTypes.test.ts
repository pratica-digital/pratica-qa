import { describe, expect, it } from "vitest";
import type { TestResult, TestRun } from "../types/testRun";
import {
  formatTestRunTypes,
  summarizeResultsByTestType,
  testRunTypesSuccessMessage,
  testRunTypeLabel,
  uniqueTestRunTypes,
} from "./testRunTypes";

function result(id: string, suiteId: string, status: TestResult["status"]) {
  return { id, status, testCase: { id: `case-${id}`, suiteId, title: id } } as TestResult;
}

describe("test run types", () => {
  it("formats internal values with friendly labels", () => {
    expect(testRunTypeLabel("SMOKE")).toBe("Smoke");
    expect(testRunTypeLabel("FUNCIONAL")).toBe("Funcional");
    expect(testRunTypeLabel("REGRESSAO")).toBe("Regressão");
    expect(testRunTypeLabel("ROBUSTEZ")).toBe("Robustez");
  });

  it("formats one or multiple unique types in Portuguese", () => {
    expect(formatTestRunTypes(["SMOKE"])).toBe("Smoke");
    expect(formatTestRunTypes(["SMOKE", "FUNCIONAL", "REGRESSAO", "SMOKE"])).toBe(
      "Smoke, Funcional e Regressão",
    );
    expect(uniqueTestRunTypes(["SMOKE", "SMOKE"])).toEqual(["SMOKE"]);
  });

  it("uses a neutral label for old runs without a type", () => {
    expect(formatTestRunTypes([])).toBe("Tipo de teste não definido");
    expect(testRunTypesSuccessMessage("updated", { suites: [] })).toBe(
      "Execução atualizada com sucesso. Tipos associados: Tipo de teste não definido.",
    );
  });

  it("counts passed and failed results by suite type without duplicate type rows", () => {
    const run = {
      suites: [
        { id: "1", position: 1, testSuiteId: "suite-a", testType: "SMOKE" },
        { id: "2", position: 2, testSuiteId: "suite-b", testType: "SMOKE" },
        { id: "3", position: 3, testSuiteId: "suite-c", testType: "REGRESSAO" },
      ],
    } as TestRun;

    expect(
      summarizeResultsByTestType(run, [
        result("1", "suite-a", "PASSED"),
        result("2", "suite-b", "FAILED"),
        result("3", "suite-c", "PASSED"),
        result("4", "legacy-suite", "FAILED"),
      ]),
    ).toEqual([
      { type: "SMOKE", label: "Smoke", total: 2, passed: 1, failed: 1 },
      { type: "REGRESSAO", label: "Regressão", total: 1, passed: 1, failed: 0 },
      {
        type: null,
        label: "Tipo de teste não definido",
        total: 1,
        passed: 0,
        failed: 1,
      },
    ]);
  });
});
