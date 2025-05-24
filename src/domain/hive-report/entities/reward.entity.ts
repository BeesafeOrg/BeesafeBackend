import { Column, Entity, ManyToOne } from 'typeorm';
import { Member } from '../../member/entities/member.entity';
import { BaseEntity } from '../../../common/database/base.entity';
import { HiveReport } from './hive-report.entity';

@Entity('reward')
export class Reward extends BaseEntity {
  @Column({ type: 'decimal', precision: 8, scale: 2 })
  points: number;

  @ManyToOne(() => Member, (m) => m.rewards, { onDelete: 'CASCADE' })
  member: Member;

  @ManyToOne(() => HiveReport, (r) => r.rewards, { onDelete: 'CASCADE' })
  hiveReport: HiveReport;
}
