import { ApiProperty } from '@nestjs/swagger';

export class PaginatedDto<T, M = {}> {
  @ApiProperty({ type: [Object] })
  results: T[];

  @ApiProperty({
    description: '페이지네이션 - 현재 페이지',
    example: 1,
  })
  page: number;

  @ApiProperty({
    description: '페이지네이션 - 한번에 불러올 데이터 갯수',
    example: 100,
  })
  size: number;

  @ApiProperty({
    description: '페이지네이션 - 데이터의 총 개수',
    example: 50,
  })
  total: number;

  @ApiProperty({ required: false })
  meta?: M;
}
