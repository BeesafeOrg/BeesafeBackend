import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { HttpModule } from '@nestjs/axios';
import { MemberModule } from '../member/member.module';
import { JwtModule } from '@nestjs/jwt';

@Module({
  imports: [HttpModule, MemberModule, JwtModule.register({})],
  controllers: [AuthController],
  providers: [AuthService],
})
export class AuthModule {}
