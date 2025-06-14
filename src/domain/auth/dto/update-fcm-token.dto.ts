import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class UpdateFcmTokenDto {
  @ApiProperty({
    description: 'fcm 토큰',
  })
  @IsString()
  fcmToken: string;
}
