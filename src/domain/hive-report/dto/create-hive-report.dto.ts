import {
  IsEnum,
  IsLatitude,
  IsLongitude,
  IsNotEmpty,
  IsString,
} from 'class-validator';
import { Species } from '../constant/species.enum';
import { ApiProperty } from '@nestjs/swagger';

export class CreateHiveReportDto {
  @ApiProperty({
    description: '벌집신고서 고유 아이디',
    example: '7b0c2665-ada0-4516-89a7-74a0d3c784d2',
  })
  @IsString()
  @IsNotEmpty()
  hiveReportId: string;

  @ApiProperty({
    description: '사용자가 선택한 벌집 종류',
    example: 'WASP',
  })
  @IsEnum(Species)
  species: Species;

  @ApiProperty({
    description: '벌집 위치 (사용자 현위치 - 위도)',
    example: 37.539182,
  })
  @IsLatitude()
  latitude: number;

  @ApiProperty({
    description: '벌집 위치 (사용자 현위치 - 경도)',
    example: 37.539182,
  })
  @IsLongitude()
  longitude: number;
}
