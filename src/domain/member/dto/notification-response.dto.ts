import { NotificationType } from '../constant/notification-type.enum';

export class NotificationItemDto {
  id: string;
  hiveReportId: string;
  contents: string;
  type: NotificationType;
  roadAddress: string;
  isRead: boolean;
  sentAt: Date;
}
