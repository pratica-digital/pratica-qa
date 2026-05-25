import { Module } from '@nestjs/common';
import { TestPlansModule } from '../test-plans/test-plans.module';
import { TestSuitesModule } from '../test-suites/test-suites.module';
import { TestRunsRepository } from './repositories/test-runs.repository';
import { TestRunsController } from './test-runs.controller';
import { TestRunsService } from './test-runs.service';

@Module({
  imports: [TestPlansModule, TestSuitesModule],
  controllers: [TestRunsController],
  providers: [TestRunsService, TestRunsRepository],
  exports: [TestRunsService, TestRunsRepository],
})
export class TestRunsModule {}
