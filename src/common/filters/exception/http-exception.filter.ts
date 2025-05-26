import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { BusinessException } from '../exception/business-exception';
import { ERROR_META } from '../exception/error-meta';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  async catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const isHttpException = exception instanceof HttpException;
    const isBusinessException = exception instanceof BusinessException;
    const status: number = isHttpException
      ? (exception as HttpException).getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;

    console.error(`[${request.method}] ${request.url} →`, exception);

    const payload: Record<string, any> = {
      method: request.method,
      path: request.url,
      timestamp: new Date().toISOString(),
    };

    if (isBusinessException) {
      const { message, errorNumber } = exception as BusinessException;
      response.status(status).json({
        code: errorNumber,
        message: message,
        ...payload,
      });
    } else {
      const exceptionResponse = isHttpException
        ? (exception as HttpException).getResponse()
        : { message: ERROR_META['INTERNAL_SERVER_ERROR'].message };

      response.status(status).json({
        code: ERROR_META.INTERNAL_SERVER_ERROR.code,
        message:
          typeof exceptionResponse === 'string'
            ? exceptionResponse
            : JSON.stringify(exceptionResponse, null, 2),
        ...payload,
      });
    }
  }
}
