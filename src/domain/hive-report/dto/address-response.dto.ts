import { PickType } from '@nestjs/swagger';
import { HiveReportResponseDto } from './hive-report-response.dto';

export class AddressResponseDto extends PickType(HiveReportResponseDto, [
  'address',
]) {}
