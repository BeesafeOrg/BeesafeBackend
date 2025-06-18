import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { HiveReport } from './entities/hive-report.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { OpenAiResponseOfHiveReportImageDto } from './dto/open-ai-response-of-hive-report-image.dto';
import { MemberService } from '../member/member.service';
import { BusinessException } from '../../common/filters/exception/business-exception';
import { ErrorType } from '../../common/filters/exception/error-code.enum';
import { OpenaiService } from '../../common/openai/openai.service';
import { OpenaiPromptType } from '../../common/openai/constant/openai-prompt.type.enum';
import { CreateHiveReportDto } from './dto/create-hive-report.dto';
import { RegionService } from '../region/region.service';
import { HiveReportStatus } from './constant/hive-report-status.enum';
import { HiveReportResponseDto } from './dto/hive-report-response.dto';
import { PaginatedDto } from '../../common/dto/paginated.dto';
import { HiveActionType } from './constant/hive-actions-type.enum';
import { HiveAction } from './entities/hive-action.entity';
import { MemberRole } from '../member/constant/member-role.enum';
import { Species } from './constant/species.enum';
import { HiveReportDetailResponseDto } from './dto/hive-report-detail-response.dto';
import { CreateProofDto } from './dto/create-proof.dto';
import { Reward } from './entities/reward.entity';
import { Member } from '../member/entities/member.entity';
import { HiveReportPinDto } from './dto/hive-report-pin.dto';
import { HiveProofResponseDto } from './dto/hive-proof-response.dto';
import { haversineDistance } from '../../common/utils/calc-distance-util';
import { FcmService } from '../../common/fcm/fcm.service';
import { Notification } from '../member/entities/notification.entity';
import { NaverMapService } from '../../common/naver-map/naver-map.service';
import { NotificationType } from '../member/constant/notification-type.enum';

@Injectable()
export class HiveReportService {
  constructor(
    @InjectRepository(HiveReport)
    private readonly hiveReportRepo: Repository<HiveReport>,
    private readonly memberService: MemberService,
    private readonly openaiService: OpenaiService,
    private readonly regionService: RegionService,
    private readonly fcmService: FcmService,
    private readonly dataSource: DataSource,
    private readonly naverMapService: NaverMapService,
  ) {}

  async verifyWithImage(
    memberId: string,
    imageUrl: string,
  ): Promise<OpenAiResponseOfHiveReportImageDto> {
    const member = await this.memberService.findByIdOrThrowException(memberId);
    if (!member) {
      throw new BusinessException(ErrorType.MEMBER_NOT_FOUND);
    }

    const { species, confidence, reason } =
      await this.openaiService.verifyImageByType(
        imageUrl,
        OpenaiPromptType.HIVE_REPORT_IMAGE_VISION,
      );

    return await this.dataSource.transaction(async (manager) => {
      const report = manager.getRepository(HiveReport).create({
        imageUrl,
        aiResponseOfSpecies: species,
        aiConfidenceOfSpecies: confidence,
        aiReasonOfSpecies: reason,
      });
      const savedReport = await manager.getRepository(HiveReport).save(report);

      const action = manager.getRepository(HiveAction).create({
        hiveReport: savedReport,
        member,
        actionType: HiveActionType.REPORT,
        imageUrl,
      });
      await manager.getRepository(HiveAction).save(action);

      return {
        hiveReportId: savedReport.id,
        imageUrl: savedReport.imageUrl,
        aiResponseOfSpecies: savedReport.aiResponseOfSpecies,
        aiConfidenceOfSpecies: savedReport.aiConfidenceOfSpecies,
        aiReasonOfSpecies: savedReport.aiReasonOfSpecies,
      };
    });
  }

