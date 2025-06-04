import { ErrorType } from './error-code.enum';
import { HttpStatus } from '@nestjs/common';

export interface ErrorMeta {
  code: number;
  message: string;
  status: HttpStatus;
}

export const ERROR_META: Record<ErrorType, ErrorMeta> = {
  /* common */
  [ErrorType.INVALID_REQUEST]: {
    code: 40001,
    message: 'Invalid request',
    status: HttpStatus.BAD_REQUEST,
  },
  [ErrorType.UNAUTHORIZED]: {
    code: 40002,
    message: 'Unauthorized',
    status: HttpStatus.UNAUTHORIZED,
  },
  [ErrorType.FORBIDDEN]: {
    code: 40003,
    message: 'Forbidden',
    status: HttpStatus.FORBIDDEN,
  },
  [ErrorType.RESOURCE_NOT_FOUND]: {
    code: 40004,
    message: 'Resource not found',
    status: HttpStatus.NOT_FOUND,
  },
  [ErrorType.DATABASE_ERROR]: {
    code: 40005,
    message: 'Database Error',
    status: HttpStatus.BAD_REQUEST,
  },
  [ErrorType.INVALID_FILE_FORMAT]: {
    code: 40006,
    message: 'The file was not transferred',
    status: HttpStatus.BAD_REQUEST,
  },
  [ErrorType.INTERNAL_SERVER_ERROR]: {
    code: 50000,
    message: 'Internal server error',
    status: HttpStatus.INTERNAL_SERVER_ERROR,
  },

  /* auth */
  [ErrorType.KAKAO_LOGIN_FAILED]: {
    code: 41001,
    message: 'Kakao login failed',
    status: HttpStatus.UNAUTHORIZED,
  },
  [ErrorType.INVALID_REFRESH_TOKEN]: {
    code: 41002,
    message: 'Invalid refresh token',
    status: HttpStatus.UNAUTHORIZED,
  },
  [ErrorType.INVALID_ACCESS_TOKEN]: {
    code: 41003,
    message: 'Invalid access token',
    status: HttpStatus.UNAUTHORIZED,
  },
  [ErrorType.REFRESH_TOKEN_EXPIRED]: {
    code: 41004,
    message: 'Expired refresh token',
    status: HttpStatus.UNAUTHORIZED,
  },
  [ErrorType.ACCESS_TOKEN_EXPIRED]: {
    code: 41005,
    message: 'Expired access token',
    status: HttpStatus.UNAUTHORIZED,
  },
  [ErrorType.FORBIDDEN_RESOURCE]: {
    code: 41006,
    message: 'Forbidden resource (Invalid role)',
    status: HttpStatus.FORBIDDEN,
  },

  /* member */
  [ErrorType.MEMBER_NOT_FOUND]: {
    code: 42001,
    message: 'Member not found',
    status: HttpStatus.NOT_FOUND,
  },
  [ErrorType.INVALID_INTEREST_AREA_COUNT]: {
    code: 42002,
    message: 'Invalid interest area count',
    status: HttpStatus.BAD_REQUEST,
  },
  [ErrorType.INVALID_REGION_CODE]: {
    code: 42003,
    message: 'Invalid or duplicated region districtCode',
    status: HttpStatus.BAD_REQUEST,
  },

  /* region */
  [ErrorType.INVALID_REGION_DISTRICT_CODE]: {
    code: 43001,
    message: 'Invalid region district code',
    status: HttpStatus.BAD_REQUEST,
  },

  /* hive-report */
  [ErrorType.HIVE_REPORT_NOT_FOUND]: {
    code: 44001,
    message: 'Hive report not found',
    status: HttpStatus.NOT_FOUND,
  },
  [ErrorType.ALREADY_UPLOADED_HIVE_REPORT]: {
    code: 44002,
    message: 'Already uploaded hive report',
    status: HttpStatus.CONFLICT,
  },

  /* openai */
  // 네트워크·rate-limit 등 OpenAI SDK 오류
  [ErrorType.VISION_SERVICE_UNAVAILABLE]: {
    code: 55001,
    message: 'Openai vision service unavailable',
    status: HttpStatus.INTERNAL_SERVER_ERROR,
  },
  // content_filter(blocked) 이거나 응답 형식 불일치
  [ErrorType.INVALID_VISION_RESPONSE]: {
    code: 55002,
    message: 'Invalid openai vision response',
    status: HttpStatus.INTERNAL_SERVER_ERROR,
  },
  [ErrorType.VISION_JSON_PARSE_ERROR]: {
    code: 55003,
    message: 'Openai vision json parse error',
    status: HttpStatus.INTERNAL_SERVER_ERROR,
  },
  [ErrorType.VISION_SCHEMA_MISMATCH]: {
    code: 55004,
    message: 'Openai vision schema mismatch',
    status: HttpStatus.INTERNAL_SERVER_ERROR,
  },
};
