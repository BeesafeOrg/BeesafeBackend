import { IsEnum } from 'class-validator';
import { MemberRole } from '../../member/constant/member-role.enum';
import { ApiProperty } from '@nestjs/swagger';

export class SetMemberRoleDto {
  @ApiProperty({
    description: '회원 역할',
    example: 'BEEKEEPER',
  })
  @IsEnum(MemberRole)
  role: MemberRole;
}
