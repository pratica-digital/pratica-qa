import { NotFoundException } from '@nestjs/common';
import { TestCasesService } from './test-cases.service';

describe('TestCasesService', () => {
  const payload = {
    suiteId: 'suite-id',
    title: 'Executar receita',
  };

  it('creates a case with its validated suite relationship', async () => {
    const cases = {
      create: jest.fn().mockResolvedValue({ id: 'case-id', ...payload }),
    };
    const suites = {
      findById: jest.fn().mockResolvedValue({ id: 'suite-id', name: 'Receitas' }),
    };
    const service = new TestCasesService(cases as never, suites as never);

    await expect(service.create(payload)).resolves.toMatchObject({ suiteId: 'suite-id' });
    expect(suites.findById).toHaveBeenCalledWith('suite-id');
    expect(cases.create).toHaveBeenCalledWith(payload);
  });

  it('rejects creation when the suite does not exist', async () => {
    const cases = { create: jest.fn() };
    const suites = { findById: jest.fn().mockResolvedValue(null) };
    const service = new TestCasesService(cases as never, suites as never);

    await expect(service.create(payload)).rejects.toBeInstanceOf(NotFoundException);
    expect(cases.create).not.toHaveBeenCalled();
  });

  it('validates the destination suite before moving a case', async () => {
    const cases = {
      findById: jest.fn().mockResolvedValue({ id: 'case-id', suiteId: 'suite-1' }),
      update: jest.fn().mockResolvedValue({ id: 'case-id', suiteId: 'suite-2' }),
    };
    const suites = {
      findById: jest.fn().mockResolvedValue({ id: 'suite-2' }),
    };
    const service = new TestCasesService(cases as never, suites as never);

    await service.update('case-id', { suiteId: 'suite-2' });

    expect(suites.findById).toHaveBeenCalledWith('suite-2');
    expect(cases.update).toHaveBeenCalledWith('case-id', { suiteId: 'suite-2' });
  });
});
