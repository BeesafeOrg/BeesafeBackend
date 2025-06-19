import {
  Body,
  Controller,
  Delete,
  Get,
  ParseIntPipe,
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { MemberService } from './member.service';
import { JwtAccessGuard } from '../auth/guards/jwt-access.guard';
import { MemberResponseDto } from './dto/member-response.dto';
import { MemberRoleGuard } from '../auth/guards/member-role-guard';
import { MemberRole } from './constant/member-role.enum';
import { MemberRoles } from '../auth/decorators/member-roles.decorator';
import { UpdateInterestAreaDto } from './dto/update-interest-area.dto';
import { RegionGroupedDto } from '../region/dto/region-grouped.dto';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
} from '@nestjs/swagger';
import { RequestMember } from '../auth/dto/request-member.dto';
import { PaginatedDto } from '../../common/dto/paginated.dto';
import { NotificationItemDto } from './dto/notification-response.dto';
import { ApiOkResponseCommon } from '../../common/decorator/api-ok-response';
import { ApiOkArrayResponseCommon } from '../../common/decorator/api-ok-array-response';
import { ApiOkVoidResponseCommon } from '../../common/decorator/api-ok-void-response';
import { ApiOkResponsePaginated } from '../../common/decorator/api-ok-pagination-response';

@Controller('members')
@UseGuards(JwtAccessGuard, MemberRoleGuard)
@ApiBearerAuth('jwt-access')
export class MemberController {
  constructor(private readonly memberService: MemberService) {}

  @Get('me')
  @ApiOperation({ summary: '회원 정보 조회' })
  @ApiOkResponseCommon(MemberResponseDto)
  async getMyInfo(@Req() req: RequestMember): Promise<MemberResponseDto> {
    const member = await this.memberService.findByIdOrThrowException(
      req.user.memberId,
    );
    return {
      memberId: member.id,
      email: member.email,
      nickname: member.nickname,
      profileImageUrl: member.profileImageUrl,
      role: member.role,
      points: member.points,
    };
  }

  @Put('me/interest-areas')
  @MemberRoles(MemberRole.BEEKEEPER)
  @ApiOperation({ summary: '양봉업자 관심지역 설정' })
  @ApiOkVoidResponseCommon()
  async setInterestAreas(
    @Req() req: RequestMember,
    @Body() dto: UpdateInterestAreaDto,
  ): Promise<void> {
    await this.memberService.setInterestAreas(req.user.memberId, dto.areas);
  }

  @Get('me/interest-areas')
  @MemberRoles(MemberRole.BEEKEEPER)
  @ApiOperation({ summary: '양봉업자 관심지역 조회' })
  @ApiOkArrayResponseCommon(RegionGroupedDto)
  async getInterestAreas(
    @Req() req: RequestMember,
  ): Promise<RegionGroupedDto[]> {
    return await this.memberService.getInterestAreas(req.user.memberId);
  }

  @Get('me/notifications')
  @ApiOperation({ summary: '알림내역 조회' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'size', required: false, type: Number, example: 100 })
  @ApiOkResponsePaginated(NotificationItemDto)
  async getNotifications(
    @Req() req: RequestMember,
    @Query('page', new ParseIntPipe({ optional: true })) page = 1,
    @Query('size', new ParseIntPipe({ optional: true })) size = 100,
  ): Promise<PaginatedDto<NotificationItemDto>> {
    return await this.memberService.getNotifications(
      req.user.memberId,
      page,
      size,
    );
  }

  @Delete('me')
  @ApiOperation({ summary: '회원 탈퇴' })
  @ApiOkVoidResponseCommon()
  async delete(@Req() req: RequestMember): Promise<void> {
    await this.memberService.delete(req.user.memberId);
  }
}
