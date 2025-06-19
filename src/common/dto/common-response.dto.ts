import { ApiProperty } from '@nestjs/swagger';

export class CommonResponseDto<T = unknown> {
  @ApiProperty({ example: 2000 })
  code: number;

  @ApiProperty({ example: 'OK' })
  message: string;

  @ApiProperty()
  data: T;
}
