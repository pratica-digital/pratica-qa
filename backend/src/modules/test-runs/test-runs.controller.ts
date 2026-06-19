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
import { AssignTestRunDto } from './dto/assign-test-run.dto';
import { CreateTestRunDto } from './dto/create-test-run.dto';
import { ExecuteTestRunDto } from './dto/execute-test-run.dto';
import { QueryTestRunsDto } from './dto/query-test-runs.dto';
import { RerunFailedTestsDto } from './dto/rerun-failed-tests.dto';
import { UpdateTestRunDto } from './dto/update-test-run.dto';
import { TestRunsService } from './test-runs.service';

@Controller('test-runs')
export class TestRunsController {
  constructor(private readonly testRunsService: TestRunsService) {}

  @Roles(UserRole.ADMIN, UserRole.QA)
  @Post()
  create(@Body() dto: CreateTestRunDto) {
    return this.testRunsService.create(dto);
  }

  @Get()
  findAll(@Query() query: QueryTestRunsDto) {
    return this.testRunsService.findAll(query);
  }

  @Roles(UserRole.ADMIN, UserRole.QA)
  @Get('assignable-users')
  findAssignableUsers() {
    return this.testRunsService.findAssignableUsers();
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.testRunsService.findOne(id);
  }

  @Roles(UserRole.ADMIN, UserRole.QA)
  @Patch(':id')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateTestRunDto) {
    return this.testRunsService.update(id, dto);
  }

  @Roles(UserRole.ADMIN, UserRole.QA)
  @Post(':id/assign')
  assign(@Param('id', ParseUUIDPipe) id: string, @Body() dto: AssignTestRunDto) {
    return this.testRunsService.assign(id, dto);
  }

  @Roles(UserRole.ADMIN, UserRole.QA)
  @Post(':id/start')
  start(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.testRunsService.start(id, user);
  }

  @Roles(UserRole.ADMIN, UserRole.QA)
  @Post(':id/complete')
  complete(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.testRunsService.complete(id, user);
  }

  @Roles(UserRole.ADMIN, UserRole.QA)
  @Post(':id/execute')
  execute(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ExecuteTestRunDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.testRunsService.execute(id, dto, user);
  }

  @Roles(UserRole.ADMIN, UserRole.QA)
  @Post(':id/rerun-failed')
  rerunFailed(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RerunFailedTestsDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.testRunsService.rerunFailed(id, dto, user);
  }

  @Roles(UserRole.ADMIN, UserRole.QA)
  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.testRunsService.remove(id);
  }
}
