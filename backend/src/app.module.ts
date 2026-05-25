import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { validateEnv } from './config/env.validation';
import { HealthModule } from './health/health.module';
import { ProjectsModule } from './modules/projects/projects.module';
import { TestCasesModule } from './modules/test-cases/test-cases.module';
import { TestPlansModule } from './modules/test-plans/test-plans.module';
import { TestResultsModule } from './modules/test-results/test-results.module';
import { TestRunsModule } from './modules/test-runs/test-runs.module';
import { TestSuitesModule } from './modules/test-suites/test-suites.module';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnv,
    }),
    PrismaModule,
    HealthModule,
    ProjectsModule,
    TestSuitesModule,
    TestCasesModule,
    TestPlansModule,
    TestRunsModule,
    TestResultsModule,
  ],
})
export class AppModule {}
