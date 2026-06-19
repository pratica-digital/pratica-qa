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
import { CreateTestSuiteDto } from './dto/create-test-suite.dto';
import { QueryTestSuitesDto } from './dto/query-test-suites.dto';
import { UpdateTestSuiteDto } from './dto/update-test-suite.dto';
import { TestSuitesService } from './test-suites.service';

@Controller('test-suites')
export class TestSuitesController {
  constructor(private readonly testSuitesService: TestSuitesService) {}

  @Roles(UserRole.ADMIN, UserRole.QA)
  @Post()
  create(@Body() dto: CreateTestSuiteDto) {
    return this.testSuitesService.create(dto);
  }

  @Get()
  findAll(@Query() query: QueryTestSuitesDto) {
    return this.testSuitesService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.testSuitesService.findOne(id);
  }

  @Roles(UserRole.ADMIN, UserRole.QA)
  @Patch(':id')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateTestSuiteDto) {
    return this.testSuitesService.update(id, dto);
  }

  @Roles(UserRole.ADMIN, UserRole.QA)
  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.testSuitesService.remove(id);
  }
}
