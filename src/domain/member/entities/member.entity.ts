import { BaseEntity } from 'src/common/database/base.entity';
import { Column, Entity, OneToMany } from 'typeorm';
import { InterestArea } from './interest-area.entity';
import { Reward } from '../../hive-report/entities/reward.entity';
import { MemberRole } from '../constant/member-role.enum';
import { Notification } from './notification.entity';

@Entity('member')
export class Member extends BaseEntity {
  @Column({ type: 'enum', enum: MemberRole, nullable: true })
  role?: MemberRole;

  @Column({ nullable: true })
  fcmToken: string;

  @Column({ unique: true })
  email: string;

  @Column({ length: 40 })
  nickname: string;

  @Column({ length: 255 })
  profileImageUrl: string;

  @Column({ type: 'decimal', default: 0 })
  points: number;

  @OneToMany(() => Reward, (r) => r.member)
  rewards: Reward[];

  @OneToMany(() => InterestArea, (ia) => ia.member)
  interestAreas: InterestArea[];

  @OneToMany(() => Notification, (n) => n.member)
  notifications: Notification[];
}
