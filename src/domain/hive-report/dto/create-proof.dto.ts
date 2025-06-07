import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsIn, IsLatitude, IsLongitude } from 'class-validator';
import { HiveActionType } from '../constant/hive-actions-type.enum';

export class CreateProofDto {
  @ApiProperty({
    enum: [HiveActionType.WASP_PROOF, HiveActionType.HONEYBEE_PROOF],
    example: HiveActionType.WASP_PROOF,
  })
  @IsEnum(HiveActionType, {
    message: 'actionType must be one of WASP_PROOF or HONEYBEE_PROOF',
  })
  @IsIn([HiveActionType.WASP_PROOF, HiveActionType.HONEYBEE_PROOF], {
    message: 'actionType must be WASP_PROOF or HONEYBEE_PROOF',
  })
  actionType: HiveActionType;

  @ApiProperty({
    description: '제거된 벌집 위치 (사용자 현위치 - 위도)',
    example: 37.123456,
  })
  @IsLatitude()
  latitude: number;

  @ApiProperty({
    description: '제거된 벌집 위치 (사용자 현위치 - 경도)',
    example: 127.654321,
  })
  @IsLongitude()
  longitude: number;
}
