import { HiveReportResponseDto } from './hive-report-response.dto';
import { ApiProperty, OmitType } from '@nestjs/swagger';

export class ActorSummaryDto {
  memberId: string;
  nickname: string | null;
}

export class HiveReportDetailResponseDto extends OmitType(
  HiveReportResponseDto,
  ['hiveActionId'],
) {
  @ApiProperty({
    description: '조회한 사용자 본인의 벌집신고서인지 여부',
    example: true,
  })
  isMe: boolean;

  @ApiProperty({
    description: '벌집신고서를 업로드한 사용자 정보',
    type: ActorSummaryDto,
  })
  reporter: ActorSummaryDto | null;

  @ApiProperty({
    description: '벌집신고서를 예약 혹은 제거한 사용자 정보',
    type: ActorSummaryDto,
  })
  beekeeper: ActorSummaryDto | null;

  @ApiProperty({
    description: '벌집 위치 (사용자 현위치 - 위도)',
    example: 37.539182,
  })
  latitude: number;

  @ApiProperty({
    description: '벌집 위치 (사용자 현위치 - 경도)',
    example: 127.074711,
  })
  longitude: number;

  @ApiProperty({
    description: '벌집신고서 사진 s3 url',
    example: 'https://....jpg',
  })
  imageUrl: string;
}
