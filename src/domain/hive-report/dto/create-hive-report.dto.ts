import { IsEnum, IsNotEmpty, IsNumber, IsString } from 'class-validator';
import { Species } from '../constant/species.enum';

export class CreateHiveReportDto {
  @IsString()
  @IsNotEmpty()
  hiveReportId: string;

  @IsEnum(Species)
  species: Species;

  @IsNumber()
  latitude: number;

  @IsNumber()
  longitude: number;

  @IsString()
  roadAddress: string;

  @IsString()
  districtCode: string;
}
