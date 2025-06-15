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
import { FcmService } from '../../common/fcm/fcm.service';
import { PaginatedDto } from '../../common/dto/paginated.dto';
import { NotificationItemDto } from './dto/notification-response.dto';
import { Notification } from './entities/notification.entity';

@Injectable()
export class MemberService {
  private readonly MAX_AREA = 3;

  constructor(
    private readonly configService: ConfigService,
    @InjectRepository(Member)
    private readonly memberRepo: Repository<Member>,
    @InjectRepository(Notification)
    private readonly notiRepo: Repository<Notification>,
    private readonly fcmService: FcmService,
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

    let toAdd: string[] = [];
    let toRemove: InterestArea[] = [];
    let fcmToken: string | null = null;

    await this.dataSource.transaction(async (manager) => {
      const member = await manager.findOne(Member, {
        where: { id: memberId },
        relations: ['interestAreas'],
      });
      if (!member) {
        throw new BusinessException(ErrorType.MEMBER_NOT_FOUND);
      }

      fcmToken = member.fcmToken;

      const regions = await manager.findByIds(Region, areaDtos);
      if (regions.length !== areaDtos.length) {
        throw new BusinessException(ErrorType.INVALID_REGION_CODE);
      }

      const current = new Set(
        member.interestAreas.map((ia) => ia.districtCode),
      );
      const incoming = new Set(areaDtos.map((dto) => dto.districtCode));

      toRemove = member.interestAreas.filter(
        (ia) => !incoming.has(ia.districtCode),
      );
      toAdd = [...incoming].filter((code) => !current.has(code));

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

    if (fcmToken) {
      if (toRemove.length) {
        const codes = toRemove.map((ia) => `area-${ia.districtCode}`);
        await this.fcmService.unsubscribeFromTopic([fcmToken], codes);
      }
      if (toAdd.length) {
        const codes = toAdd.map((code) => `area-${code}`);
        await this.fcmService.subscribeToTopic([fcmToken], codes);
      }
    }
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

  async getNotifications(
    memberId: string,
    page: number,
    size: number,
  ): Promise<PaginatedDto<NotificationItemDto>> {
    const [entities, total] = await this.notiRepo.findAndCount({
      where: { member: { id: memberId } },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * size,
      take: size,
      relations: ['hiveReport'],
    });

    const items: NotificationItemDto[] = entities.map((n) => ({
      id: n.id,
      hiveReportId: n.hiveReport!.id,
      contents: n.body,
      type: n.type,
      roadAddress: n.roadAddress || '',
      isRead: n.isRead,
      sentAt: n.createdAt,
    }));

    return {
      results: items,
      page,
      size,
      total,
    };
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

      const region = await manager.getRepository(Region).findOneOrFail({
        where: { districtCode: '11215' },
      });

      // 1) 꿀벌집 신고서 3개 (REPORTED, RESERVED, REMOVED)
      //  a) REPORTED
      const hb1 = await reportRepo.save(
        reportRepo.create({
          latitude: 37.541642,
          longitude: 127.071808,
          roadAddress:
            '서울특별시 광진구 능동로 120-1 (화양동, 건국대학교병원)',
          region,
          species: Species.HONEYBEE,
          status: HiveReportStatus.REPORTED,
          imageUrl: HONEYBEE_IMG,
        }),
      );
      await actionRepo.save(
        actionRepo.create({
          hiveReport: hb1,
          member,
          latitude: 37.541642,
          longitude: 127.071808,
          actionType: HiveActionType.REPORT,
          imageUrl: HONEYBEE_IMG,
        }),
      );

      //  b) RESERVED
      const hb2 = await reportRepo.save(
        reportRepo.create({
          latitude: 37.541861,
          longitude: 127.071912,
          roadAddress:
            '서울특별시 광진구 아차산로 36길 5 (화양동, 건국대학교동문회관)',
          region,
          species: Species.HONEYBEE,
          status: HiveReportStatus.RESERVED,
          imageUrl: HONEYBEE_IMG,
        }),
      );
      await actionRepo.save(
        actionRepo.create({
          hiveReport: hb2,
          member,
          latitude: 37.541861,
          longitude: 127.071912,
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
          latitude: 37.548993,
          longitude: 127.074012,
          roadAddress:
            '서울특별시 광진구 능동로 380 (중곡동, 조광신경정신과의원)',
          region,
          species: Species.HONEYBEE,
          status: HiveReportStatus.REMOVED,
          imageUrl: HONEYBEE_IMG,
        }),
      );
      await actionRepo.save(
        actionRepo.create({
          hiveReport: hb3,
          member,
          latitude: 37.548993,
          longitude: 127.074012,
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
          latitude: 37.548993,
          longitude: 127.074012,
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
          latitude: 37.541609,
          longitude: 127.07178,
          roadAddress: '서울특별시 광진구 능동로 120 (화양동, 법학관)',
          region,
          species: Species.WASP,
          status: HiveReportStatus.REPORTED,
          imageUrl: WASP_IMG,
        }),
      );
      await actionRepo.save(
        actionRepo.create({
          hiveReport: wb1,
          member,
          latitude: 37.541609,
          longitude: 127.07178,
          actionType: HiveActionType.REPORT,
          imageUrl: WASP_IMG,
        }),
      );
      //  b) REMOVED
      const wb2 = await reportRepo.save(
        reportRepo.create({
          latitude: 37.542467,
          longitude: 127.071214,
          roadAddress:
            '서울특별시 광진구 능동로 216 (능동 18번지, 서울상상나라)',
          region,
          species: Species.WASP,
          status: HiveReportStatus.REMOVED,
          imageUrl: WASP_IMG,
        }),
      );
      await actionRepo.save(
        actionRepo.create({
          hiveReport: wb2,
          member,
          latitude: 37.542467,
          longitude: 127.071214,
          actionType: HiveActionType.REPORT,
          imageUrl: WASP_IMG,
        }),
      );
      const rmWb2 = await actionRepo.save(
        actionRepo.create({
          hiveReport: wb2,
          member,
          latitude: 37.542467,
          longitude: 127.071214,
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

      const region = await manager.getRepository(Region).findOneOrFail({
        where: { districtCode: '11215' },
      });

      // 1) 예약된 꿀벌집 신고서
      const hb1 = await reportRepo.save(
        reportRepo.create({
          latitude: 37.541642,
          longitude: 127.071808,
          roadAddress:
            '서울특별시 광진구 능동로 120-1 (화양동, 건국대학교병원)',
          region,
          species: Species.HONEYBEE,
          status: HiveReportStatus.RESERVED,
          imageUrl: HONEYBEE_IMG,
        }),
      );
      await actionRepo.save(
        actionRepo.create({
          hiveReport: hb1,
          member: reporter,
          latitude: 37.541642,
          longitude: 127.071808,
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
          latitude: 37.541861,
          longitude: 127.071912,
          roadAddress:
            '서울특별시 광진구 아차산로 36길 5 (화양동, 건국대학교동문회관)',
          region,
          species: Species.HONEYBEE,
          status: HiveReportStatus.RESERVED,
          imageUrl: HONEYBEE_IMG,
        }),
      );
      await actionRepo.save(
        actionRepo.create({
          hiveReport: hb2,
          member: reporter,
          latitude: 37.541861,
          longitude: 127.071912,
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
          latitude: 37.541609,
          longitude: 127.07178,
          roadAddress: '서울특별시 광진구 능동로 120 (화양동, 법학관)',
          region,
          species: Species.HONEYBEE,
          status: HiveReportStatus.RESERVED,
          imageUrl: HONEYBEE_IMG,
        }),
      );
      await actionRepo.save(
        actionRepo.create({
          hiveReport: hb3,
          member: reporter,
          latitude: 37.541609,
          longitude: 127.07178,
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
          latitude: 37.548993,
          longitude: 127.074012,
          roadAddress:
            '서울특별시 광진구 능동로 380 (중곡동, 조광신경정신과의원)',
          region,
          species: Species.HONEYBEE,
          status: HiveReportStatus.REMOVED,
          imageUrl: HONEYBEE_IMG,
        }),
      );
      await actionRepo.save(
        actionRepo.create({
          hiveReport: hb4,
          member: reporter,
          latitude: 37.548993,
          longitude: 127.074012,
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
          latitude: 37.548993,
          longitude: 127.074012,
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
          latitude: 37.542467,
          longitude: 127.071214,
          roadAddress:
            '서울특별시 광진구 능동로 216 (능동 18번지, 서울상상나라)',
          region,
          species: Species.HONEYBEE,
          status: HiveReportStatus.REMOVED,
          imageUrl: HONEYBEE_IMG,
        }),
      );
      await actionRepo.save(
        actionRepo.create({
          hiveReport: hb5,
          member: reporter,
          latitude: 37.542467,
          longitude: 127.071214,
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
          latitude: 37.542467,
          longitude: 127.071214,
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

  async updateFcmToken(memberId: string, fcmToken: string) {
    const member = await this.findByIdOrThrowException(memberId);
    if (member.fcmToken !== fcmToken) {
      member.fcmToken = fcmToken;
      await this.memberRepo.save(member);
    }
  }

  async findByInterestArea(districtCode: string) {
    return await this.memberRepo.find({
      where: {
        role: MemberRole.BEEKEEPER,
        interestAreas: { districtCode },
      },
      relations: ['interestAreas'],
    });
  }
}
