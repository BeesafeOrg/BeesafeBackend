import { Column, Entity, Index, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../../common/database/base.entity';
import { Member } from './member.entity';
import { HiveReport } from '../../hive-report/entities/hive-report.entity';
import { NotificationType } from '../constant/notification-type.enum';

@Entity('notification')
@Index(['member', 'hiveReport'], { unique: true })
export class Notification extends BaseEntity {
  @ManyToOne(() => Member, (m) => m.notifications, { onDelete: 'CASCADE' })
  member: Member;

  @ManyToOne(() => HiveReport, { onDelete: 'SET NULL' })
  hiveReport: HiveReport | null;

  @Column({ type: 'enum', enum: NotificationType })
  type: NotificationType;

  @Column({ length: 100 })
  title: string;

  @Column({ length: 255 })
  message: string;

  @Column({ name: 'read_at', type: 'timestamp', nullable: true })
  readAt: Date | null;
}
