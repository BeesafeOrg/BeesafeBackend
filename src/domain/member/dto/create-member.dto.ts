import { IsEmail, IsNotEmpty } from 'class-validator';

export class CreateMemberDto {
  @IsNotEmpty()
  nickname: string;

  @IsEmail()
  email: string;

  @IsNotEmpty()
  profileImageUrl: string;
}
