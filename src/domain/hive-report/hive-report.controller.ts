import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
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
  ApiParam,
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
import { HiveReportResponseDto } from './dto/hive-report-response.dto';
import { HiveReportStatus } from './constant/hive-report-status.enum';
import { PaginatedDto } from '../../common/dto/paginated.dto';
import { HiveReportDetailResponseDto } from './dto/hive-report-detail-response.dto';
import { CreateProofDto } from './dto/create-proof.dto';
import { HiveProofResponseDto } from './dto/hive-proof-response.dto';
import { HiveReportPinDto } from './dto/hive-report-pin.dto';
import { ApiOkResponseCommon } from '../../common/decorator/api-ok-response';
import { ApiOkArrayResponseCommon } from '../../common/decorator/api-ok-array-response';
import { AddressResponseDto } from './dto/address-response.dto';
import { MemberRewordDto } from './dto/member-reword.dto';
import { ApiOkResponsePaginated } from '../../common/decorator/api-ok-pagination-response';
import { ApiOkVoidResponseCommon } from '../../common/decorator/api-ok-void-response';

@Controller('hive-reports')
@UseGuards(JwtAccessGuard, MemberRoleGuard)
@ApiBearerAuth('jwt-access')
export class HiveReportController {
  constructor(private readonly hiveReportService: HiveReportService) {}

  @Get()
  @ApiOperation({ summary: '지도 표시 용 벌집 신고서 조회' })
  @ApiOkArrayResponseCommon(HiveReportPinDto)
  async getReports(
    @Query('minLat') minLat?: string,
    @Query('maxLat') maxLat?: string,
    @Query('minLng') minLng?: string,
    @Query('maxLng') maxLng?: string,
  ): Promise<HiveReportPinDto[]> {
    return this.hiveReportService.findReportsInBounds(
      minLat ? parseFloat(minLat) : undefined,
      maxLat ? parseFloat(maxLat) : undefined,
      minLng ? parseFloat(minLng) : undefined,
      maxLng ? parseFloat(maxLng) : undefined,
    );
  }

  @Post('image')
  @UseInterceptors(FileInterceptor('file'))
  @MemberRoles(MemberRole.REPORTER)
  @ApiOperation({ summary: '벌집 신고서 사진 업로드' })
  @ApiOkResponseCommon(OpenAiResponseOfHiveReportImageDto)
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
  @ApiOperation({ summary: '벌집 신고서 최종 업로드' })
  @ApiOkResponseCommon(AddressResponseDto)
  async createFinalReport(
    @Req() req: RequestMember,
    @Body() createDto: CreateHiveReportDto,
  ): Promise<AddressResponseDto> {
    return await this.hiveReportService.finalizeReport(
      req.user.memberId,
      createDto,
    );
  }

  @Get('me')
  @ApiOperation({ summary: '나의 벌집 신고서 조회' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'size', required: false, type: Number, example: 100 })
  @ApiQuery({
    name: 'statusFilter',
    required: false,
    enum: HiveReportStatus,
  })
  @ApiOkResponsePaginated(HiveReportResponseDto, MemberRewordDto)
  async getMyReports(
    @Req() req: RequestMember,
    @Query('page', new ParseIntPipe({ optional: true })) page = 1,
    @Query('size', new ParseIntPipe({ optional: true })) size = 100,
    @Query('statusFilter') statusFilter?: HiveReportStatus,
  ): Promise<PaginatedDto<HiveReportResponseDto, MemberRewordDto>> {
    return await this.hiveReportService.findMyReports(
      req.user.memberId,
      page,
      size,
      statusFilter,
    );
  }

  @Post(':hiveReportId/reserve')
  @MemberRoles(MemberRole.BEEKEEPER)
  @ApiOperation({ summary: '꿀벌집 제거 예약' })
  @ApiParam({ name: 'hiveReportId', description: '꿀벌집신고서 ID' })
  @ApiOkVoidResponseCommon()
  async reserve(
    @Req() req: RequestMember,
    @Param('hiveReportId') hiveReportId: string,
  ): Promise<void> {
    await this.hiveReportService.reserveReport(hiveReportId, req.user.memberId);
  }

  @Delete(':hiveReportId/reserve-action/:hiveActionId')
  @MemberRoles(MemberRole.BEEKEEPER)
  @ApiOperation({ summary: '꿀벌집 제거 예약 취소' })
  @ApiParam({ name: 'hiveReportId', description: '꿀벌집신고서 ID' })
  @ApiParam({ name: 'hiveActionId', description: '꿀벌집신고서 예약 액션 ID' })
  @ApiOkVoidResponseCommon()
  async cancelReservation(
    @Req() req: RequestMember,
    @Param('hiveReportId') hiveReportId: string,
    @Param('hiveActionId') hiveActionId: string,
  ): Promise<void> {
    await this.hiveReportService.cancelReservation(
      hiveReportId,
      hiveActionId,
      req.user.memberId,
    );
  }

  @Get(':hiveReportId')
  @ApiOperation({ summary: '벌집 신고서 상세 조회' })
  @ApiParam({ name: 'hiveReportId', description: '꿀벌집신고서 ID' })
  @ApiOkResponseCommon(HiveReportDetailResponseDto)
  async getReportDetails(
    @Req() req: RequestMember,
    @Param('hiveReportId') hiveReportId: string,
  ): Promise<HiveReportDetailResponseDto> {
    return await this.hiveReportService.findReportDetails(
      hiveReportId,
      req.user.memberId,
    );
  }

  @Post(':hiveReportId/proof')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: '벌집 신고서 제거 인증 사진 업로드' })
  @ApiParam({ name: 'hiveReportId', description: '꿀벌집신고서 ID' })
  @ApiOkResponseCommon(HiveProofResponseDto)
  async proof(
    @Req() req: RequestMember,
    @Param('hiveReportId') hiveReportId: string,
    @UploadedFile() file: Express.MulterS3.File,
    @Body() proofDto: CreateProofDto,
  ): Promise<HiveProofResponseDto> {
    if (!file) {
      throw new BusinessException(ErrorType.INVALID_FILE_FORMAT);
    }

    return await this.hiveReportService.proof(
      hiveReportId,
      req.user.memberId,
      proofDto,
      file.location,
    );
  }
}
