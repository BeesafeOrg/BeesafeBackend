import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { BusinessException } from '../filters/exception/business-exception';
import { ErrorType } from '../filters/exception/error-code.enum';

type Result = {
  name: string;
  code: { id: string };
  region: {
    area1: { name: string };
    area2: { name: string };
    area3?: { name: string };
  };
  land?: {
    name: string;
    number1?: string;
    number2?: string;
    addition0?: { value: string };
  };
};

interface ReverseGeocodeResp {
  results: Result[];
}

interface ReverseGeocodeResp {
  results: Result[];
}

@Injectable()
export class NaverMapService {
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly baseUrl =
    'https://maps.apigw.ntruss.com/map-reversegeocode/v2/gc';

  constructor(
    private readonly http: HttpService,
    cfg: ConfigService,
  ) {
    this.clientId = cfg.get('NAVER_CLIENT_ID')!;
    this.clientSecret = cfg.get('NAVER_CLIENT_SECRET')!;
  }

  async reverseGeocodeWithAddress(
    lat: number,
    lng: number,
  ): Promise<{ districtCode: string; address: string }> {
    const coords = `${lng},${lat}`; // "경도,위도" 주의
    const orders = ['legalcode', 'roadaddr', 'addr'].join(',');
    const url = `${this.baseUrl}?coords=${coords}&orders=${orders}&output=json`;

    let data: ReverseGeocodeResp;
    try {
      const { data: d } = await firstValueFrom(
        this.http.get<ReverseGeocodeResp>(url, {
          headers: this.getAuthHeaders(),
        }),
      );
      data = d;
    } catch (e) {
      throw new BusinessException(
        ErrorType.NAVER_MAP_API_ERROR,
        `ReverseGeocode API error: ${(e as any).message}`,
      );
    }

    if (!data.results?.length) {
      throw new BusinessException(ErrorType.GEOCODE_NOT_FOUND);
    }

    const legal = data.results.find((r) => r.name === 'legalcode');
    if (!legal)
      throw new BusinessException(
        ErrorType.GEOCODE_NOT_FOUND,
        'legalcode not found (available naver map api)',
      );
    const districtCode = legal.code.id.slice(0, 5); // 11215 (광진구)

    const roadRow = data.results.find((r) => r.name === 'roadaddr');
    const lotRow = data.results.find((r) => r.name === 'addr');

    let address: string;
    if (roadRow && roadRow.land?.name && roadRow.land.number1) {
      address = this.composeRoadAddr(roadRow, lotRow);
    } else if (lotRow) {
      address = this.composeLotAddr(lotRow);
    } else {
      throw new BusinessException(
        ErrorType.GEOCODE_NOT_FOUND,
        'roadAddr and jibunAddr all not found (available naver map api)',
      );
    }

    return { districtCode, address };
  }

  private composeRoadAddr(road: Result, lot?: Result): string {
    const { region, land } = road;
    if (!land) return '';

    const num = land.number1 + (land.number2 ? `-${land.number2}` : '');
    const base = `${region.area1.name} ${region.area2.name} ${land.name} ${num}`;

    const dongName = lot?.land?.name;
    const building = land.addition0?.value;
    const extras = [dongName, building].filter(Boolean).join(', ');
    return extras ? `${base} (${extras})` : base;
  }

  private composeLotAddr(lot: Result): string {
    const { region, land } = lot;
    const dong = region.area3?.name || land?.name || '';
    const num1 = land?.number1 ?? '';
    const num2 = land?.number2 ? `-${land.number2}` : '';
    return `${region.area1.name} ${region.area2.name} ${dong} ${num1}${num2}`;
  }

  private getAuthHeaders() {
    return {
      'X-NCP-APIGW-API-KEY-ID': this.clientId,
      'X-NCP-APIGW-API-KEY': this.clientSecret,
    };
  }
}
