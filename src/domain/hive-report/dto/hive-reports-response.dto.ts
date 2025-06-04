import { Species } from '../constant/species.enum';
import { HiveReportStatus } from '../constant/hive-report-status.enum';

export class HiveReportsResponseDto {
  hiveReportId: string;
  species: Species;
  status: HiveReportStatus;
  roadAddress: string;
  createdAt: Date;
}
