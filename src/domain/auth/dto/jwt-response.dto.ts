import { ApiProperty } from '@nestjs/swagger';

export class JwtResponseDto {
  @ApiProperty({
    description: '액세스 토큰',
    example: 'eyJhbGci...',
  })
  accessToken: string;

  @ApiProperty({
    description: '리프레시 토큰',
    example: 'eyJhbGci...',
  })
  refreshToken: string;
}
