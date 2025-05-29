export class DistrictDto {
  code: string;
  district: string;
}

export class RegionGroupedDto {
  city: string;
  districts: DistrictDto[];
}
