import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { BusinessException } from '../filters/exception/business-exception';
import { ErrorType } from '../filters/exception/error-code.enum';

interface ReverseGeocodeResponse {
  results: Array<{
    name: string;
    code: {
      id: string;
    };
    region: {
      area0: { name: string };
      area1: { name: string };
      area2: { name: string; code: string }; // 법정동
      area3: { name: string };
    };
    land: {
      name: string;
      number1: string;
      number2: string;
      addition0?: { value: string }; // 번지정보
    };
    road: { name: string };
  }>;
}

@Injectable()
export class NaverMapService {
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly baseUrl =
    'https://maps.apigw.ntruss.com/map-reversegeocode/v2/gc';

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.clientId = this.configService.get('NAVER_CLIENT_ID')!;
    this.clientSecret = this.configService.get('NAVER_CLIENT_SECRET')!;
  }

  async reverseGeocode(
    lat: number,
    lng: number,
  ): Promise<{
    districtCode: string;
  }> {
    const coords = `${lng},${lat}`;
    const orders = ['admcode', 'roadaddr'].join(',');
    const url = `${this.baseUrl}?coords=${coords}&orders=${orders}&output=json`;

    const headers = {
      'X-NCP-APIGW-API-KEY-ID': this.clientId,
      'X-NCP-APIGW-API-KEY': this.clientSecret,
    };

    let resp: ReverseGeocodeResponse;
    try {
      const { data } = await firstValueFrom(
        this.httpService.get<ReverseGeocodeResponse>(url, { headers }),
      );
      resp = data;
    } catch (e) {
      throw new BusinessException(
        ErrorType.NAVER_MAP_API_ERROR,
        `Naver Reverse Geocode API error: ${
          (e as any).response?.data?.message || e.message
        }`,
      );
    }

    if (!resp.results?.length) {
      throw new BusinessException(ErrorType.GEOCODE_NOT_FOUND);
    }

    const adm = resp.results.find((r) => r.name === 'admcode');
    if (!adm) {
      throw new BusinessException(
        ErrorType.GEOCODE_NOT_FOUND,
        'admcode not found',
      );
    }
    const fullCode = adm.code.id as string; // ex. "1121573000"
    return { districtCode: fullCode.substring(0, 5) }; // "11215"
  }
}
