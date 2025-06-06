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

@Injectable()
export class HiveReportService {
  constructor(
    @InjectRepository(HiveReport)
    private readonly hiveReportRepo: Repository<HiveReport>,
    @InjectRepository(HiveAction)
    private readonly hiveActionRepo: Repository<HiveAction>,
    private readonly memberService: MemberService,
    private readonly openaiService: OpenaiService,
    private readonly regionService: RegionService,
    private readonly dataSource: DataSource,
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

    const region = await this.regionService.findByDistrictCode(
      dto.districtCode,
    );
    Object.assign(report, {
      region,
      species: dto.species,
      latitude: dto.latitude,
      longitude: dto.longitude,
      roadAddress: dto.roadAddress,
      districtCode: dto.districtCode,
      status: HiveReportStatus.REPORTED,
    });
    await this.hiveReportRepo.save(report);
  }

  async findMyReports(
    memberId: string,
    memberRole: MemberRole,
    page: number,
    size: number,
    statusFilter?: HiveReportStatus,
  ): Promise<PaginatedDto<HiveReportResponseDto>> {
    const take = Math.min(size);
    const skip = (page - 1) * take;

    const actionTypes =
      memberRole === MemberRole.BEEKEEPER
        ? [HiveActionType.HONEYBEE_PROOF, HiveActionType.RESERVE]
        : [HiveActionType.WASP_PROOF, HiveActionType.REPORT];

    const member = await this.memberService.findByIdOrThrowException(memberId);

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
    if (memberRole === MemberRole.BEEKEEPER) {
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
      .addSelect('reserveAction.id', 'reserveActionId') // ← 액션 ID만 추가로 가져옴
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
          ...(memberRole === MemberRole.BEEKEEPER &&
            r.status === HiveReportStatus.RESERVED &&
            row?.reserveActionId && { hiveActionId: row.reserveActionId }),
        };
      }),
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

    await this.dataSource.transaction(async (manager) => {
      const report = await manager.getRepository(HiveReport).findOne({
        where: { id: hiveReportId, species: Species.HONEYBEE },
        relations: ['actions'],
      });
      if (!report) {
        throw new BusinessException(ErrorType.HIVE_REPORT_NOT_FOUND);
      }
      if (report.status !== HiveReportStatus.REPORTED) {
        throw new BusinessException(
          ErrorType.INVALID_HIVE_REPORT_STATUS,
          'Already removed or reserved hive report',
        );
      }

      report.status = HiveReportStatus.RESERVED;
      const action = manager.create(HiveAction, {
        member: beekeeper,
        actionType: HiveActionType.RESERVE,
      });
      report.actions.push(action);
      await manager.save(report);
    });
  }

  async cancelReservation(
    hiveReportId: string,
    hiveActionId: string,
    beekeeperId: string,
  ): Promise<void> {
    const beekeeper =
      await this.memberService.findByIdOrThrowException(beekeeperId);

    await this.dataSource.transaction(async (manager) => {
      const report = await manager.getRepository(HiveReport).findOne({
        where: { id: hiveReportId, status: HiveReportStatus.RESERVED },
        relations: ['actions', 'actions.member'],
      });
      if (!report) {
        throw new BusinessException(ErrorType.HIVE_REPORT_NOT_FOUND);
      }

      const reserveAction = report.actions.find(
        (a) =>
          a.id === hiveActionId &&
          a.actionType === HiveActionType.RESERVE &&
          a.member.id === beekeeperId,
      );
      if (!reserveAction) {
        throw new BusinessException(
          ErrorType.HIVE_REPORT_NOT_FOUND,
          'No active reservation for this member',
        );
      }

      report.status = HiveReportStatus.REPORTED;
      await manager.getRepository(HiveAction).delete(reserveAction.id);
      report.actions = report.actions.filter((a) => a.id !== reserveAction.id);
      await manager.save(report);
    });
  }

  async findReportDetails(
    hiveReportId: string,
    memberId: string,
  ): Promise<HiveReportDetailResponseDto> {
    const { entities, raw } = await this.hiveReportRepo
      .createQueryBuilder('r')
      .innerJoin(
        'r.actions',
        'reportAct',
        'reportAct.actionType = :reportType',
        { reportType: HiveActionType.REPORT },
      )
      .innerJoin('reportAct.member', 'reporter')

      .leftJoin(
        'r.actions',
        'reserveAct',
        'reserveAct.actionType = :reserveType',
        { reserveType: HiveActionType.RESERVE },
      )
      .leftJoin('reserveAct.member', 'beekeeper')

      .addSelect([
        'reporter.id',
        'reporter.nickname',
        'beekeeper.id',
        'beekeeper.nickname',
      ])
      .where('r.id = :id', { id: hiveReportId })
      .getRawAndEntities();

    /* 2) 결과 가공 */
    const record = entities[0];
    const reporterId = raw[0].reporter_id as string;
    const reporterNickname = raw[0].reporter_nickname as string;
    const beekeeperId = raw[0].beekeeper_id as string | null;
    const beekeeperNickname = raw[0].beekeeper_nickname as string | null;
    const isMe = memberId === reporterId;

    return {
      isMe,
      hiveReportId: record.id,
      reporter: { memberId: reporterId, nickname: reporterNickname },
      beekeeper: beekeeperId
        ? { memberId: beekeeperId, nickname: beekeeperNickname }
        : null,
      imageUrl: record.imageUrl,
      species: record.species,
      latitude: record.latitude,
      longitude: record.longitude,
      roadAddress: record.roadAddress,
      status: record.status,
      createdAt: record.createdAt,
    };
  }

  async proof(
    hiveReportId: string,
    memberId: string,
    proofDto: CreateProofDto,
    imageUrl: string,
  ) {
    const { actionType, latitude, longitude } = proofDto;
    return await this.dataSource.transaction(async (manager) => {
      const member = await manager
        .getRepository(Member)
        .findOneOrFail({ where: { id: memberId } });
      if (!member) {
        throw new BusinessException(ErrorType.MEMBER_NOT_FOUND);
      }

      const reserveAction = await manager
        .getRepository(HiveAction)
        .createQueryBuilder('a')
        .innerJoin(
          'a.hiveReport',
          'r',
          `r.id = :reportId AND r.status = :reservedStatus`,
          {
            reportId: hiveReportId,
            reservedStatus: HiveReportStatus.RESERVED,
          },
        )
        .where('a.actionType = :reserve AND a.memberId = :memberId', {
          reserve: HiveActionType.RESERVE,
          memberId: member.id,
        })
        .getOne();
      if (!reserveAction) {
        throw new BusinessException(
          ErrorType.INVALID_HIVE_REPORT_STATUS,
          'Hive report must be in RESERVED state and reserved by you',
        );
      }

      await manager
        .getRepository(HiveReport)
        .update(hiveReportId, { status: HiveReportStatus.REMOVED });

      const actionRepo = manager.getRepository(HiveAction);
      const rewardRepo = manager.getRepository(Reward);
      const memberRepo = manager.getRepository(Member);

      const proofAction = actionRepo.create({
        hiveReport: { id: hiveReportId } as HiveReport,
        member: { id: member.id } as Member,
        actionType,
        imageUrl,
        latitude,
        longitude,
      });
      const savedAction = await actionRepo.save(proofAction);

      const reward = rewardRepo.create({
        points: 100,
        action: { id: savedAction.id } as HiveAction,
        member: { id: member.id } as Member,
      });
      const savedReward = await rewardRepo.save(reward);
      await memberRepo.increment(
        { id: member.id },
        'points',
        savedReward.points,
      );

      return {
        hiveReportId,
        actionId: savedAction.id,
        rewardId: savedReward.id,
        status: HiveReportStatus.REMOVED,
        imageUrl,
      };
    });
  }
}
