import { Controller, Get, Query } from '@nestjs/common';
import { QueryDashboardAnalyticsDto } from './dto/query-dashboard-analytics.dto';
import { ReportsService } from './reports.service';

@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('dashboard-analytics')
  getDashboardAnalytics(@Query() query: QueryDashboardAnalyticsDto) {
    return this.reportsService.getDashboardAnalytics(query.period);
  }
}
