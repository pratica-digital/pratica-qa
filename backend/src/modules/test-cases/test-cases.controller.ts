import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { BulkUpdateTestCasesDto } from './dto/bulk-update-test-cases.dto';
import { CloneTestCaseDto } from './dto/clone-test-case.dto';
import { CreateTestCaseDto } from './dto/create-test-case.dto';
import { QueryTestCasesDto } from './dto/query-test-cases.dto';
import { ReplaceTestStepsDto } from './dto/replace-test-steps.dto';
import { UpdateTestCaseDto } from './dto/update-test-case.dto';
import { TestCasesService } from './test-cases.service';

@Controller('test-cases')
export class TestCasesController {
  constructor(private readonly testCasesService: TestCasesService) {}

  @Post()
  create(@Body() dto: CreateTestCaseDto) {
    return this.testCasesService.create(dto);
  }

  @Post('bulk/status')
  bulkUpdateStatus(@Body() dto: BulkUpdateTestCasesDto) {
    return this.testCasesService.bulkUpdateStatus(dto);
  }

  @Get()
  findAll(@Query() query: QueryTestCasesDto) {
    return this.testCasesService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.testCasesService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateTestCaseDto) {
    return this.testCasesService.update(id, dto);
  }

  @Put(':id/steps')
  replaceSteps(@Param('id', ParseUUIDPipe) id: string, @Body() dto: ReplaceTestStepsDto) {
    return this.testCasesService.replaceSteps(id, dto);
  }

  @Post(':id/clone')
  clone(@Param('id', ParseUUIDPipe) id: string, @Body() dto: CloneTestCaseDto) {
    return this.testCasesService.clone(id, dto);
  }

  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.testCasesService.remove(id);
  }
}
