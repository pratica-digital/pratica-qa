import { Module } from '@nestjs/common';
import { ShortcutModule } from '../../shortcut/shortcut.module';
import { TestCasesModule } from '../test-cases/test-cases.module';
import { TestRunsModule } from '../test-runs/test-runs.module';
import { TestResultsRepository } from './repositories/test-results.repository';
import { TestResultsController } from './test-results.controller';
import { TestResultsService } from './test-results.service';

@Module({
  imports: [TestRunsModule, TestCasesModule, ShortcutModule],
  controllers: [TestResultsController],
  providers: [TestResultsService, TestResultsRepository],
})
export class TestResultsModule {}
