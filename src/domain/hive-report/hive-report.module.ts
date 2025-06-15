import { Module } from '@nestjs/common';
import { HiveReportService } from './hive-report.service';
import { HiveReportController } from './hive-report.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HiveReport } from './entities/hive-report.entity';
import { Reward } from './entities/reward.entity';
import { MemberModule } from '../member/member.module';
import { S3Module } from '../../common/s3/s3.module';
import { OpenaiModule } from '../../common/openai/openai.module';
import { RegionModule } from '../region/region.module';
import { HiveAction } from './entities/hive-action.entity';
import { FcmService } from '../../common/fcm/fcm.service';
import { NaverMapModule } from '../../common/naver-map/naver-map.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([HiveReport, Reward, HiveAction]),
    MemberModule,
    S3Module,
    OpenaiModule,
    RegionModule,
    NaverMapModule,
  ],
  controllers: [HiveReportController],
  providers: [HiveReportService, FcmService],
})
export class HiveReportModule {}
