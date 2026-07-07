import { validateTestCaseImport } from './test-case-import.validation';

describe('validateTestCaseImport', () => {
  it('normalizes valid rows and ignores blank rows', () => {
    const result = validateTestCaseImport([
      {
        rowNumber: 2,
        title: ' Login válido ',
        description: ' Credenciais corretas ',
        expectedResults: ' Painel aberto ',
        section: ' Autenticação ',
        testSteps: [
          {
            order: 1,
            description: ' Abrir login ',
          },
          {
            order: 2,
            description: ' Enviar dados ',
          },
        ],
      },
      {
        rowNumber: 3,
        title: '',
        description: '',
      },
    ]);

    expect(result.ignoredEmptyRows).toBe(1);
    expect(result.invalidRowCount).toBe(0);
    expect(result.validRows).toEqual([
      {
        rowNumber: 2,
        title: 'Login válido',
        description: 'Credenciais corretas',
        expectedResult: 'Painel aberto',
        section: 'Autenticação',
        steps: [
          {
            order: 1,
            description: 'Abrir login',
            expectedResult: undefined,
          },
          {
            order: 2,
            description: 'Enviar dados',
            expectedResult: undefined,
          },
        ],
      },
    ]);
  });

  it('reports invalid rows with spreadsheet line numbers', () => {
    const result = validateTestCaseImport(
      [
        {
          rowNumber: 8,
          title: '',
          expectedResults: 'Resultado preenchido',
        },
        {
          rowNumber: 15,
          title: 'Sem resultado',
          expectedResults: '',
        },
      ],
      {
        requireExpectedResults: true,
      },
    );

    expect(result.validRows).toHaveLength(0);
    expect(result.invalidRowCount).toBe(2);
    expect(result.errors).toEqual([
      {
        rowNumber: 8,
        message: 'Título obrigatório.',
      },
      {
        rowNumber: 15,
        message: 'Resultados esperados ausentes.',
      },
    ]);
  });
});
