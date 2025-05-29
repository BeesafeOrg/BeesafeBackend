import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsNotEmpty,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class DistrictCodeDto {
  @IsNotEmpty()
  @IsString()
  districtCode: string;
}

export class UpdateInterestAreaDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(3)
  @ValidateNested({ each: true })
  @Type(() => DistrictCodeDto)
  areas: DistrictCodeDto[];
}