  async finalizeReport(
    memberId: string,
    dto: CreateHiveReportDto,
  ): Promise<void> {
    const report = await this.hiveReportRepo.findOne({
      where: { id: dto.hiveReportId },
      relations: ['actions', 'actions.member'],
    });
    if (!report) {
      throw new BusinessException(ErrorType.HIVE_REPORT_NOT_FOUND);
    }
    const reporterAction = report.actions.find(
      (a) => a.actionType === HiveActionType.REPORT && a.member.id === memberId,
    );
    if (!reporterAction) {
      throw new BusinessException(ErrorType.MEMBER_AND_REPORTER_MISMATCH);
    }
    if (report.status) {
      throw new BusinessException(ErrorType.ALREADY_UPLOADED_HIVE_REPORT);
    }

    const { districtCode } = await this.naverMapService.reverseGeocode(
      dto.latitude,
      dto.longitude,
    );

    const beekeepers =
      await this.memberService.findByInterestArea(districtCode);

    const { savedReport, region } = await this.dataSource.transaction(
      async (manager) => {
        const region =
          await this.regionService.findByDistrictCode(districtCode);

        Object.assign(report, {
          region: await this.regionService.findByDistrictCode(districtCode),
          species: dto.species,
          latitude: dto.latitude,
          longitude: dto.longitude,
          roadAddress: dto.roadAddress,
          districtCode,
          status: HiveReportStatus.REPORTED,
        });
        await manager.save(report);

        const notifRepo = manager.getRepository(Notification);
        const notifications = beekeepers.map((bk) =>
          notifRepo.create({
            member: bk,
            title: '새로운 꿀벌집 신고!',
            body: `${region.city} ${region.district}에 새 신고가 등록되었습니다.`,
            data: { hiveReportId: report.id },
            type: NotificationType.HONEYBEE_REPORTED,
            hiveReport: report,
            roadAddress: report.roadAddress,
          }),
        );
        await notifRepo.save(notifications);

        return { savedReport: report, region };
      },
    );

    try {
      await this.fcmService.sendToTopic(
        `area-${districtCode}`,
        '새로운 꿀벌집 신고!',
        `${region.city} ${region.district}에 신고가 등록되었습니다.`,
        { hiveReportId: savedReport.id },
      );
    } catch (e) {
      console.warn(
        `FCM 전송 실패 [area-${districtCode}]:`,
        (e as Error).message,
      );
    }
  }

  async findMyReports(
    memberId: string,
    page: number,
    size: number,
    statusFilter?: HiveReportStatus,
  ): Promise<PaginatedDto<HiveReportResponseDto, { points: number }>> {
    const take = Math.min(size);
    const skip = (page - 1) * take;

    const member = await this.memberService.findByIdOrThrowException(memberId);

    const actionTypes =
      member.role === MemberRole.BEEKEEPER
        ? [HiveActionType.HONEYBEE_PROOF, HiveActionType.RESERVE]
        : [HiveActionType.WASP_PROOF, HiveActionType.REPORT];

    const qbBase = this.hiveReportRepo
      .createQueryBuilder('report')
      .innerJoin(
        'report.actions',
        'a',
        'a.actionType IN (:...actionTypes) AND a.memberId = :memberId',
        {
          actionTypes,
          memberId: member.id,
        },
      );

    if (statusFilter) {
      qbBase.andWhere('report.status = :status', { status: statusFilter });
    }
    if (member.role === MemberRole.BEEKEEPER) {
      qbBase.andWhere('report.species = :species', {
        species: Species.HONEYBEE,
      });
    }

    const qb = qbBase
      .clone()
      .leftJoin(
        'report.actions',
        'reserveAction',
        'reserveAction.actionType = :reserveType AND reserveAction.memberId = :memberId',
        { reserveType: HiveActionType.RESERVE, memberId: member.id },
      )
      .addSelect('reserveAction.id', 'reserveActionId')
      .orderBy('report.createdAt', 'DESC')
      .skip(skip)
      .take(take);

    const { entities: reports, raw } = await qb.getRawAndEntities();
    const total = await qbBase.getCount();

    const rawByReportId = new Map<string, any>();
    for (const r of raw) {
      if (!rawByReportId.has(r.report_id)) rawByReportId.set(r.report_id, r);
    }

    return {
      results: reports.map((r) => {
        const row = rawByReportId.get(r.id);
        return {
          hiveReportId: r.id,
          species: r.species,
          status: r.status,
          roadAddress: r.roadAddress,
          createdAt: r.createdAt,
          ...(member.role === MemberRole.BEEKEEPER &&
            r.status === HiveReportStatus.RESERVED &&
            row?.reserveActionId && { hiveActionId: row.reserveActionId }),
        };
      }),
      meta: { points: member.points },
      page,
      size: take,
      total,
    };
  }

