import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { MemberService } from './member.service';
import { JwtAccessGuard } from '../auth/guards/jwt-access.guard';

@Controller('members')
export class MemberController {
  constructor(private readonly memberService: MemberService) {}

  @Get('me')
  @UseGuards(JwtAccessGuard)
  testMe(@Req() req: any) {
    return req.user.memberId;
  }
}
