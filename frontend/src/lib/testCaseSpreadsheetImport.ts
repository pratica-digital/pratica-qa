import * as XLSX from 'xlsx';

export type ImportColumnField =
  | 'id'
  | 'testCaseNumber'
  | 'title'
  | 'description'
  | 'testSteps'
  | 'expectedResults'
  | 'section'
  | 'createdAt'
  | 'updatedAt';

export type ImportValidationError = {
  rowNumber: number;
  message: string;
};

export type ParsedImportRow = {
  rowNumber: number;
  title: string;
  description: string;
  testSteps: string[];
  expectedResults: string;
  section: string;
  errors: string[];
  status: 'valid' | 'invalid';
};

export type SpreadsheetImportResult = {
  fileName: string;
  rows: ParsedImportRow[];
  errors: ImportValidationError[];
  ignoredEmptyRows: number;
  totalRows: number;
  validCount: number;
  invalidCount: number;
  columnMapping: Partial<Record<ImportColumnField, number>>;
  requireExpectedResults: boolean;
  missingRequiredColumns: string[];
};

export type TestCaseImportPayload = {
  rowNumber: number;
  title: string;
  description?: string;
  testSteps?: Array<{
    order: number;
    description: string;
  }>;
  expectedResults?: string;
  section?: string;
};

const SUPPORTED_EXTENSIONS = new Set(['csv', 'tsv', 'xls', 'xlsx']);

const HEADER_ALIASES: Record<string, ImportColumnField> = {
  id: 'id',
  identifier: 'id',
  'test case number': 'testCaseNumber',
  'test case id': 'testCaseNumber',
  'case number': 'testCaseNumber',
  'case id': 'testCaseNumber',
  titulo: 'title',
  title: 'title',
  'test case title': 'title',
  descricao: 'description',
  description: 'description',
  'etapas do teste': 'testSteps',
  'passos do teste': 'testSteps',
  etapas: 'testSteps',
  passos: 'testSteps',
  steps: 'testSteps',
  'test steps': 'testSteps',
  'test step': 'testSteps',
  'resultados esperados': 'expectedResults',
  'resultado esperado': 'expectedResults',
  'expected results': 'expectedResults',
  'expected result': 'expectedResults',
  secao: 'section',
  section: 'section',
  'created at': 'createdAt',
  created: 'createdAt',
  'updated at': 'updatedAt',
  updated: 'updatedAt',
};

function normalizeText(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase();
}

function getCellText(value: unknown) {
  if (value === null || value === undefined) {
    return '';
  }

  if (value instanceof Date) {
    return value.toLocaleDateString('pt-BR');
  }

  return String(value).trim();
}

function isRowEmpty(row: unknown[]) {
  return row.every((cell) => getCellText(cell).length === 0);
}

function detectColumnMapping(headerRow: unknown[]) {
  const mapping: Partial<Record<ImportColumnField, number>> = {};

  headerRow.forEach((header, index) => {
    const field = HEADER_ALIASES[normalizeText(getCellText(header))];

    if (field && mapping[field] === undefined) {
      mapping[field] = index;
    }
  });

  return mapping;
}

function findHeaderRow(rows: unknown[][]) {
  let firstWithTitle:
    | {
        index: number;
        mapping: Partial<Record<ImportColumnField, number>>;
        score: number;
      }
    | null = null;
  let best:
    | {
        index: number;
        mapping: Partial<Record<ImportColumnField, number>>;
        score: number;
      }
    | null = null;

  rows.forEach((row, index) => {
    const mapping = detectColumnMapping(row);

    if (mapping.title === undefined) {
      return;
    }

    const score = Object.keys(mapping).length;
    const candidate = { index, mapping, score };

    firstWithTitle ??= candidate;

    if (!best || score > best.score) {
      best = candidate;
    }
  });

  return best ?? firstWithTitle ?? {
    index: 0,
    mapping: detectColumnMapping(rows[0] ?? []),
    score: 0,
  };
}

export function splitTestSteps(value: string) {
  const normalized = value.replace(/\r\n?/g, '\n').trim();

  if (!normalized) {
    return [];
  }

  const separator = normalized.includes('\n') ? /\n+/ : /;+/;

  return normalized
    .split(separator)
    .map((step) =>
      step
        .replace(/^\s*(?:\d+[).:-]?|[-*•])\s*/, '')
        .trim(),
    )
    .filter(Boolean);
}

function readMappedCell(row: unknown[], mapping: Partial<Record<ImportColumnField, number>>, field: ImportColumnField) {
  const columnIndex = mapping[field];
  return columnIndex === undefined ? '' : getCellText(row[columnIndex]);
}

