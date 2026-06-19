import { Module } from '@nestjs/common';
import { ReportsRepository } from './repositories/reports.repository';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';

@Module({
  controllers: [ReportsController],
  providers: [ReportsService, ReportsRepository],
})
export class ReportsModule {}
