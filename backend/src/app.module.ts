import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { AuthModule } from './auth/auth.module';
import { FirstAccessGuard } from './auth/guards/first-access.guard';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import { RolesGuard } from './auth/guards/roles.guard';
import { validateEnv } from './config/env.validation';
import { HealthModule } from './health/health.module';
import { AiTestGeneratorModule } from './modules/ai-test-generator/ai-test-generator.module';
import { ProjectsModule } from './modules/projects/projects.module';
import { ReportsModule } from './modules/reports/reports.module';
import { TestCasesModule } from './modules/test-cases/test-cases.module';
import { TestPlansModule } from './modules/test-plans/test-plans.module';
import { TestResultsModule } from './modules/test-results/test-results.module';
import { TestRunsModule } from './modules/test-runs/test-runs.module';
import { TestSuitesModule } from './modules/test-suites/test-suites.module';
import { UsersModule } from './modules/users/users.module';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: ['.env', 'backend/.env'],
      isGlobal: true,
      validate: validateEnv,
    }),
    PrismaModule,
    AuthModule,
    UsersModule,
    HealthModule,
    AiTestGeneratorModule,
    ProjectsModule,
    ReportsModule,
    TestSuitesModule,
    TestCasesModule,
    TestPlansModule,
    TestRunsModule,
    TestResultsModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: FirstAccessGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
  ],
})
export class AppModule {}