  async reserveReport(
    hiveReportId: string,
    beekeeperId: string,
  ): Promise<void> {
    const beekeeper =
      await this.memberService.findByIdOrThrowException(beekeeperId);

    const savedReport = await this.dataSource.transaction(async (manager) => {
      const reportRepo = manager.getRepository(HiveReport);
      const notiRepo = manager.getRepository(Notification);

      const report = await reportRepo.findOne({
        where: { id: hiveReportId, species: Species.HONEYBEE },
        relations: ['actions', 'actions.member'],
      });
      if (!report) {
        throw new BusinessException(ErrorType.HIVE_REPORT_NOT_FOUND);
      }
      if (report.status !== HiveReportStatus.REPORTED) {
        throw new BusinessException(
          ErrorType.INVALID_HIVE_REPORT_STATUS,
          'Already removed or reserved',
        );
      }

      report.status = HiveReportStatus.RESERVED;
      const action = manager.create(HiveAction, {
        member: beekeeper,
        actionType: HiveActionType.RESERVE,
      });
      report.actions.push(action);
      const updatedReport = await reportRepo.save(report);

      const reporterAction = updatedReport.actions.find(
        (a) => a.actionType === HiveActionType.REPORT,
      );
      if (!reporterAction) {
        throw new BusinessException(
          ErrorType.INVALID_HIVE_REPORT_STATUS,
          'Reporter not found',
        );
      }
      const reporter: Member = reporterAction.member;

      const notification = notiRepo.create({
        member: reporter,
        title: '꿀벌집 예약 접수됨!',
        body: '신고한 꿀벌집이 예약되었습니다.',
        data: { hiveReportId: report.id },
        type: NotificationType.HONEYBEE_RESERVED,
        hiveReport: report,
        roadAddress: report.roadAddress,
      });
      await notiRepo.save(notification);

      return updatedReport;
    });

    const reporterAction = savedReport.actions.find(
      (a) => a.actionType === HiveActionType.REPORT,
    )!;
    const reporter: Member = reporterAction.member;

    if (reporter.fcmToken) {
      try {
        await this.fcmService.sendToDevice(
          reporter.fcmToken,
          '꿀벌집 예약 접수됨!',
          '신고한 꿀벌집이 예약되었습니다.',
          { hiveReportId },
        );
      } catch (e) {
        console.warn(
          `FCM 전송 실패 (예약 알림) [${reporter.id}]:`,
          (e as Error).message,
        );
      }
    }
  }

  async cancelReservation(
    hiveReportId: string,
    hiveActionId: string,
    beekeeperId: string,
  ): Promise<void> {
    const beekeeper =
      await this.memberService.findByIdOrThrowException(beekeeperId);

    const savedReport = await this.dataSource.transaction(async (manager) => {
      const reportRepo = manager.getRepository(HiveReport);
      const actionRepo = manager.getRepository(HiveAction);
      const notifRepo = manager.getRepository(Notification);

      const report = await reportRepo.findOne({
        where: {
          id: hiveReportId,
          status: HiveReportStatus.RESERVED,
        },
        relations: ['actions', 'actions.member'],
      });
      if (!report) {
        throw new BusinessException(
          ErrorType.HIVE_REPORT_NOT_FOUND,
          'Reserved report not found',
        );
      }

      const reserveAction = report.actions.find(
        (a) =>
          a.id === hiveActionId &&
          a.actionType === HiveActionType.RESERVE &&
          a.member.id === beekeeperId,
      );
      if (!reserveAction) {
        throw new BusinessException(
          ErrorType.INVALID_HIVE_REPORT_STATUS,
          'No active reservation for this member',
        );
      }

      report.status = HiveReportStatus.REPORTED;
      await actionRepo.delete(reserveAction.id);
      report.actions = report.actions.filter((a) => a.id !== reserveAction.id);
      const updated = await reportRepo.save(report);

      const reporterAction = updated.actions.find(
        (a) => a.actionType === HiveActionType.REPORT,
      )!;
      const reporter: Member = reporterAction.member;

      const notification = notifRepo.create({
        member: reporter,
        title: '꿀벌집 예약이 취소됨!',
        body: '신고한 꿀벌집의 수거 예약이 취소되었습니다.',
        data: { hiveReportId: report.id },
        type: NotificationType.HONEYBEE_RESERVE_CANCELED,
        hiveReport: report,
        roadAddress: report.roadAddress,
      });
      await notifRepo.save(notification);

      return updated;
    });

    const reporterAction = savedReport.actions.find(
      (a) => a.actionType === HiveActionType.REPORT,
    )!;
    const reporter: Member = reporterAction.member;

    if (reporter.fcmToken) {
      try {
        await this.fcmService.sendToDevice(
          reporter.fcmToken,
          '꿀벌집 예약이 취소됨!',
          '신고한 꿀벌집의 수거 예약이 취소되었습니다.',
          { hiveReportId },
        );
      } catch (e) {
        console.warn(
          `FCM 전송 실패 (예약 취소 알림) [${reporter.id}]:`,
          (e as Error).message,
        );
      }
    }
  }

