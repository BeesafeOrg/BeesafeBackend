import { Column, Entity, JoinColumn, ManyToOne, Unique } from 'typeorm';
import { Member } from './member.entity';
import { BaseEntity } from '../../../common/database/base.entity';
import { Region } from '../../region/entities/region.entity';

@Entity('interest_area')
@Unique(['member', 'region'])
export class InterestArea extends BaseEntity {
  @ManyToOne(() => Member, (m) => m.interestAreas, { onDelete: 'CASCADE' })
  member: Member;

  @Column({ length: 5 })
  districtCode: string;

  @ManyToOne(() => Region, { eager: true })
  @JoinColumn({ name: 'districtCode', referencedColumnName: 'code' })
  region: Region;
}
