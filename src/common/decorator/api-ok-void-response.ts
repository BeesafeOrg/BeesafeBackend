// src/common/swagger/success-response.decorator.ts
import { applyDecorators } from '@nestjs/common';
import {
  ApiExtraModels,
  ApiOkResponse,
  ApiProperty,
  getSchemaPath,
} from '@nestjs/swagger';

export class SuccessOnlyResponseDto {
  @ApiProperty({ example: 2000 })
  code: number;

  @ApiProperty({ example: 'OK' })
  message: string;
}

export function ApiOkVoidResponseCommon(description = '성공(데이터 없음)') {
  return applyDecorators(
    ApiExtraModels(SuccessOnlyResponseDto),
    ApiOkResponse({
      description,
      schema: { $ref: getSchemaPath(SuccessOnlyResponseDto) },
    }),
  );
}
