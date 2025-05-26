import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { HttpModule } from '@nestjs/axios';
import { MemberModule } from '../member/member.module';

@Module({
  imports: [HttpModule, MemberModule],
  controllers: [AuthController],
  providers: [AuthService],
})
export class AuthModule {}
