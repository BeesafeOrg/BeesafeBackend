import { Species } from '../constant/species.enum';
import { HiveReportStatus } from '../constant/hive-report-status.enum';
import { ApiProperty } from '@nestjs/swagger';

export class HiveReportResponseDto {
  @ApiProperty({
    description: '벌집신고서 고유 아이디',
    example: '7b0c2665-ada0-4516-89a7-74a0d3c784d2',
  })
  hiveReportId: string;

  @ApiProperty({
    description: '사용자 액션 고유 아이디',
    example: '7b0c2665-ada0-4516-89a7-74a0d3c784d2',
  })
  hiveActionId?: string;

  @ApiProperty({
    description: '사용자가 벌집 신고할 때 선택한 벌집 종류',
    enum: Species,
    example: Species.HONEYBEE,
  })
  species: Species;

  @ApiProperty({
    description: '벌집신고서 상태 정보',
    enum: HiveReportStatus,
    example: HiveReportStatus.REPORTED,
  })
  status: HiveReportStatus;

  @ApiProperty({
    description: '벌집신고서 주소(도로명 or 지번)',
    example: '서울특별시 광진구 능동로 120-1 (화양동, 건국대학교병원)',
  })
  address: string;

  @ApiProperty({
    description: '벌집신고서 업로드 날짜 정보',
    example: '2025-06-07T07:46:31.716Z',
  })
  createdAt: Date;
}
