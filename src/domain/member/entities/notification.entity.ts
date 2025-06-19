import { Column, Entity, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../../common/database/base.entity';
import { Member } from './member.entity';
import { NotificationType } from '../constant/notification-type.enum';
import { HiveReport } from '../../hive-report/entities/hive-report.entity';

@Entity('notification')
export class Notification extends BaseEntity {
  @ManyToOne(() => Member, (m) => m.notifications, { onDelete: 'CASCADE' })
  member: Member;

  @Column({ length: 100 })
  title: string;

  @Column({ type: 'text' })
  body: string;

  @Column({ type: 'json', nullable: true })
  data?: Record<string, any>;

  @Column({ type: 'enum', enum: NotificationType })
  type: NotificationType;

  @Column({ default: false })
  isRead: boolean;

  @ManyToOne(() => HiveReport, (r) => r.notifications, {
    nullable: true,
    onDelete: 'CASCADE',
  })
  hiveReport?: HiveReport;

  @Column({ nullable: true })
  address: string;
}
