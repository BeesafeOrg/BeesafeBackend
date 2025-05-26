import { SetMetadata } from '@nestjs/common';
import { MemberRole } from '../../member/constant/member-role.enum';

export const MEMBER_ROLES_KEY = 'roles';
export const MemberRoles = (...roles: MemberRole[]) =>
  SetMetadata(MEMBER_ROLES_KEY, roles);
