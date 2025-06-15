import { Column, Entity, JoinColumn, ManyToOne, OneToMany } from 'typeorm';
import { Species } from '../constant/species.enum';
import { HiveReportStatus } from '../constant/hive-report-status.enum';
import { BaseEntity } from '../../../common/database/base.entity';
import { Region } from '../../region/entities/region.entity';
import { HiveAction } from './hive-action.entity';
import { Notification } from '../../member/entities/notification.entity';

@Entity('hive_report')
export class HiveReport extends BaseEntity {
  @Column({ type: 'decimal', precision: 10, scale: 6, nullable: true })
  latitude: number;

  @Column({ type: 'decimal', precision: 10, scale: 6, nullable: true })
  longitude: number;

  @Column({ type: 'enum', enum: Species, default: Species.NONE })
  species: Species;

  @Column({ type: 'enum', enum: Species, nullable: true })
  aiResponseOfSpecies: Species;

  @Column({ nullable: true })
  aiConfidenceOfSpecies: number;

  @Column({ nullable: true })
  aiReasonOfSpecies: string;

  @Column({
    type: 'enum',
    enum: HiveReportStatus,
    nullable: true,
  })
  status: HiveReportStatus;

  @Column({ nullable: true })
  roadAddress: string;

  @Column({ length: 5, nullable: true })
  districtCode: string;

  @Column({ length: 255 })
  imageUrl: string;

  @OneToMany(() => HiveAction, (a) => a.hiveReport, {
    cascade: true,
    onDelete: 'CASCADE',
  })
  actions: HiveAction[];

  @ManyToOne(() => Region)
  @JoinColumn({ name: 'districtCode', referencedColumnName: 'districtCode' })
  region: Region;

  @OneToMany(() => Notification, (n) => n.hiveReport, {
    cascade: true,
    onDelete: 'CASCADE',
  })
  notifications: Notification[];
}
