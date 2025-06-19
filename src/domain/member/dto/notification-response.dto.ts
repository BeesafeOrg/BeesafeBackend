import { NotificationType } from '../constant/notification-type.enum';
import { ApiProperty } from '@nestjs/swagger';

export class NotificationItemDto {
  @ApiProperty({
    description: '알림 고유 아이디',
    example: '7b0c2665-ada0-4516-89a7-74a0d3c784d2',
  })
  id: string;

  @ApiProperty({
    description: '벌집신고서 고유 아이디',
    example: '7b0c2665-ada0-4516-89a7-74a0d3c784d2',
  })
  hiveReportId: string;

  @ApiProperty({
    description: '알림 내용',
    example: '7b0c2665-ada0-4516-89a7-74a0d3c784d2',
  })
  contents: string;

  @ApiProperty({
    description: '알림 종류',
    enum: NotificationType,
    example: NotificationType.HONEYBEE_REPORTED,
  })
  type: NotificationType;

  @ApiProperty({
    description: '벌집신고서 주소(도로명 or 지번)',
    example: '서울특별시 광진구 능동로 120-1 (화양동, 건국대학교병원)',
  })
  roadAddress: string;

  @ApiProperty({
    description: '알림 읽음 여부',
    example: true,
  })
  isRead: boolean;

  @ApiProperty({
    description: '알림 발생 날짜 정보',
    example: '2025-06-07T07:46:31.716Z',
  })
  sentAt: Date;
}
