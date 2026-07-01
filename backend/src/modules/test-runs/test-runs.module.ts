import { Module } from '@nestjs/common';
import { ShortcutModule } from '../../shortcut/shortcut.module';
import { TestPlansModule } from '../test-plans/test-plans.module';
import { TestSuitesModule } from '../test-suites/test-suites.module';
import { UsersModule } from '../users/users.module';
import { TestRunsRepository } from './repositories/test-runs.repository';
import { TestRunsController } from './test-runs.controller';
import { TestRunsService } from './test-runs.service';

@Module({
  imports: [TestPlansModule, TestSuitesModule, UsersModule, ShortcutModule],
  controllers: [TestRunsController],
  providers: [TestRunsService, TestRunsRepository],
  exports: [TestRunsService, TestRunsRepository],
})
export class TestRunsModule {}
