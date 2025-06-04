import { Body, Controller, Get, Put, Req, UseGuards } from '@nestjs/common';
import { MemberService } from './member.service';
import { JwtAccessGuard } from '../auth/guards/jwt-access.guard';
import { MemberResponseDto } from './dto/member-response.dto';
import { MemberRoleGuard } from '../auth/guards/member-role-guard';
import { MemberRole } from './constant/member-role.enum';
import { MemberRoles } from '../auth/decorators/member-roles.decorator';
import { UpdateInterestAreaDto } from './dto/update-interest-area.dto';
import { RegionGroupedDto } from '../region/dto/region-grouped.dto';
import { ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { RequestMember } from '../auth/dto/request-member.dto';

@Controller('members')
@UseGuards(JwtAccessGuard, MemberRoleGuard)
@ApiBearerAuth('jwt-access')
export class MemberController {
  constructor(private readonly memberService: MemberService) {}

  @Get('me')
  @ApiOperation({ summary: '회원 정보 조회' })
  @ApiResponse({ status: 2000, description: '성공적으로 조회되었습니다.' })
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
    };
  }

  @Put('me/interest-areas')
  @MemberRoles(MemberRole.BEEKEEPER)
  @ApiOperation({ summary: '양봉업자 관심지역 설정' })
  @ApiResponse({ status: 2000, description: '성공적으로 설정되었습니다.' })
  async setInterestAreas(
    @Req() req: RequestMember,
    @Body() dto: UpdateInterestAreaDto,
  ): Promise<void> {
    await this.memberService.setInterestAreas(req.user.memberId, dto.areas);
  }

  @Get('me/interest-areas')
  @MemberRoles(MemberRole.BEEKEEPER)
  @ApiOperation({ summary: '양봉업자 관심지역 조회' })
  @ApiResponse({ status: 2000, description: '성공적으로 조회되었습니다.' })
  async getInterestAreas(
    @Req() req: RequestMember,
  ): Promise<RegionGroupedDto[]> {
    return await this.memberService.getInterestAreas(req.user.memberId);
  }
}
