import { IsIn, IsOptional } from 'class-validator';

export const DASHBOARD_PERIODS = ['30d', '90d', '6m', '12m'] as const;

export type DashboardPeriod = (typeof DASHBOARD_PERIODS)[number];

export class QueryDashboardAnalyticsDto {
  @IsOptional()
  @IsIn(DASHBOARD_PERIODS)
  period: DashboardPeriod = '12m';
}
