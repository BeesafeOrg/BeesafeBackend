import { CreateMemberDto } from './create-member.dto';
import { ApiProperty } from '@nestjs/swagger';

export class MemberResponseDto extends CreateMemberDto {
  @ApiProperty({
    description: '회원 아이디',
    example: 'ba30cca1-fa42-447e-bd34-944e0cfdb324',
  })
  memberId: string;

  @ApiProperty({
    description: '회원 역할',
    example: 'BEEKEEPER',
  })
  role?: string;

  @ApiProperty({
    description: '회원 리워드',
    example: '100',
  })
  points: number;
}
