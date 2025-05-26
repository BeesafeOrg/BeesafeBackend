import {
  Body,
  Controller,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { JwtRefreshGuard } from './guards/jwt-refresh.guard';
import { JwtAccessGuard } from './guards/jwt-access.guard';
import { JwtResponseDto } from './dto/jwt-response.dto';
import { SetMemberRoleDto } from './dto/set-member-role.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('kakao/login')
  async kakaoCallback(@Query('token') token: string): Promise<JwtResponseDto> {
    const profile = await this.authService.getProfile(token);
    const member = await this.authService.upsertMember(profile);

    return await this.authService.issueTokens(member.id);
  }

  @Post('refresh')
  @UseGuards(JwtRefreshGuard)
  async refresh(@Req() req: any): Promise<JwtResponseDto> {
    const { memberId, jti } = req.user;
    return await this.authService.rotate(memberId, jti);
  }

  @Post('logout')
  @UseGuards(JwtAccessGuard)
  async logout(@Req() req: any): Promise<void> {
    await this.authService.revokeAll(req.user.memberId);
  }

  @Patch('role')
  @UseGuards(JwtAccessGuard)
  async setMemberRole(
    @Req() req: any,
    @Body() memberRoleDto: SetMemberRoleDto,
  ): Promise<void> {
    await this.authService.setMemberRole(req.user.memberId, memberRoleDto);
  }
}
