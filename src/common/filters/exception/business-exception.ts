import { HttpException } from '@nestjs/common';
import { ErrorCode } from './error-code.enum';
import { ERROR_META } from './error-meta';

export class BusinessException extends HttpException {
  readonly errorCode: ErrorCode;
  readonly errorNumber: number;

  constructor(errorCode: ErrorCode, overrideMessage?: string) {
    const { status, code, message } = ERROR_META[errorCode];
    super(
      {
        errorCode,
        errorNumber: code,
        message: overrideMessage ?? message,
      },
      status,
    );
    this.errorCode = errorCode;
    this.errorNumber = code;
  }
}
