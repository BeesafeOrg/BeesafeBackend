import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { HttpModule } from '@nestjs/axios';
import { MemberModule } from '../member/member.module';
import { JwtModule } from '@nestjs/jwt';
import { JwtAccessGuard } from './guards/jwt-access.guard';
import { JwtAccessStrategy } from './strategies/jwt-access.strategy';
import { RedisModule } from '../../common/redis/redis.module';

@Module({
  imports: [HttpModule, MemberModule, JwtModule.register({}), RedisModule],
  controllers: [AuthController],
  providers: [AuthService, JwtAccessGuard, JwtAccessStrategy],
  exports: [JwtAccessGuard],
})
export class AuthModule {}
