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
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { Roles } from '../../auth/decorators/roles.decorator';
import { AuthenticatedUser } from '../../auth/types/authenticated-user';
import { AddTestResultAttachmentsDto } from './dto/add-test-result-attachments.dto';
import { CreateTestResultDto } from './dto/create-test-result.dto';
import { QueryTestResultsDto } from './dto/query-test-results.dto';
import { UpdateTestResultDto } from './dto/update-test-result.dto';
import { TestResultsService } from './test-results.service';

@Controller('test-results')
export class TestResultsController {
  constructor(private readonly testResultsService: TestResultsService) {}

  @Roles(UserRole.ADMIN)
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

  @Roles(UserRole.ADMIN, UserRole.QA)
  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTestResultDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.testResultsService.update(id, dto, user);
  }

  @Roles(UserRole.ADMIN, UserRole.QA)
  @Post(':id/attachments')
  addAttachments(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AddTestResultAttachmentsDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.testResultsService.addAttachments(id, dto, user);
  }

  @Roles(UserRole.ADMIN)
  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.testResultsService.remove(id);
  }
}
