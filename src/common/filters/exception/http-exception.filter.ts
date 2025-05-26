import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { BusinessException } from '../exception/business-exception';
import { ERROR_META } from '../exception/error-meta';
import { QueryFailedError } from 'typeorm';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly LOGGER = new Logger('EXCEPTION FILTER');

  async catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = ERROR_META.INVALID_REQUEST.status;
    let code = ERROR_META.INVALID_REQUEST.code;
    let message = ERROR_META.INVALID_REQUEST.message;

    Logger.error(exception, `[${request.method}] ${request.url} → ${status}`);

    /* business */
    if (exception instanceof BusinessException) {
      status = exception.getStatus();
      code = exception.errorNumber;
      message = exception.message;
      /* http */
    } else if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();
      message = typeof res === 'string' ? res : (res as any).message || message;
      /* database */
    } else if (exception instanceof QueryFailedError) {
      status = ERROR_META.DATABASE_ERROR.status;
      code = ERROR_META.DATABASE_ERROR.code;
      message = (exception as any).message ?? ERROR_META.DATABASE_ERROR.message;
      /* etc */
    } else if (exception instanceof Error) {
      status = ERROR_META.INTERNAL_SERVER_ERROR.status;
      code = ERROR_META.INTERNAL_SERVER_ERROR.code;
      message = exception.message;
    }

    const payload = {
      method: request.method,
      path: request.url,
      timestamp: new Date().toISOString(),
    };
    response.status(status).json({ code, message, ...payload });
  }
}
