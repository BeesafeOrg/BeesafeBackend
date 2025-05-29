import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { firstValueFrom } from 'rxjs';
import { Region } from './entities/region.entity';
import { BusinessException } from '../../common/filters/exception/business-exception';
import { ErrorType } from '../../common/filters/exception/error-code.enum';
import { Cron, Timeout } from '@nestjs/schedule';
import axios, { AxiosInstance } from 'axios';
import * as rax from 'retry-axios';
import { Agent as HttpsAgent } from 'https';

interface VworldRow {
  admCode: string;
  admCodeNm: string;
  lowestAdmCodeNm?: string;
}

@Injectable()
export class RegionFetcherService {
  private readonly LOGGER = new Logger(RegionFetcherService.name);
  private readonly BASE_URL = 'https://api.vworld.kr/ned/data/admSiList';
  private readonly LOG = new Logger(RegionFetcherService.name);
  private readonly api: AxiosInstance;

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
  ) {
    this.api = axios.create({
      baseURL: 'https://api.vworld.kr',
      timeout: 10000,
      httpsAgent: new HttpsAgent({
        keepAlive: false,
        maxSockets: 100,
        family: 4,
      }),
      headers: {
        Referer: `https://${configService.getOrThrow('VWORLD_DOMAIN')}`,
        Origin: `https://${configService.getOrThrow('VWORLD_DOMAIN')}`,
      },
    });

    rax.attach(this.api);
    this.api.defaults.raxConfig = {
      retry: 3,
      retryDelay: 1_000,
      statusCodesToRetry: [
        [429, 429],
        [500, 599],
      ],
    };
  }

  @Timeout(10_000)
  async seedAtBoot() {
    this.LOG.log('Initial region sync…');
    await this.syncAll();
  }

  /** 매주 월요일 03:30 KST */
  @Cron('30 3 * * 1', { timeZone: 'Asia/Seoul' })
  async weeklySync() {
    this.LOG.log('Weekly region sync…');
    await this.syncAll();
  }

  private async syncAll() {
    const key = this.configService.getOrThrow<string>('VWORLD_KEY');
    const domain = this.configService.getOrThrow<string>('VWORLD_DOMAIN');

    let length = 0;
    for (const sido of this.sidoCodes) {
      const rows = await this.fetchSiList(key, domain, sido);
      await this.upsertRows(rows);
      length += rows.length;
    }
    this.LOGGER.log(`Region table synced with VWorld [total: ${length}]`);
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

    if (data?.error?.length) {
      console.error(`${data.error} >> ${data.message}`);
      throw new BusinessException(
        ErrorType.REGION_OPEN_API_ERROR,
        `${data.error} >> ${data.message}`,
      );
    }

    return (data?.admVOList as VworldRow[]) ?? [];
  }

  private async upsertRows(rows: VworldRow[]) {
    const entities = rows.map((r) => this.normalizeRow(r));
    await this.regionRepo.upsert(entities, ['districtCode']);
  }

  private normalizeRow(r: VworldRow) {
    const districtCode = r.admCode.padStart(5, '0');
    const parts = r.admCodeNm.trim().split(/\s+/);

    const city = parts[0]; // 시/도
    const district = parts.slice(1).join(' ') || ''; // 시·군·구

    return { districtCode, city, district };
  }
}
