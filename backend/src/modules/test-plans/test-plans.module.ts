import { Module } from '@nestjs/common';
import { ProjectsModule } from '../projects/projects.module';
import { TestPlansRepository } from './repositories/test-plans.repository';
import { TestPlansController } from './test-plans.controller';
import { TestPlansService } from './test-plans.service';

@Module({
  imports: [ProjectsModule],
  controllers: [TestPlansController],
  providers: [TestPlansService, TestPlansRepository],
  exports: [TestPlansService, TestPlansRepository],
})
export class TestPlansModule {}
