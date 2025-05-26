import { ErrorCode } from './error-code.enum';
import { HttpStatus } from '@nestjs/common';

export interface ErrorMeta {
  code: number;
  message: string;
  status: HttpStatus;
}

export const ERROR_META: Record<ErrorCode, ErrorMeta> = {
  /* common */
  [ErrorCode.INVALID_REQUEST]: {
    code: 40000,
    message: 'Invalid request',
    status: HttpStatus.BAD_REQUEST,
  },
  [ErrorCode.UNAUTHORIZED]: {
    code: 40001,
    message: 'Unauthorized',
    status: HttpStatus.UNAUTHORIZED,
  },
  [ErrorCode.FORBIDDEN]: {
    code: 40002,
    message: 'Forbidden',
    status: HttpStatus.FORBIDDEN,
  },
  [ErrorCode.RESOURCE_NOT_FOUND]: {
    code: 40003,
    message: 'Resource not found',
    status: HttpStatus.NOT_FOUND,
  },
  [ErrorCode.INTERNAL_SERVER_ERROR]: {
    code: 50000,
    message: 'Internal server error',
    status: HttpStatus.INTERNAL_SERVER_ERROR,
  },

  /* auth */
  [ErrorCode.KAKAO_LOGIN_FAILED]: {
    code: 41001,
    message: 'Kakao login failed',
    status: HttpStatus.UNAUTHORIZED,
  },
  [ErrorCode.INVALID_REFRESH_TOKEN]: {
    code: 41002,
    message: 'Invalid refresh token',
    status: HttpStatus.UNAUTHORIZED,
  },
  [ErrorCode.INVALID_ACCESS_TOKEN]: {
    code: 41003,
    message: 'Invalid access token',
    status: HttpStatus.UNAUTHORIZED,
  },
  [ErrorCode.REFRESH_TOKEN_EXPIRED]: {
    code: 41004,
    message: 'Expired refresh token',
    status: HttpStatus.UNAUTHORIZED,
  },
  [ErrorCode.ACCESS_TOKEN_EXPIRED]: {
    code: 41005,
    message: 'Expired access token',
    status: HttpStatus.UNAUTHORIZED,
  },
};
