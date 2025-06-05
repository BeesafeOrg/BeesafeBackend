import { OmitType } from '@nestjs/mapped-types';
import { HiveReportResponseDto } from './hive-report-response.dto';

export class ActorSummaryDto {
  memberId: string;
  nickname: string | null;
}

export class HiveReportDetailResponseDto extends OmitType(
  HiveReportResponseDto,
  ['hiveActionId'],
) {
  isMe: boolean;
  reporter: ActorSummaryDto | null;
  beekeeper: ActorSummaryDto | null;
  latitude: number;
  longitude: number;
  imageUrl: string;
}
