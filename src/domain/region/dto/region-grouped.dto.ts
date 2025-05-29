import { PickType } from '@nestjs/mapped-types';
import { DistrictCodeDto } from '../../member/dto/update-interest-area.dto';

export class DistrictDto extends PickType(DistrictCodeDto, [
  'districtCode',
] as const) {
  district: string;
}

export class RegionGroupedDto {
  city: string;
  districts: DistrictDto[];
}
