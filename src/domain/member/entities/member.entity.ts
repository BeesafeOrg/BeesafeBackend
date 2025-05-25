import { BaseEntity } from 'src/common/database/base.entity';
import { Column, Entity, OneToMany } from 'typeorm';
import { InterestArea } from './interest-area.entity';
import { HiveReport } from '../../hive-report/entities/hive-report.entity';
import { Reward } from '../../hive-report/entities/reward.entity';
import { Role } from '../constant/role.enum';
import { Notification } from './notification.entity';

@Entity('member')
export class Member extends BaseEntity {
  @Column({ type: 'enum', enum: Role })
  role: Role;

  @Column({ unique: true })
  email: string;

  @Column({ length: 40 })
  nickname: string;

  @Column({ length: 255 })
  profileImageUrl: string;

  @OneToMany(() => HiveReport, (r) => r.reporter)
  reports: HiveReport[];

  @OneToMany(() => Reward, (r) => r.member)
  rewards: Reward[];

  @OneToMany(() => InterestArea, (ia) => ia.member)
  interestAreas: InterestArea[];

  @OneToMany(() => Notification, (n) => n.member)
  notifications: Notification[];
}
