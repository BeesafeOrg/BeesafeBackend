import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class DistrictCodeDto {
  @IsString()
  @ApiProperty({
    description: '법정동 코드',
    example: '11110',
  })
  districtCode: string;
}

export class UpdateInterestAreaDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(3)
  @ValidateNested({ each: true })
  @Type(() => DistrictCodeDto)
  @ApiProperty({
    description: '관심 지역 리스트',
    type: [DistrictCodeDto],
    example: [{ districtCode: '11110' }, { districtCode: '11140' }],
  })
  areas: DistrictCodeDto[];
}
