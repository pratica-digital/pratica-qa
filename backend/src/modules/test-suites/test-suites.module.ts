import { Module } from '@nestjs/common';
import { ProjectsModule } from '../projects/projects.module';
import { TestSuitesRepository } from './repositories/test-suites.repository';
import { TestSuitesController } from './test-suites.controller';
import { TestSuitesService } from './test-suites.service';

@Module({
  imports: [ProjectsModule],
  controllers: [TestSuitesController],
  providers: [TestSuitesService, TestSuitesRepository],
  exports: [TestSuitesService, TestSuitesRepository],
})
export class TestSuitesModule {}
