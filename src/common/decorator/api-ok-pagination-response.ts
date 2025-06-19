// src/common/swagger/ok-response-paginated.decorator.ts
import { applyDecorators, Type } from '@nestjs/common';
import { ApiOkResponse, ApiExtraModels, getSchemaPath } from '@nestjs/swagger';
import { PaginatedDto } from '../dto/paginated.dto';
import { CommonResponseDto } from '../dto/common-response.dto';

export const ApiOkResponsePaginated = <
  TItem extends Type<any>,
  TMeta extends Type<any> | null = null,
>(
  itemDto: TItem,
  metaDto: TMeta = null as TMeta,
  description = '성공',
) =>
  applyDecorators(
    ApiExtraModels(CommonResponseDto, PaginatedDto, itemDto, metaDto ?? Object),
    ApiOkResponse({
      description,
      schema: {
        allOf: [
          { $ref: getSchemaPath(CommonResponseDto) },
          {
            properties: {
              data: {
                allOf: [
                  { $ref: getSchemaPath(PaginatedDto) },
                  {
                    properties: {
                      results: {
                        type: 'array',
                        items: { $ref: getSchemaPath(itemDto) },
                      },
                      ...(metaDto
                        ? { meta: { $ref: getSchemaPath(metaDto) } }
                        : {}),
                    },
                  },
                ],
              },
            },
          },
        ],
      },
    }),
  );
