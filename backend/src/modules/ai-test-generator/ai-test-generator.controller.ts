import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { UserRole } from '@prisma/client';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { Roles } from '../../auth/decorators/roles.decorator';
import { AuthenticatedUser } from '../../auth/types/authenticated-user';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { aiReleaseUploadOptions } from './ai-release-upload';
import { AiTestGeneratorService } from './ai-test-generator.service';
import { UpdateAiSettingsDto } from './dto/ai-settings.dto';
import { AnalyzeReleaseDto } from './dto/analyze-release.dto';
import { CaseActionDto } from './dto/case-action.dto';
import { GenerateTestCasesDto } from './dto/generate-test-cases.dto';
import { SaveAiTestCasesDto } from './dto/save-ai-test-cases.dto';
import { AiSettingsService } from './services/ai-settings.service';

type UploadedReleaseFile = {
  buffer?: Buffer;
  mimetype: string;
  originalname: string;
  size?: number;
};

@Controller('ai-test-generator')
export class AiTestGeneratorController {
  constructor(
    private readonly aiTestGeneratorService: AiTestGeneratorService,
    private readonly settingsService: AiSettingsService,
  ) {}

  @Roles(UserRole.ADMIN, UserRole.QA)
  @Post('extract')
  @UseInterceptors(FileInterceptor('file', aiReleaseUploadOptions))
  extract(@UploadedFile() file?: UploadedReleaseFile) {
    return this.aiTestGeneratorService.extractRelease(file);
  }

  @Roles(UserRole.ADMIN, UserRole.QA)
  @Post('analyze')
  analyze(@Body() dto: AnalyzeReleaseDto) {
    return this.aiTestGeneratorService.analyze(dto);
  }

  @Roles(UserRole.ADMIN, UserRole.QA)
  @Post('generate')
  generate(@Body() dto: GenerateTestCasesDto, @CurrentUser() user?: AuthenticatedUser) {
    return this.aiTestGeneratorService.generate(dto, user);
  }

  @Roles(UserRole.ADMIN, UserRole.QA)
  @Post('actions')
  runCaseAction(@Body() dto: CaseActionDto) {
    return this.aiTestGeneratorService.runCaseAction(dto);
  }

  @Roles(UserRole.ADMIN, UserRole.QA)
  @Post('save')
  saveCases(@Body() dto: SaveAiTestCasesDto) {
    return this.aiTestGeneratorService.saveCases(dto);
  }

  @Get('history')
  listHistory(@Query() query: PaginationQueryDto) {
    return this.aiTestGeneratorService.listHistory(query);
  }

  @Get('history/:id')
  findHistory(@Param('id', ParseUUIDPipe) id: string) {
    return this.aiTestGeneratorService.findHistory(id);
  }

  @Roles(UserRole.ADMIN, UserRole.QA)
  @Post('history/:id/regenerate')
  regenerate(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user?: AuthenticatedUser) {
    return this.aiTestGeneratorService.regenerate(id, user);
  }

  @Get('settings')
  getSettings() {
    return this.settingsService.getSettings();
  }

  @Roles(UserRole.ADMIN)
  @Put('settings')
  updateSettings(@Body() dto: UpdateAiSettingsDto, @CurrentUser() user?: AuthenticatedUser) {
    return this.settingsService.updateSettings(dto, user?.id);
  }
}
