import { Column, Entity, JoinColumn, ManyToOne, OneToOne } from 'typeorm';
import { BaseEntity } from '../../../common/database/base.entity';
import { HiveAction } from './hive-action.entity';
import { Member } from '../../member/entities/member.entity';

@Entity('reward')
export class Reward extends BaseEntity {
  @Column({ type: 'decimal', precision: 8, scale: 2 })
  points: number;

  @OneToOne(() => HiveAction, (a) => a.reward, { onDelete: 'CASCADE' })
  @JoinColumn()
  actor: HiveAction;

  @ManyToOne(() => Member, (m) => m.rewards, { onDelete: 'CASCADE' })
  member: Member;
}
