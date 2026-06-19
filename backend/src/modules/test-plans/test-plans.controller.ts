import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { Roles } from '../../auth/decorators/roles.decorator';
import { CreateTestPlanDto } from './dto/create-test-plan.dto';
import { QueryTestPlansDto } from './dto/query-test-plans.dto';
import { UpdateTestPlanDto } from './dto/update-test-plan.dto';
import { TestPlansService } from './test-plans.service';

@Controller('test-plans')
export class TestPlansController {
  constructor(private readonly testPlansService: TestPlansService) {}

  @Roles(UserRole.ADMIN, UserRole.QA)
  @Post()
  create(@Body() dto: CreateTestPlanDto) {
    return this.testPlansService.create(dto);
  }

  @Get()
  findAll(@Query() query: QueryTestPlansDto) {
    return this.testPlansService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.testPlansService.findOne(id);
  }

  @Roles(UserRole.ADMIN, UserRole.QA)
  @Patch(':id')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateTestPlanDto) {
    return this.testPlansService.update(id, dto);
  }

  @Roles(UserRole.ADMIN, UserRole.QA)
  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.testPlansService.remove(id);
  }
}
