import { Module } from '@nestjs/common';
import { TestCasesModule } from '../test-cases/test-cases.module';
import { AiTestGeneratorController } from './ai-test-generator.controller';
import { AiTestGeneratorService } from './ai-test-generator.service';
import { AiConfigurationRepository } from './repositories/ai-configuration.repository';
import { AiGenerationRepository } from './repositories/ai-generation.repository';
import { AiJsonService } from './services/ai-json.service';
import { AiPromptBuilderService } from './services/ai-prompt-builder.service';
import { AiSettingsService } from './services/ai-settings.service';
import { LLMService } from './services/llm.service';
import { OpenRouterClientService } from './services/openrouter-client.service';
import { OpenRouterErrorService } from './services/openrouter-error.service';
import { OpenRouterHttpService } from './services/openrouter-http.service';
import { OpenRouterResponseParserService } from './services/openrouter-response-parser.service';
import { OpenRouterRetryService } from './services/openrouter-retry.service';
import { ReleaseNotesExtractorService } from './services/release-notes-extractor.service';

@Module({
  imports: [TestCasesModule],
  controllers: [AiTestGeneratorController],
  providers: [
    AiTestGeneratorService,
    AiSettingsService,
    LLMService,
    OpenRouterClientService,
    OpenRouterErrorService,
    OpenRouterHttpService,
    OpenRouterResponseParserService,
    OpenRouterRetryService,
    AiJsonService,
    AiPromptBuilderService,
    ReleaseNotesExtractorService,
    AiGenerationRepository,
    AiConfigurationRepository,
  ],
  exports: [LLMService, AiTestGeneratorService],
})
export class AiTestGeneratorModule {}
