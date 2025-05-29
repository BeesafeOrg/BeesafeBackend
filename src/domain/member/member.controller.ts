import { Body, Controller, Get, Put, Req, UseGuards } from '@nestjs/common';
import { MemberService } from './member.service';
import { JwtAccessGuard } from '../auth/guards/jwt-access.guard';
import { MemberResponseDto } from './dto/member-response.dto';
import { MemberRoleGuard } from '../auth/guards/member-role-guard';
import { MemberRole } from './constant/member-role.enum';
import { MemberRoles } from '../auth/decorators/member-roles.decorator';
import { UpdateInterestAreaDto } from './dto/update-interest-area.dto';
import { RegionGroupedDto } from '../region/dto/region-grouped.dto';

@Controller('members')
@UseGuards(JwtAccessGuard, MemberRoleGuard)
export class MemberController {
  constructor(private readonly memberService: MemberService) {}

  @Get('me')
  async getMyInfo(@Req() req: any): Promise<MemberResponseDto> {
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
  async setInterestAreas(
    @Req() req: any,
    @Body() dto: UpdateInterestAreaDto,
  ): Promise<void> {
    await this.memberService.setInterestAreas(req.user.memberId, dto.areas);
  }

  @Get('me/interest-areas')
  @MemberRoles(MemberRole.BEEKEEPER)
  async getInterestAreas(@Req() req: any): Promise<RegionGroupedDto[]> {
    return await this.memberService.getInterestAreas(req.user.memberId);
  }
}
