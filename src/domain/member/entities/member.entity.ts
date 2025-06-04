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

  @Column({ unique: true })
  email: string;

  @Column({ length: 40 })
  nickname: string;

  @Column({ length: 255 })
  profileImageUrl: string;

  @OneToMany(() => Reward, (r) => r.member)
  rewards: Reward[];

  @OneToMany(() => InterestArea, (ia) => ia.member)
  interestAreas: InterestArea[];

  @OneToMany(() => Notification, (n) => n.member)
  notifications: Notification[];
}
