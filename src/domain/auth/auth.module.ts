import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { HttpModule } from '@nestjs/axios';
import { MemberModule } from '../member/member.module';
import { JwtModule } from '@nestjs/jwt';
import { JwtAccessGuard } from './guards/jwt-access.guard';
import { JwtAccessStrategy } from './strategies/jwt-access.strategy';
import { RedisModule } from '../../common/redis/redis.module';
import { JwtRefreshGuard } from './guards/jwt-refresh.guard';
import { JwtRefreshStrategy } from './strategies/jwt-refresh.strategy';
import { MemberRoleGuard } from './guards/member-role-guard';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    HttpModule,
    MemberModule,
    JwtModule.register({}),
    RedisModule,
    ConfigModule,
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtAccessStrategy,
    JwtAccessGuard,
    JwtRefreshStrategy,
    JwtRefreshGuard,
    MemberRoleGuard,
  ],
  exports: [JwtAccessGuard, MemberRoleGuard],
})
export class AuthModule {}
