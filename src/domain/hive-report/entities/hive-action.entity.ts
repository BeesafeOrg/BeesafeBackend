import { Column, Entity, ManyToOne, OneToOne } from 'typeorm';
import { BaseEntity } from '../../../common/database/base.entity';
import { HiveReport } from './hive-report.entity';
import { Member } from '../../member/entities/member.entity';
import { HiveActionType } from '../constant/hive-actions-type.enum';
import { Reward } from './reward.entity';

@Entity('hive_action')
export class HiveAction extends BaseEntity {
  @ManyToOne(() => HiveReport, (r) => r.actions, { onDelete: 'CASCADE' })
  hiveReport: HiveReport;

  @ManyToOne(() => Member, { eager: true })
  member: Member;

  @Column({ type: 'enum', enum: HiveActionType })
  actionType: HiveActionType;

  @Column({ length: 255 })
  imageUrl: string;

  @Column({ type: 'decimal', precision: 10, scale: 6, nullable: true })
  latitude: number;

  @Column({ type: 'decimal', precision: 10, scale: 6, nullable: true })
  longitude: number;

  @OneToOne(() => Reward, (rw) => rw.actor, { cascade: true })
  reward?: Reward;
}
