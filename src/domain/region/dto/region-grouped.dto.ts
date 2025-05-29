export class DistrictDto {
  districtCode: string;
  district: string;
}

export class RegionGroupedDto {
  city: string;
  districts: DistrictDto[];
}
