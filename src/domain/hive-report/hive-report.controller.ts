import {
  Body,
  Controller,
  Get,
  ParseIntPipe,
  Post,
  Query,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { HiveReportService } from './hive-report.service';
import { JwtAccessGuard } from '../auth/guards/jwt-access.guard';
import { MemberRoleGuard } from '../auth/guards/member-role-guard';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
} from '@nestjs/swagger';
import { MemberRoles } from '../auth/decorators/member-roles.decorator';
import { MemberRole } from '../member/constant/member-role.enum';
import { FileInterceptor } from '@nestjs/platform-express';
import { BusinessException } from '../../common/filters/exception/business-exception';
import { ErrorType } from '../../common/filters/exception/error-code.enum';
import { CreateHiveReportDto } from './dto/create-hive-report.dto';
import { OpenAiResponseOfHiveReportImageDto } from './dto/open-ai-response-of-hive-report-image.dto';
import { RequestMember } from '../auth/dto/request-member.dto';
import { HiveReportsResponseDto } from './dto/hive-reports-response.dto';
import { HiveReportStatus } from './constant/hive-report-status.enum';
import { PaginatedDto } from '../../common/dto/paginated.dto';

@Controller('hive-reports')
@UseGuards(JwtAccessGuard, MemberRoleGuard)
@ApiBearerAuth('jwt-access')
export class HiveReportController {
  constructor(private readonly hiveReportService: HiveReportService) {}

  @Post('image')
  @UseInterceptors(FileInterceptor('file'))
  @MemberRoles(MemberRole.REPORTER)
  @ApiOperation({ summary: '벌집 신고서 사진 업로드' })
  @ApiResponse({ status: 2000, description: '성공적으로 업로드되었습니다.' })
  async uploadFile(
    @Req() req: RequestMember,
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
  @MemberRoles(MemberRole.REPORTER)
  @ApiOperation({ summary: '벌집 신고서 사진 업로드' })
  @ApiResponse({ status: 2000, description: '성공적으로 업로드되었습니다.' })
  async createFinalReport(
    @Req() req: RequestMember,
    @Body() createDto: CreateHiveReportDto,
  ): Promise<void> {
    await this.hiveReportService.finalizeReport(req.user.memberId, createDto);
  }

  @Get('me')
  @ApiOperation({ summary: '나의 벌집 신고서 조회' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'size', required: false, type: Number, example: 20 })
  @ApiQuery({
    name: 'statusFilter',
    required: false,
    enum: HiveReportStatus,
  })
  @ApiResponse({ status: 2000, description: '성공적으로 조회되었습니다.' })
  async getMyReports(
    @Req() req: RequestMember,
    @Query('page', new ParseIntPipe({ optional: true })) page = 1,
    @Query('size', new ParseIntPipe({ optional: true })) size = 100,
    @Query('statusFilter') statusFilter?: HiveReportStatus,
  ): Promise<PaginatedDto<HiveReportsResponseDto>> {
    return await this.hiveReportService.findMyReports(
      req.user.memberId,
      req.user.role,
      page,
      size,
      statusFilter,
    );
  }
}
