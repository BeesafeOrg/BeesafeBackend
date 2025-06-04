import { Column, Entity, JoinColumn, ManyToOne, OneToMany } from 'typeorm';
import { Species } from '../constant/species.enum';
import { HiveReportStatus } from '../constant/hive-report-status.enum';
import { BaseEntity } from '../../../common/database/base.entity';
import { Region } from '../../region/entities/region.entity';
import { HiveAction } from './hive-action.entity';

@Entity('hive_report')
export class HiveReport extends BaseEntity {
  @OneToMany(() => HiveAction, (a) => a.hiveReport, { cascade: true })
  actions: HiveAction[];

  @Column({ type: 'decimal', precision: 10, scale: 6, nullable: true })
  latitude: number;

  @Column({ type: 'decimal', precision: 10, scale: 6, nullable: true })
  longitude: number;

  @Column({ type: 'enum', enum: Species, default: Species.NONE })
  species: Species;

  @Column({ type: 'enum', enum: Species })
  aiResponseOfSpecies: Species;

  @Column()
  aiConfidenceOfSpecies: number;

  @Column()
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

  @ManyToOne(() => Region)
  @JoinColumn({ name: 'districtCode', referencedColumnName: 'districtCode' })
  region: Region;

  @Column({ length: 255 })
  imageUrl: string;
}
