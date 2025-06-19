// src/common/swagger/success-response.decorator.ts
import { applyDecorators, Type } from '@nestjs/common';
import { ApiExtraModels, ApiOkResponse, getSchemaPath } from '@nestjs/swagger';
import { CommonResponseDto } from '../dto/common-response.dto';

export const ApiOkArrayResponseCommon = <TModel extends Type<any>>(
  model: TModel,
  description = '성공',
) =>
  applyDecorators(
    ApiExtraModels(CommonResponseDto, model),
    ApiOkResponse({
      description,
      schema: {
        allOf: [
          { $ref: getSchemaPath(CommonResponseDto) },
          {
            properties: {
              data: {
                type: 'array',
                items: { $ref: getSchemaPath(model) },
              },
            },
          },
        ],
      },
    }),
  );
