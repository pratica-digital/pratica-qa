import { Allow, IsIn, IsOptional, IsString } from 'class-validator';

export class CaseActionDto {
  @IsIn(['improve', 'negative-cases', 'regression', 'test-data', 'explain-change'])
  action: 'improve' | 'negative-cases' | 'regression' | 'test-data' | 'explain-change';

  @Allow()
  testCase: unknown;

  @IsOptional()
  @IsString()
  context?: string;
}
