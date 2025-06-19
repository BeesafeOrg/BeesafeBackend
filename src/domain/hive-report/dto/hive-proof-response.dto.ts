import { HiveReportStatus } from '../constant/hive-report-status.enum';
import { ApiProperty } from '@nestjs/swagger';

export class HiveProofResponseDto {
  @ApiProperty({
    description: '벌집신고서 고유 아이디',
    example: '7b0c2665-ada0-4516-89a7-74a0d3c784d2',
  })
  hiveReportId: string;

  @ApiProperty({
    description: '사용자 액션 고유 아이디',
    example: '7b0c2665-ada0-4516-89a7-74a0d3c784d3',
  })
  actionId: string;

  @ApiProperty({
    description: '사용자 보상 고유 아이디',
    example: '7b0c2665-ada0-4516-89a7-74a0d3c784d4',
  })
  rewardId: string;

  @ApiProperty({
    enum: [HiveReportStatus],
    example: HiveReportStatus.REMOVED,
  })
  status: HiveReportStatus;

  @ApiProperty({
    description: '벌집신고서 사진 s3 url',
    example: 'https://....jpg',
  })
  imageUrl: string;
}
