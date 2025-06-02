import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { HiveReport } from './entities/hive-report.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { OpenAiResponseOfHiveReportImageDto } from './dto/open-ai-response-of-hive-report-image.dto';
import { MemberService } from '../member/member.service';
import { BusinessException } from '../../common/filters/exception/business-exception';
import { ErrorType } from '../../common/filters/exception/error-code.enum';
import { Species } from './constant/species.enum';

@Injectable()
export class HiveReportService {
  constructor(
    @InjectRepository(HiveReport)
    private readonly hiveReportRepo: Repository<HiveReport>,
    private readonly memberService: MemberService,
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

    // const { isValid, reason } = await this.openaiService.verifyImageByType(
    //   imageUrl,
    //   ecoVerification.type,
    // );

    let record = this.hiveReportRepo.create({
      reporter: member,
      imageUrl,
      aiResponseOfSpecies: Species.HONEYBEE, // TODO
      aiConfidenceOfSpecies: 0.92,
      aiReasonOfSpecies: '', // TODO
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
}
