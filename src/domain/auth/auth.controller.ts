import {
  Body,
  Controller,
  Get,
  Param,
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
import { MemberRole } from '../member/constant/member-role.enum';
import { Member } from '../member/entities/member.entity';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('kakao/login')
  @ApiOperation({ summary: '카카오에서 사용자 정보 조회 및 저장 후 토큰 발급' })
  @ApiResponse({ status: 2000, description: '성공적으로 발급되었습니다.' })
  async kakaoCallback(@Query('token') token: string): Promise<JwtResponseDto> {
    const profile = await this.authService.getProfile(token);
    const member = await this.authService.upsertMember(profile);

    return await this.authService.issueTokens(member);
  }

  @Post('refresh')
  @UseGuards(JwtRefreshGuard)
  @ApiOperation({ summary: '액세스 및 리프레시 토큰 재발급' })
  @ApiResponse({ status: 2000, description: '성공적으로 발급되었습니다.' })
  async refresh(@Req() req: any): Promise<JwtResponseDto> {
    const { memberId, jti } = req.user;
    return await this.authService.rotate(memberId, jti);
  }

  @Post('logout')
  @UseGuards(JwtAccessGuard)
  @ApiBearerAuth('jwt-access')
  @ApiOperation({ summary: '로그아웃' })
  @ApiResponse({ status: 2000, description: '성공적으로 로그아웃 되었습니다.' })
  async logout(@Req() req: any): Promise<void> {
    await this.authService.revokeAll(req.user.memberId);
  }

  @Patch('role')
  @UseGuards(JwtAccessGuard)
  @ApiBearerAuth('jwt-access')
  @ApiOperation({ summary: '회원 역할 설정' })
  @ApiResponse({ status: 2000, description: '성공적으로 설정되었습니다.' })
  async setMemberRole(
    @Req() req: any,
    @Body() memberRoleDto: SetMemberRoleDto,
  ): Promise<void> {
    await this.authService.setMemberRole(req.user.memberId, memberRoleDto);
  }

  // 테스트용
  @Get('/mylogin/beekeeper/:memberId')
  @ApiOperation({ summary: '양봉업자 토큰 생성 (테스트용)' })
  async myLogin1(@Param('memberId') memberId: string): Promise<JwtResponseDto> {
    return await this.authService.issueTokens({
      id: memberId,
      role: MemberRole.BEEKEEPER,
    } as Member);
  }

  // 테스트용
  @Get('/mylogin/reporter/:memberId')
  @ApiOperation({ summary: '신고자 토큰 생성 (테스트용)' })
  async myLogin2(@Param('memberId') memberId: string): Promise<JwtResponseDto> {
    return await this.authService.issueTokens({
      id: memberId,
      role: MemberRole.REPORTER,
    } as Member);
  }
}
