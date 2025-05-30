import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
} from 'typeorm';
import { Member } from '../../member/entities/member.entity';
import { Reward } from './reward.entity';
import { pointTransformer } from '../constant/point-transformer';
import { Species } from '../constant/species.enum';
import { HiveReportStatus } from '../constant/hive-report-status.enum';
import { BaseEntity } from '../../../common/database/base.entity';
import { Region } from '../../region/entities/region.entity';

@Entity('hive_report')
export class HiveReport extends BaseEntity {
  @ManyToOne(() => Member, (m) => m.reports, { onDelete: 'SET NULL' })
  reporter: Member;

  @Column({
    type: 'point',
    spatialFeatureType: 'Point',
    srid: 4326,
    transformer: pointTransformer,
  })
  @Index({ spatial: true })
  location: { lat: number; lng: number };

  @Column({ type: 'enum', enum: Species })
  species: Species;

  @Column({ type: 'enum', enum: HiveReportStatus })
  status: HiveReportStatus;

  @Column()
  roadAddress: string;

  @Column({ length: 5 })
  districtCode: string;

  @ManyToOne(() => Region)
  @JoinColumn({ name: 'districtCode', referencedColumnName: 'districtCode' })
  region: Region;

  @Column({ length: 255 })
  imageUrl: string;

  @OneToMany(() => Reward, (r) => r.hiveReport)
  rewards: Reward[];
}
