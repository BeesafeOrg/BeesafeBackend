import { EntityManager } from 'typeorm';
import { HiveReportStatus } from '../../hive-report/constant/hive-report-status.enum';
import { Species } from '../../hive-report/constant/species.enum';
import { Region } from '../../region/entities/region.entity';
import { Member } from '../entities/member.entity';
import { HiveReport } from '../../hive-report/entities/hive-report.entity';
import { HiveActionType } from '../../hive-report/constant/hive-actions-type.enum';

export async function createReportWithReporterAction(
  mgr: EntityManager,
  params: {
    lat: number;
    lon: number;
    address: string;
    imageUrl: string;
    species: Species;
    status: HiveReportStatus;
    region: Region;
    reporter: Member;
  },
) {
  const reportRepo = mgr.getRepository(HiveReport);

  const report = reportRepo.create({
    latitude: params.lat,
    longitude: params.lon,
    address: params.address,
    imageUrl: params.imageUrl,
    species: params.species,
    status: params.status,
    region: params.region,
    actions: [
      {
        actionType: HiveActionType.REPORT,
        member: params.reporter,
        latitude: params.lat,
        longitude: params.lon,
        imageUrl: params.imageUrl,
      },
    ],
  });

  return await reportRepo.save(report);
}