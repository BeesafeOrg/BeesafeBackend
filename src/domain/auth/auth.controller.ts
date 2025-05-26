import { Controller, Post, Query, Req, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { JwtRefreshGuard } from './guards/jwt-refresh.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('kakao/login')
  async kakaoCallback(@Query('token') token: string) {
    const profile = await this.authService.getProfile(token);
    const member = await this.authService.upsertMember(profile);

    return await this.authService.issueTokens(member.id);
  }

  @Post('refresh')
  @UseGuards(JwtRefreshGuard)
  async refresh(@Req() req: any) {
    const { memberId, jti } = req.user;
    return await this.authService.rotate(memberId, jti);
  }
}
