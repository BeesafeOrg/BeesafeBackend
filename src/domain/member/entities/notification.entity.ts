import { Column, Entity, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../../common/database/base.entity';
import { Member } from './member.entity';

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

  @Column({ default: false })
  isRead: boolean;

  @Column({ name: 'read_at', type: 'timestamp', nullable: true })
  readAt: Date | null;
}
