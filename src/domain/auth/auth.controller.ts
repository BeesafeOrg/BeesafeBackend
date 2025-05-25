import { Controller, Get, Post, Query } from '@nestjs/common';
import { AuthService } from './auth.service';
import { JwtResponseDto } from './dto/jwt-response.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('kakao/login')
  async kakaoCallback(@Query('token') token: string): Promise<JwtResponseDto> {
    const profile = await this.authService.getProfile(token);
    const member = await this.authService.upsertMember(profile);

    return await this.authService.issueTokens(member);
  }
}
