import {
  Injectable,
  NestInterceptor,
  CallHandler,
  ExecutionContext,
  Logger,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';

@Injectable()
export class RequestLoggerInterceptor implements NestInterceptor {
  private readonly LOGGER = new Logger('REQ');

  intercept(ctx: ExecutionContext, next: CallHandler): Observable<any> {
    const req = ctx.switchToHttp().getRequest();
    const host = req.headers.host;
    const { method, originalUrl: url } = req;
    const start = Date.now();

    return next.handle().pipe(
      tap(() => {
        const ms = Date.now() - start;
        this.LOGGER.log(`${host} ${method} ${url} +${ms}ms`);
      }),
    );
  }
}