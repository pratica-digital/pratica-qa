import { ImportTestCaseRowDto } from './dto/import-test-cases.dto';

export type TestCaseImportError = {
  rowNumber: number;
  message: string;
};

export type NormalizedImportedTestStep = {
  order: number;
  description: string;
  expectedResult?: string;
};

export type NormalizedImportedTestCase = {
  rowNumber: number;
  title: string;
  description: string;
  expectedResult: string;
  section: string;
  steps: NormalizedImportedTestStep[];
};

export type TestCaseImportValidationResult = {
  validRows: NormalizedImportedTestCase[];
  errors: TestCaseImportError[];
  invalidRowCount: number;
  ignoredEmptyRows: number;
};

type ValidateOptions = {
  requireExpectedResults?: boolean;
};

function clean(value: string | undefined) {
  return (value ?? '').trim();
}

function isBlankRow(row: ImportTestCaseRowDto) {
  return (
    !clean(row.title) &&
    !clean(row.description) &&
    !clean(row.expectedResults) &&
    !clean(row.section) &&
    !(row.testSteps ?? []).some((step) => clean(step.description) || clean(step.expectedResult))
  );
}

function normalizeSteps(row: ImportTestCaseRowDto) {
  return (row.testSteps ?? [])
    .map((step, index) => ({
      order: step.order && Number.isInteger(step.order) && step.order > 0 ? step.order : index + 1,
      description: clean(step.description),
      expectedResult: clean(step.expectedResult) || undefined,
    }))
    .filter((step) => step.description || step.expectedResult);
}

function validateSteps(rowNumber: number, steps: NormalizedImportedTestStep[]) {
  const errors: TestCaseImportError[] = [];

  if (steps.length > 100) {
    errors.push({
      rowNumber,
      message: 'Etapas do teste devem ter no máximo 100 itens.',
    });
  }

  steps.forEach((step, index) => {
    if (!step.description) {
      errors.push({
        rowNumber,
        message: `Etapa ${index + 1} precisa de descrição.`,
      });
    }

    if (step.description.length > 2000) {
      errors.push({
        rowNumber,
        message: `Etapa ${index + 1} deve ter no máximo 2000 caracteres.`,
      });
    }

    if ((step.expectedResult?.length ?? 0) > 2000) {
      errors.push({
        rowNumber,
        message: `Resultado esperado da etapa ${index + 1} deve ter no máximo 2000 caracteres.`,
      });
    }
  });

  return errors;
}

export function validateTestCaseImport(
  rows: ImportTestCaseRowDto[],
  options: ValidateOptions = {},
): TestCaseImportValidationResult {
  const validRows: NormalizedImportedTestCase[] = [];
  const errors: TestCaseImportError[] = [];
  let invalidRowCount = 0;
  let ignoredEmptyRows = 0;

  rows.forEach((row, index) => {
    const rowNumber = row.rowNumber ?? index + 2;

    if (isBlankRow(row)) {
      ignoredEmptyRows += 1;
      return;
    }

    const normalized: NormalizedImportedTestCase = {
      rowNumber,
      title: clean(row.title),
      description: clean(row.description),
      expectedResult: clean(row.expectedResults),
      section: clean(row.section),
      steps: normalizeSteps(row),
    };
    const rowErrors: TestCaseImportError[] = [];

    if (!normalized.title) {
      rowErrors.push({
        rowNumber,
        message: 'Título obrigatório.',
      });
    }

    if (normalized.title.length > 180) {
      rowErrors.push({
        rowNumber,
        message: 'Título deve ter no máximo 180 caracteres.',
      });
    }

    if (normalized.description.length > 4000) {
      rowErrors.push({
        rowNumber,
        message: 'Descrição deve ter no máximo 4000 caracteres.',
      });
    }

    if (options.requireExpectedResults && !normalized.expectedResult) {
      rowErrors.push({
        rowNumber,
        message: 'Resultados esperados ausentes.',
      });
    }

    if (normalized.expectedResult.length > 4000) {
      rowErrors.push({
        rowNumber,
        message: 'Resultados esperados devem ter no máximo 4000 caracteres.',
      });
    }

    if (normalized.section.length > 160) {
      rowErrors.push({
        rowNumber,
        message: 'Seção deve ter no máximo 160 caracteres.',
      });
    }

    rowErrors.push(...validateSteps(rowNumber, normalized.steps));

    if (rowErrors.length > 0) {
      invalidRowCount += 1;
      errors.push(...rowErrors);
      return;
    }

    validRows.push(normalized);
  });

  return {
    validRows,
    errors,
    invalidRowCount,
    ignoredEmptyRows,
  };
}
