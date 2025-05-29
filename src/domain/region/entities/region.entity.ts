import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity('region')
export class Region {
  @PrimaryColumn({ length: 5 })
  districtCode: string;

  @Column({ length: 20 })
  city: string;

  @Column({ length: 20 })
  district: string;
}
