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
import { CreateTestSuiteDto } from './dto/create-test-suite.dto';
import { QueryTestSuitesDto } from './dto/query-test-suites.dto';
import { UpdateTestSuiteDto } from './dto/update-test-suite.dto';
import { TestSuitesService } from './test-suites.service';

@Controller('test-suites')
export class TestSuitesController {
  constructor(private readonly testSuitesService: TestSuitesService) {}

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

  @Patch(':id')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateTestSuiteDto) {
    return this.testSuitesService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.testSuitesService.remove(id);
  }
}
