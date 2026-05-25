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
import { CreateTestRunDto } from './dto/create-test-run.dto';
import { QueryTestRunsDto } from './dto/query-test-runs.dto';
import { RerunFailedTestsDto } from './dto/rerun-failed-tests.dto';
import { UpdateTestRunDto } from './dto/update-test-run.dto';
import { TestRunsService } from './test-runs.service';

@Controller('test-runs')
export class TestRunsController {
  constructor(private readonly testRunsService: TestRunsService) {}

  @Post()
  create(@Body() dto: CreateTestRunDto) {
    return this.testRunsService.create(dto);
  }

  @Get()
  findAll(@Query() query: QueryTestRunsDto) {
    return this.testRunsService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.testRunsService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateTestRunDto) {
    return this.testRunsService.update(id, dto);
  }

  @Post(':id/start')
  start(@Param('id', ParseUUIDPipe) id: string) {
    return this.testRunsService.start(id);
  }

  @Post(':id/complete')
  complete(@Param('id', ParseUUIDPipe) id: string) {
    return this.testRunsService.complete(id);
  }

  @Post(':id/rerun-failed')
  rerunFailed(@Param('id', ParseUUIDPipe) id: string, @Body() dto: RerunFailedTestsDto) {
    return this.testRunsService.rerunFailed(id, dto);
  }

  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.testRunsService.remove(id);
  }
}
