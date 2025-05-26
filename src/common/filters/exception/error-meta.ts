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
  [ErrorType.TYPE_ERROR]: {
    code: 40006,
    message: 'Type Error',
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

  /* member */
  [ErrorType.Member_NOT_FOUND]: {
    code: 42001,
    message: 'Member not found',
    status: HttpStatus.NOT_FOUND,
  },
};
