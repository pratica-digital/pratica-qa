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
import { AddTestResultAttachmentsDto } from './dto/add-test-result-attachments.dto';
import { CreateTestResultDto } from './dto/create-test-result.dto';
import { QueryTestResultsDto } from './dto/query-test-results.dto';
import { UpdateTestResultDto } from './dto/update-test-result.dto';
import { TestResultsService } from './test-results.service';

@Controller('test-results')
export class TestResultsController {
  constructor(private readonly testResultsService: TestResultsService) {}

  @Post()
  create(@Body() dto: CreateTestResultDto) {
    return this.testResultsService.create(dto);
  }

  @Get()
  findAll(@Query() query: QueryTestResultsDto) {
    return this.testResultsService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.testResultsService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateTestResultDto) {
    return this.testResultsService.update(id, dto);
  }

  @Post(':id/attachments')
  addAttachments(@Param('id', ParseUUIDPipe) id: string, @Body() dto: AddTestResultAttachmentsDto) {
    return this.testResultsService.addAttachments(id, dto);
  }

  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.testResultsService.remove(id);
  }
}
