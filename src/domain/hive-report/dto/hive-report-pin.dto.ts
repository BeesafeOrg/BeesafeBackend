import { PickType } from '@nestjs/mapped-types';
import { HiveReportDetailResponseDto } from './hive-report-detail-response.dto';

export class HiveReportPinDto extends PickType(HiveReportDetailResponseDto, [
  'hiveReportId',
  'latitude',
  'longitude',
  'species',
]) {}
