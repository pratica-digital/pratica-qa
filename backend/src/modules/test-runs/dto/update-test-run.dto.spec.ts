import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { UpdateTestRunDto } from './update-test-run.dto';

describe('UpdateTestRunDto name', () => {
  it('trims surrounding spaces before validation', async () => {
    const dto = plainToInstance(UpdateTestRunDto, { name: '  Run revisado  ' });

    await expect(validate(dto)).resolves.toHaveLength(0);
    expect(dto.name).toBe('Run revisado');
  });

  it.each(['', '   '])('rejects an empty name: %p', async (name) => {
    const dto = plainToInstance(UpdateTestRunDto, { name });

    const errors = await validate(dto);

    expect(errors).toHaveLength(1);
    expect(errors[0].property).toBe('name');
    expect(errors[0].constraints).toHaveProperty('isNotEmpty');
  });

  it('enforces the same 160 character limit used during creation', async () => {
    const dto = plainToInstance(UpdateTestRunDto, { name: 'x'.repeat(161) });

    const errors = await validate(dto);

    expect(errors[0].constraints).toHaveProperty('maxLength');
  });
});
