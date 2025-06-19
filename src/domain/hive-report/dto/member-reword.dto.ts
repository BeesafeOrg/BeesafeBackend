import { ApiProperty } from '@nestjs/swagger';

export class MemberRewordDto {
  @ApiProperty({
    description: '회원 리워드 점수',
    example: 300,
  })
  points: number;
}
