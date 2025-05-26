import { IsEnum } from 'class-validator';
import { MemberRole } from '../../member/constant/member-role.enum';

export class SetMemberRoleDto {
  @IsEnum(MemberRole)
  role: MemberRole;
}
