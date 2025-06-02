import { Injectable } from '@nestjs/common';
import { DistrictDto, RegionGroupedDto } from './dto/region-grouped.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Region } from './entities/region.entity';
import { Repository } from 'typeorm';
import { RedisService } from '../../common/redis/redis.service';
import { BusinessException } from '../../common/filters/exception/business-exception';
import { ErrorType } from '../../common/filters/exception/error-code.enum';

@Injectable()
export class RegionService {
  constructor(
    @InjectRepository(Region)
    private readonly regionRepo: Repository<Region>,
    private readonly redisService: RedisService,
  ) {}

  private readonly CACHE_KEY = 'regions-grouped';
  private readonly TTL_SEC = 60 * 60 * 24; // 24 h

  async findAll(): Promise<RegionGroupedDto[]> {
    const cached = await this.redisService.get<RegionGroupedDto[]>(
      this.CACHE_KEY,
    );
    if (cached) {
      return cached;
    }

    const rows = await this.regionRepo.find({
      order: { city: 'ASC', district: 'ASC' },
    });

    const map = new Map<string, DistrictDto[]>();
    for (const { districtCode, city, district } of rows) {
      if (!map.has(city)) {
        map.set(city, []);
      }
      map.get(city)?.push({ districtCode, district });
    }

    const grouped = [...map.entries()].map(([city, districts]) => ({
      city,
      districts,
    }));

    await this.redisService.set(this.CACHE_KEY, grouped, { ttl: this.TTL_SEC });
    return grouped;
  }

  async findByDistrictCode(districtCode: string): Promise<Region> {
    const region = await this.regionRepo.findOne({
      where: { districtCode },
    });
    if (!region) {
      throw new BusinessException(ErrorType.INVALID_REGION_DISTRICT_CODE);
    }
    return region;
  }
}
