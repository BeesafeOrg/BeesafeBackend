import { Column, Entity, JoinColumn, ManyToOne, OneToOne } from 'typeorm';
import { BaseEntity } from '../../../common/database/base.entity';
import { HiveReport } from './hive-report.entity';
import { Member } from '../../member/entities/member.entity';
import { HiveActionType } from '../constant/hive-actions-type.enum';
import { Reward } from './reward.entity';

@Entity('hive_action')
export class HiveAction extends BaseEntity {
  @Column({ type: 'enum', enum: HiveActionType })
  actionType: HiveActionType;

  @Column({ length: 255, nullable: true })
  imageUrl?: string;

  @Column({ type: 'decimal', precision: 10, scale: 6, nullable: true })
  latitude?: number;

  @Column({ type: 'decimal', precision: 10, scale: 6, nullable: true })
  longitude?: number;

  @OneToOne(() => Reward, (rw) => rw.action, { cascade: true })
  reward?: Reward;

  @ManyToOne(() => HiveReport, (r) => r.actions, {
    nullable: false,
  })
  @JoinColumn()
  hiveReport: HiveReport;

  @ManyToOne(() => Member, (m) => m, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'memberId' })
  member: Member;
}
