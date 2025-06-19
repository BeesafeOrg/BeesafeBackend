import { HiveReportDetailResponseDto } from './hive-report-detail-response.dto';
import { PickType } from '@nestjs/swagger';

export class HiveReportPinDto extends PickType(HiveReportDetailResponseDto, [
  'hiveReportId',
  'latitude',
  'longitude',
  'species',
]) {}
