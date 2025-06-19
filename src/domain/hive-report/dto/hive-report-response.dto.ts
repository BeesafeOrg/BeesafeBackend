import { Species } from '../constant/species.enum';
import { HiveReportStatus } from '../constant/hive-report-status.enum';

export class HiveReportResponseDto {
  hiveReportId: string;
  hiveActionId?: string;
  species: Species;
  status: HiveReportStatus;
  address: string;
  createdAt: Date;
}
