import { Injectable } from '@nestjs/common';
import { Member } from './entities/member.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { CreateMemberDto } from './dto/create-member.dto';
import { BusinessException } from '../../common/filters/exception/business-exception';
import { ErrorType } from '../../common/filters/exception/error-code.enum';
import { MemberRole } from './constant/member-role.enum';
import { Region } from '../region/entities/region.entity';
import { InterestArea } from './entities/interest-area.entity';
import { DistrictCodeDto } from './dto/update-interest-area.dto';
import {
  DistrictDto,
  RegionGroupedDto,
} from '../region/dto/region-grouped.dto';
import { plainToInstance } from 'class-transformer';
import { ConfigService } from '@nestjs/config';
import { HiveReport } from '../hive-report/entities/hive-report.entity';
import { HiveAction } from '../hive-report/entities/hive-action.entity';
import { Reward } from '../hive-report/entities/reward.entity';
import { HiveActionType } from '../hive-report/constant/hive-actions-type.enum';
import { Species } from '../hive-report/constant/species.enum';
import { HiveReportStatus } from '../hive-report/constant/hive-report-status.enum';

@Injectable()
export class MemberService {
  private readonly MAX_AREA = 3;

  constructor(
    private readonly configService: ConfigService,
    @InjectRepository(Member)
    private readonly memberRepo: Repository<Member>,
    private readonly dataSource: DataSource,
  ) {}

  async findByEmail(email: string): Promise<Member | null> {
    return await this.memberRepo.findOne({
      where: { email },
    });
  }

  async findByIdOrThrowException(id: string): Promise<Member> {
    const member = await this.memberRepo.findOne({
      where: { id },
    });
    if (!member) {
      throw new BusinessException(ErrorType.MEMBER_NOT_FOUND);
    }
    return member;
  }

  async save(member: Member): Promise<Member> {
    return await this.memberRepo.save(member);
  }

  async createAndSave(dto: CreateMemberDto): Promise<Member> {
    const newMember = this.memberRepo.create({
      ...dto,
    });
    return await this.save(newMember);
  }

  async setRole(memberId: string, role: MemberRole): Promise<void> {
    const result = await this.memberRepo
      .createQueryBuilder()
      .update(Member)
      .set({ role })
      .where('id = :id AND role IS NULL', { id: memberId })
      .execute();

    if (result.affected === 0) {
      throw new BusinessException(ErrorType.ALREADY_SET_ROLE);
    }
  }

  async setInterestAreas(
    memberId: string,
    areaDtos: DistrictCodeDto[],
  ): Promise<void> {
    if (areaDtos.length === 0 || areaDtos.length > this.MAX_AREA) {
      throw new BusinessException(ErrorType.INVALID_INTEREST_AREA_COUNT);
    }

    await this.dataSource.transaction(async (manager) => {
      const member = await manager.findOne(Member, {
        where: { id: memberId },
        relations: ['interestAreas'],
      });
      if (!member) {
        throw new BusinessException(ErrorType.MEMBER_NOT_FOUND);
      }

      const regions = await manager.findByIds(Region, areaDtos);
      if (regions.length !== areaDtos.length) {
        throw new BusinessException(ErrorType.INVALID_REGION_CODE);
      }

      const current = new Set(
        member.interestAreas.map((ia) => ia.districtCode),
      );
      const incoming = new Set(areaDtos.map((dto) => dto.districtCode));

      const toRemove = member.interestAreas.filter(
        (ia) => !incoming.has(ia.districtCode),
      );
      const toAdd = [...incoming].filter((code) => !current.has(code));

      if (toRemove.length) {
        await manager.remove(InterestArea, toRemove);
      }
      if (toAdd.length) {
        const newEntities = toAdd.map((code) =>
          manager.create(InterestArea, { districtCode: code, member }),
        );
        await manager.save(newEntities);
      }
    });
  }

  async getInterestAreas(memberId: string): Promise<RegionGroupedDto[]> {
    const member = await this.memberRepo.findOne({
      where: { id: memberId },
      relations: ['interestAreas', 'interestAreas.region'],
    });
    if (!member) {
      throw new BusinessException(ErrorType.MEMBER_NOT_FOUND);
    }

    const cityMap = new Map<string, DistrictDto[]>();

    member.interestAreas.forEach((area) => {
      const city = area.region.city;

      const districtDto = plainToInstance(DistrictDto, {
        districtCode: area.districtCode,
        district: area.region.district,
      });

      if (!cityMap.has(city)) {
        cityMap.set(city, [districtDto]);
      } else {
        cityMap.get(city)!.push(districtDto);
      }
    });

    return Array.from(cityMap.entries()).map(([city, districts]) => ({
      city,
      districts: Array.from(
        new Map(districts.map((d) => [d.districtCode, d])).values(),
      ),
    }));
  }

