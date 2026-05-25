import { Module } from '@nestjs/common';
import { TestSuitesModule } from '../test-suites/test-suites.module';
import { TestCasesRepository } from './repositories/test-cases.repository';
import { TestCasesController } from './test-cases.controller';
import { TestCasesService } from './test-cases.service';

@Module({
  imports: [TestSuitesModule],
  controllers: [TestCasesController],
  providers: [TestCasesService, TestCasesRepository],
  exports: [TestCasesService, TestCasesRepository],
})
export class TestCasesModule {}
