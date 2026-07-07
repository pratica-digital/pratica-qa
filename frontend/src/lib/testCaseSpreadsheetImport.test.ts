import { describe, expect, it } from 'vitest';
import { parseSpreadsheetRows, splitTestSteps, toImportPayload } from './testCaseSpreadsheetImport';

describe('testCaseSpreadsheetImport', () => {
  it('maps headers ignoring accents, case and extra spaces', () => {
    const result = parseSpreadsheetRows([
      ['  TÍTULO  ', 'Descrição', 'Etapas do teste', 'Resultados esperados', 'Seção'],
      ['Login válido', 'Credenciais corretas', '1. Abrir login\n2. Enviar dados', 'Usuário acessa o painel', 'Autenticação'],
      ['', '', '', '', ''],
      ['Recuperar senha', 'Solicitar reset', 'Clicar em esqueci senha; Informar email', 'Email enviado', 'Autenticação'],
    ]);

    expect(result.totalRows).toBe(2);
    expect(result.ignoredEmptyRows).toBe(1);
    expect(result.validCount).toBe(2);
    expect(result.rows[0]).toMatchObject({
      rowNumber: 2,
      title: 'Login válido',
      section: 'Autenticação',
      testSteps: ['Abrir login', 'Enviar dados'],
    });
  });

  it('understands exported English spreadsheet headers with metadata columns', () => {
    const result = parseSpreadsheetRows([
      [
        'Id',
        'Section',
        'Test case number',
        'Title',
        'Description',
        'Test steps',
        'Expected result',
        'Created at',
        'Updated at',
      ],
      [
        '123',
        'Checkout',
        'TC-42',
        'Submit order',
        'Customer has an open cart',
        'Open cart\nConfirm payment',
        'Order is created',
        '2026-07-01',
        '2026-07-02',
      ],
    ]);

    expect(result.validCount).toBe(1);
    expect(result.columnMapping).toMatchObject({
      id: 0,
      section: 1,
      testCaseNumber: 2,
      title: 3,
      description: 4,
      testSteps: 5,
      expectedResults: 6,
      createdAt: 7,
      updatedAt: 8,
    });
    expect(result.rows[0]).toMatchObject({
      title: 'Submit order',
      section: 'Checkout',
      description: 'Customer has an open cart',
      testSteps: ['Open cart', 'Confirm payment'],
      expectedResults: 'Order is created',
    });
  });

  it('finds the table header after TestRail-style suite metadata rows', () => {
    const result = parseSpreadsheetRows([
      ['Test suite name', 'Analitics TSI: Configuracoes de Fabrica - Funcional'],
      ['Created on', '2026-04-28 15:40:20 UTC'],
      ['Updated on', '2026-06-02 14:11:13 UTC'],
      [],
      [
        'Id',
        'Section',
        'Test case number',
        'Title',
        'Description',
        'Test steps',
        'Expected result',
        'Created at',
        'Updated at',
      ],
      [
        '4798517',
        'Configuracoes de Fabrica - Funcional',
        'TC1122',
        'Acesso permitido com credencial valida',
        'Objetivo:\nValidar acesso correto com credencial autorizada.',
        '1. Inserir credencial valida.\n2. Acessar modulo.',
        'Tela aberta corretamente.',
        '2026-04-28 15:40:20 UTC',
        '2026-04-28 15:40:20 UTC',
      ],
    ]);

    expect(result.validCount).toBe(1);
    expect(result.rows[0]).toMatchObject({
      rowNumber: 6,
      title: 'Acesso permitido com credencial valida',
      section: 'Configuracoes de Fabrica - Funcional',
      description: 'Objetivo:\nValidar acesso correto com credencial autorizada.',
      testSteps: ['Inserir credencial valida.', 'Acessar modulo.'],
      expectedResults: 'Tela aberta corretamente.',
    });
  });

  it('reports a missing required title column', () => {
    const result = parseSpreadsheetRows([
      ['Descrição', 'Resultados esperados'],
      ['Sem cabeçalho de título', 'Não deve importar'],
    ]);

    expect(result.validCount).toBe(0);
    expect(result.missingRequiredColumns).toEqual(['Título']);
    expect(result.errors).toEqual([
      {
        rowNumber: 1,
        message: 'Coluna Título obrigatória não encontrada.',
      },
    ]);
  });

  it('marks rows without title or expected results as invalid when the column is present', () => {
    const result = parseSpreadsheetRows([
      ['TITULO', 'Resultados esperados'],
      ['', 'Resultado preenchido'],
      ['Sem resultado esperado', ''],
      ['Linha válida', 'Resultado preenchido'],
    ]);

    expect(result.totalRows).toBe(3);
    expect(result.validCount).toBe(1);
    expect(result.invalidCount).toBe(2);
    expect(result.errors).toEqual([
      {
        rowNumber: 2,
        message: 'Título obrigatório.',
      },
      {
        rowNumber: 3,
        message: 'Resultados esperados ausentes.',
      },
    ]);
  });

  it('splits multiline and semicolon-separated steps', () => {
    expect(splitTestSteps('1) Abrir tela\n- Confirmar dados\n3. Salvar')).toEqual([
      'Abrir tela',
      'Confirmar dados',
      'Salvar',
    ]);
    expect(splitTestSteps('Abrir tela; Confirmar dados; Salvar')).toEqual([
      'Abrir tela',
      'Confirmar dados',
      'Salvar',
    ]);
  });

  it('builds a clean payload from valid rows only', () => {
    const result = parseSpreadsheetRows([
      ['Título', 'Descrição', 'Etapas do teste', 'Resultados esperados', 'Seção'],
      ['Válido', 'Descrição', 'Passo 1;Passo 2', 'Resultado', 'Checkout'],
      ['', 'Descrição', 'Passo 1', 'Resultado', 'Checkout'],
    ]);

    expect(toImportPayload(result.rows)).toEqual([
      {
        rowNumber: 2,
        title: 'Válido',
        description: 'Descrição',
        expectedResults: 'Resultado',
        section: 'Checkout',
        testSteps: [
          {
            order: 1,
            description: 'Passo 1',
          },
          {
            order: 2,
            description: 'Passo 2',
          },
        ],
      },
    ]);
  });
});
