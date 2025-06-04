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

@Injectable()
export class HiveReportService {
  constructor(
    @InjectRepository(HiveReport)
    private readonly hiveReportRepo: Repository<HiveReport>,
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

    let record = this.hiveReportRepo.create({
      reporter: member,
      imageUrl,
      aiResponseOfSpecies: species,
      aiConfidenceOfSpecies: confidence,
      aiReasonOfSpecies: reason,
    });
    record = await this.hiveReportRepo.save(record);

    return {
      hiveReportId: record.id,
      imageUrl: record.imageUrl,
      aiResponseOfSpecies: record.aiResponseOfSpecies,
      aiConfidenceOfSpecies: record.aiConfidenceOfSpecies,
      aiReasonOfSpecies: record.aiReasonOfSpecies,
    };
  }

  async finalizeReport(
    memberId: string,
    dto: CreateHiveReportDto,
  ): Promise<void> {
    const report = await this.hiveReportRepo.findOne({
      where: { id: dto.hiveReportId },
      relations: ['reporter'],
    });
    if (!report) {
      throw new BusinessException(ErrorType.HIVE_REPORT_NOT_FOUND);
    }
    if (report.reporter.id != memberId) {
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
    page: number,
    size: number,
    statusFilter?: HiveReportStatus,
  ): Promise<PaginatedDto<HiveReportsResponseDto>> {
    const take = Math.min(size);
    const skip = (page - 1) * take;

    const qb = this.hiveReportRepo
      .createQueryBuilder('report')
      .where('report.reporterId = :memberId', { memberId })
      .orderBy('report.createdAt', 'DESC')
      .skip(skip)
      .take(take);

    if (statusFilter) {
      qb.andWhere('report.status = :status', { status: statusFilter });
    }

    const records = await qb.getMany();
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
      total: records.length,
    };
  }
}
