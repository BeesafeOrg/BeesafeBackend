import { Module } from '@nestjs/common';
import { HiveReportService } from './hive-report.service';
import { HiveReportController } from './hive-report.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HiveReport } from './entities/hive-report.entity';
import { Reward } from './entities/reward.entity';
import { MemberModule } from '../member/member.module';
import { S3Module } from '../../common/s3/s3.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([HiveReport, Reward]),
    MemberModule,
    S3Module,
  ],
  controllers: [HiveReportController],
  providers: [HiveReportService],
})
export class HiveReportModule {}
