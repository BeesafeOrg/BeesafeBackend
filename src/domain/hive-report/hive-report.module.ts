import { Module } from '@nestjs/common';
import { HiveReportService } from './hive-report.service';
import { HiveReportController } from './hive-report.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HiveReport } from './entities/hive-report.entity';
import { Reward } from './entities/reward.entity';

@Module({
  imports: [TypeOrmModule.forFeature([HiveReport, Reward])],
  controllers: [HiveReportController],
  providers: [HiveReportService],
})
export class HiveReportModule {}
