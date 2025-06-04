import { MemberRole } from '../../member/constant/member-role.enum';

export class DecodedJwtDto {
  memberId: string;
  role: MemberRole;
  jti?: string;
}
