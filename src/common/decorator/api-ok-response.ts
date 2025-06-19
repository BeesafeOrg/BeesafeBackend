import { applyDecorators, Type } from '@nestjs/common';
import { ApiOkResponse, ApiExtraModels, getSchemaPath } from '@nestjs/swagger';
import { CommonResponseDto } from '../dto/common-response.dto';

export const ApiOkResponseCommon = <TModel extends Type<any>>(model: TModel) =>
  applyDecorators(
    ApiExtraModels(CommonResponseDto, model),
    ApiOkResponse({
      schema: {
        allOf: [
          { $ref: getSchemaPath(CommonResponseDto) },
          { properties: { data: { $ref: getSchemaPath(model) } } },
        ],
      },
    }),
  );
