import {
  Body,
  Controller,
  Post,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { HiveReportService } from './hive-report.service';
import { JwtAccessGuard } from '../auth/guards/jwt-access.guard';
import { MemberRoleGuard } from '../auth/guards/member-role-guard';
import { ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { MemberRoles } from '../auth/decorators/member-roles.decorator';
import { MemberRole } from '../member/constant/member-role.enum';
import { FileInterceptor } from '@nestjs/platform-express';
import { BusinessException } from '../../common/filters/exception/business-exception';
import { ErrorType } from '../../common/filters/exception/error-code.enum';
import { CreateHiveReportDto } from './dto/create-hive-report.dto';
import { OpenAiResponseOfHiveReportImageDto } from './dto/open-ai-response-of-hive-report-image.dto';

@Controller('hive-reports')
@UseGuards(JwtAccessGuard, MemberRoleGuard)
@ApiBearerAuth('jwt-access')
export class HiveReportController {
  constructor(private readonly hiveReportService: HiveReportService) {}

  @Post('image')
  @UseInterceptors(FileInterceptor('file'))
  @MemberRoles(MemberRole.BEEKEEPER)
  @ApiOperation({ summary: '벌집 신고서 사진 업로드' })
  @ApiResponse({ status: 2000, description: '성공적으로 업로드되었습니다.' })
  async uploadFile(
    @Req() req: any,
    @UploadedFile() file: Express.MulterS3.File,
  ): Promise<OpenAiResponseOfHiveReportImageDto> {
    if (!file) {
      throw new BusinessException(ErrorType.INVALID_FILE_FORMAT);
    }

    return await this.hiveReportService.verifyWithImage(
      req.user.memberId,
      file.location,
    );
  }

  @Post()
  @UseInterceptors(FileInterceptor('file'))
  @MemberRoles(MemberRole.BEEKEEPER)
  @ApiOperation({ summary: '벌집 신고서 사진 업로드' })
  @ApiResponse({ status: 2000, description: '성공적으로 업로드되었습니다.' })
  async createFinalReport(
    @Body() createDto: CreateHiveReportDto,
  ): Promise<void> {
    await this.hiveReportService.finalizeReport(createDto);
  }
}