  async seedReporterDefaults(memberId: string) {
    const PREEXISTING_BEEKEEPER_ID = this.configService.get<string>(
      'PREEXISTING_BEEKEEPER_ID',
    );
    const HONEYBEE_IMG =
      'https://regreen-bucket.s3.ap-northeast-2.amazonaws.com/beesafe/constant/honeybee.jpg';
    const WASP_IMG =
      'https://regreen-bucket.s3.ap-northeast-2.amazonaws.com/beesafe/constant/wasp.jpeg';
    const HONEYBEE_REMOVED_IMG =
      'https://regreen-bucket.s3.ap-northeast-2.amazonaws.com/beesafe/constant/honeybee-removed.jpg';
    const WASP_REMOVED_IMG =
      'https://regreen-bucket.s3.ap-northeast-2.amazonaws.com/beesafe/constant/wasp-removed.jpeg';

    await this.dataSource.transaction(async (manager) => {
      const reportRepo = manager.getRepository(HiveReport);
      const actionRepo = manager.getRepository(HiveAction);
      const rewardRepo = manager.getRepository(Reward);

      const member = await manager
        .getRepository(Member)
        .findOneOrFail({ where: { id: memberId } });
      const beekeeper = await manager
        .getRepository(Member)
        .findOneOrFail({ where: { id: PREEXISTING_BEEKEEPER_ID } });

      const region1 = await manager.getRepository(Region).findOneOrFail({
        where: { districtCode: '11140' },
      });
      const region2 = await manager.getRepository(Region).findOneOrFail({
        where: { districtCode: '11680' },
      });
      const region3 = await manager.getRepository(Region).findOneOrFail({
        where: { districtCode: '11440' },
      });
      const region4 = await manager.getRepository(Region).findOneOrFail({
        where: { districtCode: '11710' },
      });
      const region5 = await manager.getRepository(Region).findOneOrFail({
        where: { districtCode: '11350' },
      });

      // 1) 꿀벌집 신고서 3개 (REPORTED, RESERVED, REMOVED)
      //  a) REPORTED
      const hb1 = await reportRepo.save(
        reportRepo.create({
          latitude: 37.5665,
          longitude: 126.978,
          roadAddress: '서울특별시 중구 세종대로 110',
          region: region1,
          species: Species.HONEYBEE,
          status: HiveReportStatus.REPORTED,
          imageUrl: HONEYBEE_IMG,
        }),
      );
      await actionRepo.save(
        actionRepo.create({
          hiveReport: hb1,
          member,
          latitude: 37.5665,
          longitude: 126.978,
          actionType: HiveActionType.REPORT,
          imageUrl: HONEYBEE_IMG,
        }),
      );

      //  b) RESERVED
      const hb2 = await reportRepo.save(
        reportRepo.create({
          latitude: 37.4979,
          longitude: 127.0276,
          roadAddress: '서울특별시 강남구 강남대로 396',
          region: region2,
          species: Species.HONEYBEE,
          status: HiveReportStatus.RESERVED,
          imageUrl: HONEYBEE_IMG,
        }),
      );
      await actionRepo.save(
        actionRepo.create({
          hiveReport: hb2,
          member,
          latitude: 37.4979,
          longitude: 127.0276,
          actionType: HiveActionType.REPORT,
          imageUrl: HONEYBEE_IMG,
        }),
      );
      await actionRepo.save(
        actionRepo.create({
          hiveReport: hb2,
          member: beekeeper,
          actionType: HiveActionType.RESERVE,
        }),
      );

      //  c) REMOVED
      const hb3 = await reportRepo.save(
        reportRepo.create({
          latitude: 37.5563,
          longitude: 126.9236,
          roadAddress: '서울특별시 마포구 양화로 160',
          region: region3,
          species: Species.HONEYBEE,
          status: HiveReportStatus.REMOVED,
          imageUrl: HONEYBEE_IMG,
        }),
      );
      await actionRepo.save(
        actionRepo.create({
          hiveReport: hb3,
          member,
          latitude: 37.5563,
          longitude: 126.9236,
          actionType: HiveActionType.REPORT,
          imageUrl: HONEYBEE_IMG,
        }),
      );
      await actionRepo.save(
        actionRepo.create({
          hiveReport: hb3,
          member: beekeeper,
          actionType: HiveActionType.RESERVE,
        }),
      );
      const rmHb3 = await actionRepo.save(
        actionRepo.create({
          hiveReport: hb3,
          member: beekeeper,
          latitude: 37.5563,
          longitude: 126.9236,
          actionType: HiveActionType.HONEYBEE_PROOF,
          imageUrl: HONEYBEE_REMOVED_IMG,
        }),
      );
      await rewardRepo.save(
        rewardRepo.create({
          action: rmHb3,
          member,
          points: 100,
        }),
      );

      // 2) 말벌집 신고서 2개 (REPORTED, REMOVED)
      //  a) REPORTED
      const wb1 = await reportRepo.save(
        reportRepo.create({
          latitude: 37.515,
          longitude: 127.0726,
          roadAddress: '서울특별시 송파구 올림픽로 25',
          region: region4,
          species: Species.WASP,
          status: HiveReportStatus.REPORTED,
          imageUrl: WASP_IMG,
        }),
      );
      await actionRepo.save(
        actionRepo.create({
          hiveReport: wb1,
          member,
          latitude: 37.515,
          longitude: 127.0726,
          actionType: HiveActionType.REPORT,
          imageUrl: WASP_IMG,
        }),
      );
      //  b) REMOVED
      const wb2 = await reportRepo.save(
        reportRepo.create({
          latitude: 37.6544,
          longitude: 127.0568,
          roadAddress: '서울특별시 노원구 노해로 437',
          region: region5,
          species: Species.WASP,
          status: HiveReportStatus.REMOVED,
          imageUrl: WASP_IMG,
        }),
      );
      await actionRepo.save(
        actionRepo.create({
          hiveReport: wb2,
          member,
          latitude: 37.6544,
          longitude: 127.0568,
          actionType: HiveActionType.REPORT,
          imageUrl: WASP_IMG,
        }),
      );
      const rmWb2 = await actionRepo.save(
        actionRepo.create({
          hiveReport: wb2,
          member,
          latitude: 37.6544,
          longitude: 127.0568,
          actionType: HiveActionType.WASP_PROOF,
          imageUrl: WASP_REMOVED_IMG,
        }),
      );
      await rewardRepo.save(
        rewardRepo.create({
          action: rmWb2,
          member,
          points: 100,
        }),
      );

      await manager
        .getRepository(Member)
        .increment({ id: memberId }, 'points', 200);
    });
  }

