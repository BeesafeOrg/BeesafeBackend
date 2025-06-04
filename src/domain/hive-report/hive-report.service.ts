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
import { HiveReportsResponseDto } from './dto/hive-reports-response.dto';
import { PaginatedDto } from '../../common/dto/paginated.dto';
import { HiveActionType } from './constant/hive-actions-type.enum';
import { HiveAction } from './entities/hive-action.entity';
import { MemberRole } from '../member/constant/member-role.enum';
import { Species } from './constant/species.enum';
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
  ): Promise<PaginatedDto<HiveReportsResponseDto>> {
    const take = Math.min(size);
    const skip = (page - 1) * take;

    const actionType =
      memberRole === MemberRole.BEEKEEPER
        ? HiveActionType.HONEYBEE_PROOF
        : HiveActionType.REPORT;

    const qb = this.hiveReportRepo
      .createQueryBuilder('report')
      .innerJoin(
        'report.actions',
        'action',
        'action.actionType = :actionType AND action.memberId = :memberId',
        { actionType, memberId },
      )
      .orderBy('report.createdAt', 'DESC')
      .skip(skip)
      .take(take);

    if (statusFilter) {
      qb.andWhere('report.status = :status', { status: statusFilter });
    }
    if (memberRole === MemberRole.BEEKEEPER) {
      qb.andWhere('report.species = :species', { species: Species.HONEYBEE });
    }

    const [records, total] = await qb.getManyAndCount();
    return {
      results: records.map((r) => ({
        hiveReportId: r.id,
        species: r.species,
        status: r.status,
        roadAddress: r.roadAddress,
        createdAt: r.createdAt,
      })),
      page,
      size,
      total,
    };
  }

  async reserveReport(
    hiveReportId: string,
    beekeeperId: string,
  ): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      const beekeeper = await manager
        .getRepository(Member)
        .findOne({ where: { id: beekeeperId } });
      if (!beekeeper) {
        throw new BusinessException(ErrorType.MEMBER_NOT_FOUND);
      }

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

      const action = manager.getRepository(HiveAction).create({
        hiveReport: report,
        member: beekeeper,
        actionType: HiveActionType.RESERVE,
      });
      await manager.getRepository(HiveAction).save(action);

      report.status = HiveReportStatus.RESERVED;
      await manager.getRepository(HiveReport).save(report);
    });
  }
}
