import { Column, Entity, JoinColumn, ManyToOne, OneToMany } from 'typeorm';
import { Member } from '../../member/entities/member.entity';
import { Reward } from './reward.entity';
import { Species } from '../constant/species.enum';
import { HiveReportStatus } from '../constant/hive-report-status.enum';
import { BaseEntity } from '../../../common/database/base.entity';
import { Region } from '../../region/entities/region.entity';

@Entity('hive_report')
export class HiveReport extends BaseEntity {
  @ManyToOne(() => Member, (m) => m.reports, { onDelete: 'SET NULL' })
  reporter: Member;

  @Column({ nullable: true })
  latitude: number;

  @Column({ nullable: true })
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

  @OneToMany(() => Reward, (r) => r.hiveReport)
  rewards: Reward[];
}