function validateRow(
  row: Omit<ParsedImportRow, 'errors' | 'status'>,
  requireExpectedResults: boolean,
) {
  const errors: string[] = [];

  if (!row.title) {
    errors.push('Título obrigatório.');
  }

  if (row.title.length > 180) {
    errors.push('Título deve ter no máximo 180 caracteres.');
  }

  if (row.description.length > 4000) {
    errors.push('Descrição deve ter no máximo 4000 caracteres.');
  }

  if (requireExpectedResults && !row.expectedResults) {
    errors.push('Resultados esperados ausentes.');
  }

  if (row.expectedResults.length > 4000) {
    errors.push('Resultados esperados devem ter no máximo 4000 caracteres.');
  }

  if (row.section.length > 160) {
    errors.push('Seção deve ter no máximo 160 caracteres.');
  }

  if (row.testSteps.length > 100) {
    errors.push('Etapas do teste devem ter no máximo 100 itens.');
  }

  if (row.testSteps.some((step) => step.length > 2000)) {
    errors.push('Cada etapa do teste deve ter no máximo 2000 caracteres.');
  }

  return errors;
}

export function parseSpreadsheetRows(rows: unknown[][], fileName = ''): SpreadsheetImportResult {
  const headerRow = findHeaderRow(rows);
  const columnMapping = headerRow.mapping;
  const missingRequiredColumns = columnMapping.title === undefined ? ['Título'] : [];
  const requireExpectedResults = columnMapping.expectedResults !== undefined;

  if (missingRequiredColumns.length > 0) {
    return {
      fileName,
      rows: [],
      errors: [
        {
          rowNumber: 1,
          message: 'Coluna Título obrigatória não encontrada.',
        },
      ],
      ignoredEmptyRows: 0,
      totalRows: 0,
      validCount: 0,
      invalidCount: 0,
      columnMapping,
      requireExpectedResults,
      missingRequiredColumns,
    };
  }

  let ignoredEmptyRows = 0;
  const parsedRows: ParsedImportRow[] = [];

  rows.slice(headerRow.index + 1).forEach((row, index) => {
    const rowNumber = headerRow.index + index + 2;

    if (isRowEmpty(row)) {
      ignoredEmptyRows += 1;
      return;
    }

    const parsed = {
      rowNumber,
      title: readMappedCell(row, columnMapping, 'title'),
      description: readMappedCell(row, columnMapping, 'description'),
      testSteps: splitTestSteps(readMappedCell(row, columnMapping, 'testSteps')),
      expectedResults: readMappedCell(row, columnMapping, 'expectedResults'),
      section: readMappedCell(row, columnMapping, 'section'),
    };
    const errors = validateRow(parsed, requireExpectedResults);

    parsedRows.push({
      ...parsed,
      errors,
      status: errors.length > 0 ? 'invalid' : 'valid',
    });
  });

  const errors = parsedRows.flatMap((row) =>
    row.errors.map((message) => ({
      rowNumber: row.rowNumber,
      message,
    })),
  );
  const validCount = parsedRows.filter((row) => row.status === 'valid').length;
  const invalidCount = parsedRows.length - validCount;

  return {
    fileName,
    rows: parsedRows,
    errors,
    ignoredEmptyRows,
    totalRows: parsedRows.length,
    validCount,
    invalidCount,
    columnMapping,
    requireExpectedResults,
    missingRequiredColumns,
  };
}

function getFileExtension(fileName: string) {
  return fileName.split('.').pop()?.toLowerCase() ?? '';
}

export function isSupportedSpreadsheetFile(file: File) {
  return SUPPORTED_EXTENSIONS.has(getFileExtension(file.name));
}

export async function parseSpreadsheetFile(file: File) {
  const extension = getFileExtension(file.name);

  if (!isSupportedSpreadsheetFile(file)) {
    throw new Error('Formato não suportado. Use .csv, .tsv, .xls ou .xlsx.');
  }

  const workbook =
    extension === 'csv' || extension === 'tsv'
      ? XLSX.read(await file.text(), {
          type: 'string',
          raw: false,
          FS: extension === 'tsv' ? '\t' : ',',
        })
      : XLSX.read(await file.arrayBuffer(), {
          type: 'array',
          raw: false,
        });
  const firstSheetName = workbook.SheetNames[0];

  if (!firstSheetName) {
    throw new Error('A planilha não contém abas para importar.');
  }

  const sheet = workbook.Sheets[firstSheetName];
  const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    blankrows: false,
    defval: '',
    raw: false,
  });

  return parseSpreadsheetRows(rows, file.name);
}

export function toImportPayload(rows: ParsedImportRow[]): TestCaseImportPayload[] {
  return rows
    .filter((row) => row.status === 'valid')
    .map((row) => ({
      rowNumber: row.rowNumber,
      title: row.title,
      description: row.description || undefined,
      expectedResults: row.expectedResults || undefined,
      section: row.section || undefined,
      testSteps:
        row.testSteps.length > 0
          ? row.testSteps.map((step, index) => ({
              order: index + 1,
              description: step,
            }))
          : undefined,
    }));
}
