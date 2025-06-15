import { Module } from '@nestjs/common';
import { MemberService } from './member.service';
import { MemberController } from './member.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Member } from './entities/member.entity';
import { InterestArea } from './entities/interest-area.entity';
import { Notification } from './entities/notification.entity';
import { ConfigService } from '@nestjs/config';
import { FcmService } from '../../common/fcm/fcm.service';

@Module({
  imports: [TypeOrmModule.forFeature([Member, InterestArea, Notification])],
  controllers: [MemberController],
  providers: [MemberService, ConfigService, FcmService],
  exports: [MemberService],
})
export class MemberModule {}
