import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Region } from '../entities/region.entity';
import { Repository } from 'typeorm';
import { REGION_SEEDS } from './region-seed-data';

@Injectable()
export class RegionSeedService {
  constructor(
    @InjectRepository(Region)
    private readonly regionRepo: Repository<Region>,
  ) {}

  async sync() {
    await this.regionRepo
      .createQueryBuilder()
      .insert()
      .into(Region)
      .values(REGION_SEEDS)
      .orUpdate(['city', 'district'], ['districtCode'])
      .execute();

    await this.regionRepo
      .createQueryBuilder()
      .delete()
      .where('districtCode NOT IN (:...districtCodes)', {
        districtCodes: REGION_SEEDS.map((region) => region.districtCode),
      })
      .execute();
  }
}
