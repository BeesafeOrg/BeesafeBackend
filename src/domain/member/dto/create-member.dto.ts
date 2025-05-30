import { ApiProperty } from '@nestjs/swagger';

export class CreateMemberDto {
  @ApiProperty({
    description: '이름',
    example: '구진',
  })
  nickname: string;

  @ApiProperty({
    description: '이메일',
    example: 'goo@naver.com',
  })
  email: string;

  @ApiProperty({
    description: '프로필 이미지',
    example: 'http://blabla.jpg',
  })
  profileImageUrl: string;
}
