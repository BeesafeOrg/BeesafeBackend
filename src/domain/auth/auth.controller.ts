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
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RequestMember } from './dto/request-member.dto';
import { UpdateFcmTokenDto } from './dto/update-fcm-token.dto';
import { ApiOkResponseCommon } from '../../common/decorator/api-ok-response';
import { ApiOkVoidResponseCommon } from '../../common/decorator/api-ok-void-response';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('kakao/login')
  @ApiOperation({ summary: '카카오에서 사용자 정보 조회 및 저장 후 토큰 발급' })
  @ApiOkResponseCommon(JwtResponseDto)
  async kakaoCallback(@Query('token') token: string): Promise<JwtResponseDto> {
    const profile = await this.authService.getProfile(token);
    const member = await this.authService.upsertMember(profile);

    return await this.authService.issueTokens(member);
  }

  @Post('refresh')
  @UseGuards(JwtRefreshGuard)
  @ApiOperation({ summary: '액세스 및 리프레시 토큰 재발급' })
  @ApiOkResponseCommon(JwtResponseDto)
  async refresh(@Req() req: RequestMember): Promise<JwtResponseDto> {
    const { memberId, jti } = req.user;
    return await this.authService.rotate(memberId, jti);
  }

  @Post('logout')
  @UseGuards(JwtAccessGuard)
  @ApiBearerAuth('jwt-access')
  @ApiOperation({ summary: '로그아웃' })
  @ApiOkVoidResponseCommon()
  async logout(@Req() req: RequestMember): Promise<void> {
    await this.authService.revokeAll(req.user.memberId);
  }

  @Patch('role')
  @UseGuards(JwtAccessGuard)
  @ApiBearerAuth('jwt-access')
  @ApiOperation({ summary: '회원 역할 설정' })
  @ApiOkVoidResponseCommon()
  async setMemberRole(
    @Req() req: RequestMember,
    @Body() memberRoleDto: SetMemberRoleDto,
  ): Promise<void> {
    await this.authService.setMemberRole(req.user.memberId, memberRoleDto.role);
  }

  @Post('fcm-token')
  @UseGuards(JwtAccessGuard)
  @ApiBearerAuth('jwt-access')
  @ApiOperation({ summary: 'fcm 토큰 업데이트' })
  @ApiOkVoidResponseCommon()
  async updateFcmToken(
    @Req() req: RequestMember,
    @Body() dto: UpdateFcmTokenDto,
  ): Promise<void> {
    await this.authService.updateFcmToken(req.user.memberId, dto.fcmToken);
  }
}
