import { CreateMemberDto } from './create-member.dto';

export class MemberResponseDto extends CreateMemberDto {
  memberId: string;
  role?: string;
}
