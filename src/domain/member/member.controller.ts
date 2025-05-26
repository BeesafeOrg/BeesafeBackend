import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { MemberService } from './member.service';
import { JwtAccessGuard } from '../auth/guards/jwt-access.guard';
import { MemberResponseDto } from './dto/member-response.dto';
import { MemberRoles } from '../auth/decorators/member-roles.decorator';
import { MemberRole } from './constant/member-role.enum';
import { MemberRoleGuard } from '../auth/guards/member-role-guard';

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

  @Get('beekeeper')
  @MemberRoles(MemberRole.BEEKEEPER)
  testBeekeeper(@Req() req: any) {
    return req.user.role;
  }
}
