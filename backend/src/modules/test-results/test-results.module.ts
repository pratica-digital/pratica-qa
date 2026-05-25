import { Module } from '@nestjs/common';
import { TestCasesModule } from '../test-cases/test-cases.module';
import { TestRunsModule } from '../test-runs/test-runs.module';
import { TestResultsRepository } from './repositories/test-results.repository';
import { TestResultsController } from './test-results.controller';
import { TestResultsService } from './test-results.service';

@Module({
  imports: [TestRunsModule, TestCasesModule],
  controllers: [TestResultsController],
  providers: [TestResultsService, TestResultsRepository],
})
export class TestResultsModule {}
