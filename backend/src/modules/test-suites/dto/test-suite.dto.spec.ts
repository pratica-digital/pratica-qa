import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateTestSuiteDto } from './create-test-suite.dto';
import { UpdateTestSuiteDto } from './update-test-suite.dto';

describe('test suite DTOs', () => {
  it.each([
    ['', CreateTestSuiteDto],
    ['   ', CreateTestSuiteDto],
    ['Untitled', CreateTestSuiteDto],
    [' untitled ', UpdateTestSuiteDto],
  ])('rejects invalid or provisional suite name %p', async (name, DtoClass) => {
    const dto = plainToInstance(DtoClass, { name });

    await expect(validate(dto)).resolves.not.toHaveLength(0);
  });

  it('trims and accepts a meaningful suite name', async () => {
    const dto = plainToInstance(CreateTestSuiteDto, { name: '  Receitas  ' });

    await expect(validate(dto)).resolves.toHaveLength(0);
    expect(dto.name).toBe('Receitas');
  });

  it('accepts multiple unique project ids', async () => {
    const dto = plainToInstance(CreateTestSuiteDto, {
      name: 'Receitas compartilhadas',
      projectIds: [
        'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
        'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
      ],
    });

    await expect(validate(dto)).resolves.toHaveLength(0);
  });

  it('rejects duplicated project ids', async () => {
    const projectId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
    const dto = plainToInstance(CreateTestSuiteDto, {
      name: 'Receitas compartilhadas',
      projectIds: [projectId, projectId],
    });

    await expect(validate(dto)).resolves.not.toHaveLength(0);
  });
});