  async findReportDetails(
    hiveReportId: string,
    memberId: string,
  ): Promise<HiveReportDetailResponseDto> {
    const report = await this.hiveReportRepo.findOne({
      where: { id: hiveReportId },
      relations: ['actions', 'actions.member'],
    });
    if (!report) {
      throw new BusinessException(ErrorType.HIVE_REPORT_NOT_FOUND);
    }

    const reporterAction = report.actions.find(
      (a) => a.actionType === HiveActionType.REPORT,
    )!;
    const reserveAction = report.actions.find(
      (a) => a.actionType === HiveActionType.RESERVE,
    );
    const proofAction = report.actions.find((a) =>
      [HiveActionType.WASP_PROOF, HiveActionType.HONEYBEE_PROOF].includes(
        a.actionType,
      ),
    );

    const reporter = {
      memberId: reporterAction.member.id,
      nickname: reporterAction.member.nickname,
    };
    const beekeeper = proofAction
      ? {
          memberId: proofAction.member.id,
          nickname: proofAction.member.nickname,
          action: proofAction.actionType,
          proofImageUrl: proofAction.imageUrl,
        }
      : reserveAction
        ? {
            memberId: reserveAction.member.id,
            nickname: reserveAction.member.nickname,
            action: HiveActionType.RESERVE as const,
          }
        : null;

    return {
      isMe: memberId === reporter.memberId,
      hiveReportId: report.id,
      reporter,
      beekeeper,
      imageUrl: report.imageUrl,
      species: report.species,
      latitude: report.latitude,
      longitude: report.longitude,
      roadAddress: report.roadAddress,
      status: report.status,
      createdAt: report.createdAt,
    };
  }

