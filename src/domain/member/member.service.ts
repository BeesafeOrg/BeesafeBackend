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
import { NotificationType } from './constant/notification-type.enum';
import { createReportWithReporterAction } from './constant/seed-create-func';

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
      roadAddress: n.address || '',
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

  async updateFcmToken(memberId: string, fcmToken: string) {
    const member = await this.findByIdOrThrowException(memberId);
    if (member.fcmToken !== fcmToken) {
      member.fcmToken = fcmToken;
      await this.memberRepo.save(member);
    }
  }

  async findByInterestArea(districtCode: string): Promise<Member[]> {
    return await this.memberRepo.find({
      where: {
        role: MemberRole.BEEKEEPER,
        interestAreas: { districtCode },
      },
      relations: ['interestAreas'],
    });
  }

  async delete(memberId: string): Promise<void> {
    const exists = await this.memberRepo.count({ where: { id: memberId } });
    if (!exists) {
      throw new BusinessException(ErrorType.MEMBER_NOT_FOUND);
    }
    await this.memberRepo.delete({ id: memberId });
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
      const actionRepo = manager.getRepository(HiveAction);
      const rewardRepo = manager.getRepository(Reward);
      const notiRepo = manager.getRepository(Notification);

      const member = await manager
        .getRepository(Member)
        .findOneOrFail({ where: { id: memberId } });

      const beekeeper = await manager
        .getRepository(Member)
        .findOneOrFail({ where: { id: PREEXISTING_BEEKEEPER_ID } });

      const region = await manager.getRepository(Region).findOneOrFail({
        where: { districtCode: '11215' },
      });

      /* ---------- 1) 꿀벌집 3건 ------------------------------------- */
      // a) REPORTED
      await createReportWithReporterAction(manager, {
        lat: 37.541235,
        lon: 127.0720557,
        address: '서울특별시 광진구 능동로 120-1 (화양동, 건국대학교병원)',
        imageUrl: HONEYBEE_IMG,
        species: Species.HONEYBEE,
        status: HiveReportStatus.REPORTED,
        region,
        reporter: member,
      });

      // b) RESERVED
      const hb2 = await createReportWithReporterAction(manager, {
        lat: 37.538338,
        lon: 127.07464,
        address:
          '서울특별시 광진구 아차산로 36길 5 (화양동, 건국대학교동문회관)',
        imageUrl: HONEYBEE_IMG,
        species: Species.HONEYBEE,
        status: HiveReportStatus.RESERVED,
        region,
        reporter: member,
      });
      await actionRepo.save(
        actionRepo.create({
          hiveReport: hb2,
          member: beekeeper,
          actionType: HiveActionType.RESERVE,
        }),
      );
      await notiRepo.save(
        notiRepo.create({
          member,
          title: '꿀벌집 예약 접수됨!',
          body: '신고한 꿀벌집이 예약되었습니다.',
          data: { hiveReportId: hb2.id },
          type: NotificationType.HONEYBEE_RESERVED,
          hiveReport: hb2,
          address: hb2.address,
        }),
      );

      // c) REMOVED
      const hb3 = await createReportWithReporterAction(manager, {
        lat: 37.563092,
        lon: 127.082969,
        address: '서울특별시 광진구 능동로 380 (중곡동, 조광신경정신과의원)',
        imageUrl: HONEYBEE_IMG,
        species: Species.HONEYBEE,
        status: HiveReportStatus.REMOVED,
        region,
        reporter: member,
      });
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
          latitude: 37.563092,
          longitude: 127.082969,
          actionType: HiveActionType.HONEYBEE_PROOF,
          imageUrl: HONEYBEE_REMOVED_IMG,
        }),
      );
      await rewardRepo.save(
        rewardRepo.create({ action: rmHb3, member, points: 100 }),
      );

      /* ---------- 2) 말벌집 2건 ------------------------------------- */
      // a) REPORTED
      await createReportWithReporterAction(manager, {
        lat: 37.539182,
        lon: 127.074711,
        address: '서울특별시 광진구 능동로 120 (건국대학교, 법학관)',
        imageUrl: WASP_IMG,
        species: Species.WASP,
        status: HiveReportStatus.REPORTED,
        region,
        reporter: member,
      });

      // b) REMOVED
      const wb2 = await createReportWithReporterAction(manager, {
        lat: 37.552011,
        lon: 127.07877,
        address: '서울특별시 광진구 능동로 238 (서울시민안전체험관)',
        imageUrl: WASP_IMG,
        species: Species.WASP,
        status: HiveReportStatus.REMOVED,
        region,
        reporter: member,
      });
      const rmWb2 = await actionRepo.save(
        actionRepo.create({
          hiveReport: wb2,
          member,
          latitude: 37.552011,
          longitude: 127.07877,
          actionType: HiveActionType.WASP_PROOF,
          imageUrl: WASP_REMOVED_IMG,
        }),
      );
      await rewardRepo.save(
        rewardRepo.create({ action: rmWb2, member, points: 100 }),
      );

      /* ---------- 포인트 가산 ---------------------------------------- */
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
      const actionRepo = manager.getRepository(HiveAction);
      const rewardRepo = manager.getRepository(Reward);
      const notiRepo = manager.getRepository(Notification);

      const beekeeper = await manager
        .getRepository(Member)
        .findOneOrFail({ where: { id: memberId } });

      const reporter = await manager
        .getRepository(Member)
        .findOneOrFail({ where: { id: PREEXISTING_REPORTER_ID } });

      const region = await manager.getRepository(Region).findOneOrFail({
        where: { districtCode: '11215' },
      });

      /* 1) 예약 상태 꿀벌집 3건 ----------------------------------- */
      const hb1 = await createReportWithReporterAction(manager, {
        lat: 37.541235,
        lon: 127.0720557,
        address: '서울특별시 광진구 능동로 120-1 (화양동, 건국대학교병원)',
        imageUrl: HONEYBEE_IMG,
        species: Species.HONEYBEE,
        status: HiveReportStatus.RESERVED,
        region,
        reporter,
      });
      await notiRepo.save(
        notiRepo.create({
          member: beekeeper,
          title: '새로운 꿀벌집 신고!',
          body: `${region.city} ${region.district}에 새 신고가 등록되었습니다.`,
          data: { hiveReportId: hb1.id },
          type: NotificationType.HONEYBEE_REPORTED,
          hiveReport: hb1,
          address: hb1.address,
        }),
      );
      await actionRepo.save(
        actionRepo.create({
          hiveReport: hb1,
          member: beekeeper,
          actionType: HiveActionType.RESERVE,
        }),
      );

      const hb2 = await createReportWithReporterAction(manager, {
        lat: 37.538338,
        lon: 127.07464,
        address:
          '서울특별시 광진구 아차산로 36길 5 (화양동, 건국대학교동문회관)',
        imageUrl: HONEYBEE_IMG,
        species: Species.HONEYBEE,
        status: HiveReportStatus.RESERVED,
        region,
        reporter,
      });
      await notiRepo.save({
        member: beekeeper,
        title: '새로운 꿀벌집 신고!',
        body: `${region.city} ${region.district}에 새 신고가 등록되었습니다.`,
        data: { hiveReportId: hb2.id },
        type: NotificationType.HONEYBEE_REPORTED,
        hiveReport: hb2,
        address: hb2.address,
      });
      await actionRepo.save(
        actionRepo.create({
          hiveReport: hb2,
          member: beekeeper,
          actionType: HiveActionType.RESERVE,
        }),
      );

      const hb3 = await createReportWithReporterAction(manager, {
        lat: 37.563092,
        lon: 127.082969,
        address: '서울특별시 광진구 능동로 380 (중곡동, 조광신경정신과의원)',
        imageUrl: HONEYBEE_IMG,
        species: Species.HONEYBEE,
        status: HiveReportStatus.RESERVED,
        region,
        reporter,
      });
      await notiRepo.save({
        member: beekeeper,
        title: '새로운 꿀벌집 신고!',
        body: `${region.city} ${region.district}에 새 신고가 등록되었습니다.`,
        data: { hiveReportId: hb3.id },
        type: NotificationType.HONEYBEE_REPORTED,
        hiveReport: hb3,
        address: hb3.address,
      });
      await actionRepo.save(
        actionRepo.create({
          hiveReport: hb3,
          member: beekeeper,
          actionType: HiveActionType.RESERVE,
        }),
      );

      /* 2) 제거 완료 꿀벌집 2건 ----------------------------------- */
      const hb4 = await createReportWithReporterAction(manager, {
        lat: 37.539182,
        lon: 127.074711,
        address: '서울특별시 광진구 능동로 120 (건국대학교, 법학관)',
        imageUrl: HONEYBEE_IMG,
        species: Species.HONEYBEE,
        status: HiveReportStatus.REMOVED,
        region,
        reporter,
      });
      await notiRepo.save({
        member: beekeeper,
        title: '새로운 꿀벌집 신고!',
        body: `${region.city} ${region.district}에 새 신고가 등록되었습니다.`,
        data: { hiveReportId: hb4.id },
        type: NotificationType.HONEYBEE_REPORTED,
        hiveReport: hb4,
        address: hb4.address,
      });
      await actionRepo.save(
        actionRepo.create({
          hiveReport: hb4,
          member: beekeeper,
          actionType: HiveActionType.RESERVE,
        }),
      );
      const rmHb1 = await actionRepo.save(
        actionRepo.create({
          hiveReport: hb4,
          member: beekeeper,
          latitude: 37.539182,
          longitude: 127.074711,
          actionType: HiveActionType.HONEYBEE_PROOF,
          imageUrl: HONEYBEE_REMOVED_IMG,
        }),
      );
      await rewardRepo.save(
        rewardRepo.create({ action: rmHb1, member: beekeeper, points: 100 }),
      );

      const hb5 = await createReportWithReporterAction(manager, {
        lat: 37.552011,
        lon: 127.07877,
        address: '서울특별시 광진구 능동로 238 (서울시민안전체험관)',
        imageUrl: HONEYBEE_IMG,
        species: Species.HONEYBEE,
        status: HiveReportStatus.REMOVED,
        region,
        reporter,
      });
      await notiRepo.save({
        member: beekeeper,
        title: '새로운 꿀벌집 신고!',
        body: `${region.city} ${region.district}에 새 신고가 등록되었습니다.`,
        data: { hiveReportId: hb5.id },
        type: NotificationType.HONEYBEE_REPORTED,
        hiveReport: hb5,
        address: hb5.address,
      });
      await actionRepo.save(
        actionRepo.create({
          hiveReport: hb5,
          member: beekeeper,
          actionType: HiveActionType.RESERVE,
        }),
      );
      const rmHb2 = await actionRepo.save(
        actionRepo.create({
          hiveReport: hb5,
          member: beekeeper,
          latitude: 37.552011,
          longitude: 127.07877,
          actionType: HiveActionType.HONEYBEE_PROOF,
          imageUrl: HONEYBEE_REMOVED_IMG,
        }),
      );
      await rewardRepo.save(
        rewardRepo.create({ action: rmHb2, member: beekeeper, points: 100 }),
      );

      /* 포인트 보상 */
      await manager
        .getRepository(Member)
        .increment({ id: memberId }, 'points', 200);
    });
  }
}
