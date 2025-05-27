import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { firstValueFrom } from 'rxjs';
import { Region } from './entities/region.entity';
import { BusinessException } from '../../common/filters/exception/business-exception';
import { ErrorType } from '../../common/filters/exception/error-code.enum';

interface VworldRow {
  admCode: string;
  admCodeNm: string;
  lowestAdmCodeNm?: string;
}

@Injectable()
export class RegionFetcherService {
  private readonly LOGGER = new Logger(RegionFetcherService.name);
  private readonly BASE_URL = 'https://api.vworld.kr/ned/data/admSiList';

  // 17 개 시·도 코드 테이블
  private readonly sidoCodes = [
    '11',
    '26',
    '27',
    '28',
    '29',
    '30',
    '31',
    '36',
    '41',
    '42',
    '43',
    '44',
    '45',
    '46',
    '47',
    '48',
    '50',
  ];

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    @InjectRepository(Region)
    private readonly regionRepo: Repository<Region>,
  ) {}

  async syncAll() {
    const key = this.configService.getOrThrow<string>('VWORLD_KEY');
    const domain = this.configService.getOrThrow<string>('VWORLD_DOMAIN');

    for (const sido of this.sidoCodes) {
      const rows = await this.fetchSiList(key, domain, sido);
      await this.upsertRows(rows);
      this.LOGGER.log(`[${sido}] ${rows.length} 개 시·군·구 동기화`);
    }
    this.LOGGER.log('Region table synced with VWorld');
  }

  private async fetchSiList(
    key: string,
    domain: string,
    siCode: string,
  ): Promise<VworldRow[]> {
    const params = {
      key,
      domain,
      admCode: siCode,
      format: 'json',
      numOfRows: 1000,
      pageNo: 1,
    };

    let { data } = await firstValueFrom(
      this.httpService.get(this.BASE_URL, { params }),
    );
    data = data.admVOList;

    if (data?.error.length > 0) {
      throw new BusinessException(
        ErrorType.REGION_OPEN_API_ERROR,
        `${data?.error} >> ${data?.message}`,
      );
    }
    return (data?.admVOList as VworldRow[]) ?? [];
  }

  private async upsertRows(rows: VworldRow[]) {
    const entities = rows.map((r) => this.normalizeRow(r));
    await this.regionRepo.upsert(entities, ['code']);
  }

  private normalizeRow(r: VworldRow) {
    const code = r.admCode.padStart(5, '0');
    const parts = r.admCodeNm.trim().split(/\s+/);

    const city = parts[0]; // 시/도
    const district = parts.slice(1).join(' ') || ''; // 시·군·구

    return { code, city, district };
  }
}