  async proof(
    hiveReportId: string,
    memberId: string,
    proofDto: CreateProofDto,
    imageUrl: string,
  ): Promise<HiveProofResponseDto> {
    const { actionType, latitude, longitude } = proofDto;

    const savedReport = await this.dataSource.transaction(async (manager) => {
      const memberRepo = manager.getRepository(Member);
      const reportRepo = manager.getRepository(HiveReport);
      const actionRepo = manager.getRepository(HiveAction);
      const rewardRepo = manager.getRepository(Reward);
      const notiRepo = manager.getRepository(Notification);

      const member = await memberRepo.findOneOrFail({
        where: { id: memberId },
      });

      const report = await reportRepo.findOne({
        where: { id: hiveReportId },
        relations: ['actions', 'actions.member'],
      });
      if (!report) {
        throw new BusinessException(ErrorType.HIVE_REPORT_NOT_FOUND);
      }
      const reportAction = report.actions.find(
        (a) => a.actionType === HiveActionType.REPORT,
      );
      const reporter = reportAction?.member;
      if (!reportAction || !reporter) {
        throw new BusinessException(ErrorType.INVALID_HIVE_REPORT_STATUS);
      }

      if (actionType === HiveActionType.HONEYBEE_PROOF) {
        const reserveAct = await actionRepo
          .createQueryBuilder('a')
          .innerJoin('a.hiveReport', 'r', `r.id = :rid AND r.status = :st`, {
            rid: hiveReportId,
            st: HiveReportStatus.RESERVED,
          })
          .where('a.actionType = :t AND a.memberId = :mid', {
            t: HiveActionType.RESERVE,
            mid: memberId,
          })
          .getOne();
        if (!reserveAct) {
          throw new BusinessException(
            ErrorType.INVALID_HIVE_REPORT_STATUS,
            'Must be RESERVED by you to remove honeybee hive',
          );
        }

        if (report.latitude == null || report.longitude == null) {
          throw new BusinessException(
            ErrorType.INVALID_HIVE_REPORT_LOCATION_DATA,
          );
        }
        const MAX_DISTANCE_METERS = 30;
        const distance = haversineDistance(
          report.latitude,
          report.longitude,
          latitude,
          longitude,
        );

        if (distance > MAX_DISTANCE_METERS) {
          throw new BusinessException(
            ErrorType.INVALID_PROOF_LOCATION,
            `The authentication location is too far from the reported location. ` +
              `(Distance: ${distance.toFixed(1)}m, Allowed: ${MAX_DISTANCE_METERS}m)`,
          );
        }

        const notification = notiRepo.create({
          member: reporter,
          title: '꿀벌집 제거 완료!',
          body: '꿀벌집이 성공적으로 제거되었습니다.',
          data: { hiveReportId },
          type: NotificationType.HONEYBEE_REMOVED,
          hiveReport: { id: hiveReportId } as HiveReport,
          roadAddress: report.roadAddress,
        });
        await notiRepo.save(notification);
      } else if (actionType === HiveActionType.WASP_PROOF) {
        if (
          report.species === Species.WASP &&
          reportAction.member.id === memberId
        ) {
          // pass
        } else {
          throw new BusinessException(
            ErrorType.INVALID_HIVE_REPORT_STATUS,
            'Only reporter can remove WASP hive without reservation',
          );
        }
      }

      await reportRepo.update(hiveReportId, {
        status: HiveReportStatus.REMOVED,
      });

      const proofAction = actionRepo.create({
        hiveReport: { id: hiveReportId } as HiveReport,
        member: { id: memberId } as Member,
        actionType,
        imageUrl,
        latitude,
        longitude,
      });
      const savedAction = await actionRepo.save(proofAction);

      const reward = rewardRepo.create({
        points: 100,
        action: savedAction,
        member: reporter,
      });
      const savedReward = await rewardRepo.save(reward);
      await memberRepo.increment(
        { id: memberId },
        'points',
        savedReward.points,
      );

      return {
        hiveReportId,
        actionId: savedAction.id,
        rewardId: savedReward.id,
        status: HiveReportStatus.REMOVED,
        reporter,
      };
    });

    const { reporter } = savedReport as any; // 위에 추가된 값
    if (reporter.fcmToken) {
      try {
        await this.fcmService.sendToDevice(
          reporter.fcmToken,
          '꿀벌집 제거 완료!',
          '예약하신 꿀벌집이 제거되었습니다.',
          { hiveReportId },
        );
      } catch (e) {
        console.warn(
          `FCM 전송 실패 (제거 완료 알림) [${reporter.id}]:`,
          (e as Error).message,
        );
      }
    }

    const { actionId, rewardId, status } = savedReport as any;
    return { hiveReportId, actionId, rewardId, status, imageUrl };
  }

  async findReportsInBounds(
    minLat?: number,
    maxLat?: number,
    minLng?: number,
    maxLng?: number,
  ): Promise<HiveReportPinDto[]> {
    const qb = this.hiveReportRepo
      .createQueryBuilder('report')
      .select([
        'report.id',
        'report.latitude',
        'report.longitude',
        'report.species',
      ]);

    if (
      minLat !== undefined &&
      maxLat !== undefined &&
      minLng !== undefined &&
      maxLng !== undefined
    ) {
      qb.where('report.latitude BETWEEN :minLat AND :maxLat', {
        minLat,
        maxLat,
      }).andWhere('report.longitude BETWEEN :minLng AND :maxLng', {
        minLng,
        maxLng,
      });
    }

    const reports = await qb.getMany();
    return reports.map((report) => ({
      hiveReportId: report.id,
      latitude: report.latitude,
      longitude: report.longitude,
      species: report.species,
    }));
  }
}
