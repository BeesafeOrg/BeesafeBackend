import { Entity, ManyToOne, PrimaryColumn } from 'typeorm';
import { Member } from './member.entity';

@Entity('interest_area')
export class InterestArea {
  @PrimaryColumn({ length: 5 })
  districtCode: string;

  @ManyToOne(() => Member, (m) => m.interestAreas, { onDelete: 'CASCADE' })
  member: Member;
}
