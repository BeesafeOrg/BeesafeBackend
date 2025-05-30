import { PickType } from '@nestjs/mapped-types';
import { DistrictCodeDto } from '../../member/dto/update-interest-area.dto';
import { ApiProperty } from '@nestjs/swagger';

export class DistrictDto extends PickType(DistrictCodeDto, [
  'districtCode',
] as const) {
  @ApiProperty({
    description: '시/군/구',
    example: '종로구',
  })
  district: string;
}

export class RegionGroupedDto {
  @ApiProperty({
    description: '시/구',
    example: '서울특별시',
  })
  city: string;

  @ApiProperty({
    description: '지역 정보 리스트',
    type: [DistrictCodeDto],
    example: [{ districtCode: '11110', district: '종로구' }, { districtCode: '11140', district: '중구' }],
  })
  districts: DistrictDto[];
}
