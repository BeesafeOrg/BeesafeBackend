import { Module } from '@nestjs/common';
import { MemberService } from './member.service';
import { MemberController } from './member.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Member } from './entities/member.entity';
import { InterestArea } from './entities/interest-area.entity';
import { Notification } from './entities/notification.entity';
import { ConfigService } from '@nestjs/config';

@Module({
  imports: [TypeOrmModule.forFeature([Member, InterestArea, Notification])],
  controllers: [MemberController],
  providers: [MemberService, ConfigService],
  exports: [MemberService],
})
export class MemberModule {}