  async seedBeekeeperDefaults(memberId: string) {
    const PREEXISTING_REPORTER_ID = this.configService.get<string>(
      'PREEXISTING_REPORTER_ID',
    );
    const HONEYBEE_IMG =
      'https://regreen-bucket.s3.ap-northeast-2.amazonaws.com/beesafe/constant/honeybee.jpg';
    const HONEYBEE_REMOVED_IMG =
      'https://regreen-bucket.s3.ap-northeast-2.amazonaws.com/beesafe/constant/honeybee-removed.jpg';

    await this.dataSource.transaction(async (manager) => {
      const reportRepo = manager.getRepository(HiveReport);
      const actionRepo = manager.getRepository(HiveAction);
      const rewardRepo = manager.getRepository(Reward);

      const member = await manager
        .getRepository(Member)
        .findOneOrFail({ where: { id: memberId } });
      const reporter = await manager
        .getRepository(Member)
        .findOneOrFail({ where: { id: PREEXISTING_REPORTER_ID } });

      const region1 = await manager.getRepository(Region).findOneOrFail({
        where: { districtCode: '11140' },
      });
      const region2 = await manager.getRepository(Region).findOneOrFail({
        where: { districtCode: '11680' },
      });
      const region3 = await manager.getRepository(Region).findOneOrFail({
        where: { districtCode: '11440' },
      });
      const region4 = await manager.getRepository(Region).findOneOrFail({
        where: { districtCode: '11710' },
      });
      const region5 = await manager.getRepository(Region).findOneOrFail({
        where: { districtCode: '11350' },
      });

      // 1) 예약된 꿀벌집 신고서
      const hb1 = await reportRepo.save(
        reportRepo.create({
          latitude: 37.5665,
          longitude: 126.978,
          roadAddress: '서울특별시 중구 세종대로 110',
          region: region1,
          species: Species.HONEYBEE,
          status: HiveReportStatus.RESERVED,
          imageUrl: HONEYBEE_IMG,
        }),
      );
      await actionRepo.save(
        actionRepo.create({
          hiveReport: hb1,
          member: reporter,
          latitude: 37.5665,
          longitude: 126.978,
          actionType: HiveActionType.REPORT,
          imageUrl: HONEYBEE_IMG,
        }),
      );
      await actionRepo.save(
        actionRepo.create({
          hiveReport: hb1,
          member,
          actionType: HiveActionType.RESERVE,
        }),
      );

      const hb2 = await reportRepo.save(
        reportRepo.create({
          latitude: 37.4979,
          longitude: 127.0276,
          roadAddress: '서울특별시 강남구 강남대로 396',
          region: region2,
          species: Species.HONEYBEE,
          status: HiveReportStatus.RESERVED,
          imageUrl: HONEYBEE_IMG,
        }),
      );
      await actionRepo.save(
        actionRepo.create({
          hiveReport: hb2,
          member: reporter,
          latitude: 37.4979,
          longitude: 127.0276,
          actionType: HiveActionType.REPORT,
          imageUrl: HONEYBEE_IMG,
        }),
      );
      await actionRepo.save(
        actionRepo.create({
          hiveReport: hb2,
          member,
          actionType: HiveActionType.RESERVE,
        }),
      );

      const hb3 = await reportRepo.save(
        reportRepo.create({
          latitude: 37.5563,
          longitude: 126.9236,
          roadAddress: '서울특별시 마포구 양화로 160',
          region: region3,
          species: Species.HONEYBEE,
          status: HiveReportStatus.RESERVED,
          imageUrl: HONEYBEE_IMG,
        }),
      );
      await actionRepo.save(
        actionRepo.create({
          hiveReport: hb3,
          member: reporter,
          latitude: 37.5563,
          longitude: 126.9236,
          actionType: HiveActionType.REPORT,
          imageUrl: HONEYBEE_IMG,
        }),
      );
      await actionRepo.save(
        actionRepo.create({
          hiveReport: hb3,
          member,
          actionType: HiveActionType.RESERVE,
        }),
      );

      // 2) 제거된 꿀벌집 신고서
      const hb4 = await reportRepo.save(
        reportRepo.create({
          latitude: 37.515,
          longitude: 127.0726,
          roadAddress: '서울특별시 송파구 올림픽로 25',
          region: region4,
          species: Species.HONEYBEE,
          status: HiveReportStatus.REMOVED,
          imageUrl: HONEYBEE_IMG,
        }),
      );
      await actionRepo.save(
        actionRepo.create({
          hiveReport: hb4,
          member: reporter,
          latitude: 37.515,
          longitude: 127.0726,
          actionType: HiveActionType.REPORT,
          imageUrl: HONEYBEE_IMG,
        }),
      );
      await actionRepo.save(
        actionRepo.create({
          hiveReport: hb4,
          member,
          actionType: HiveActionType.RESERVE,
        }),
      );
      const rmHb1 = await actionRepo.save(
        actionRepo.create({
          hiveReport: hb4,
          member,
          latitude: 37.515,
          longitude: 127.0726,
          actionType: HiveActionType.HONEYBEE_PROOF,
          imageUrl: HONEYBEE_REMOVED_IMG,
        }),
      );
      await rewardRepo.save(
        rewardRepo.create({
          action: rmHb1,
          member,
          points: 100,
        }),
      );

      const hb5 = await reportRepo.save(
        reportRepo.create({
          latitude: 37.6544,
          longitude: 127.0568,
          roadAddress: '서울특별시 노원구 노해로 437',
          region: region5,
          species: Species.HONEYBEE,
          status: HiveReportStatus.REMOVED,
          imageUrl: HONEYBEE_IMG,
        }),
      );
      await actionRepo.save(
        actionRepo.create({
          hiveReport: hb5,
          member: reporter,
          latitude: 37.6544,
          longitude: 127.0568,
          actionType: HiveActionType.REPORT,
          imageUrl: HONEYBEE_IMG,
        }),
      );
      await actionRepo.save(
        actionRepo.create({
          hiveReport: hb5,
          member,
          actionType: HiveActionType.RESERVE,
        }),
      );
      const rmHb2 = await actionRepo.save(
        actionRepo.create({
          hiveReport: hb5,
          member,
          latitude: 37.6544,
          longitude: 127.0568,
          actionType: HiveActionType.HONEYBEE_PROOF,
          imageUrl: HONEYBEE_REMOVED_IMG,
        }),
      );
      await rewardRepo.save(
        rewardRepo.create({
          action: rmHb2,
          member,
          points: 100,
        }),
      );

      await manager
        .getRepository(Member)
        .increment({ id: memberId }, 'points', 200);
    });
  }
}
