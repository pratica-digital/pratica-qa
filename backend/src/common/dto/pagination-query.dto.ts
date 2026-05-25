import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

export class PaginationQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 25;
}

export function getPagination(query: PaginationQueryDto) {
  const page = query.page ?? 1;
  const take = query.limit ?? 25;

  return {
    page,
    take,
    skip: (page - 1) * take,
  };
}
