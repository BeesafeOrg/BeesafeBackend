import { HiveReportStatus } from '../constant/hive-report-status.enum';

export class HiveProofResponseDto {
  hiveReportId: string;
  actionId: string;
  rewardId: string;
  status: HiveReportStatus;
  imageUrl: string;
}
