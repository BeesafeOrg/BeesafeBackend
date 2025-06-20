import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { map, Observable } from 'rxjs';
import { CommonResponseDto } from '../dto/common-response.dto';

@Injectable()
export class SuccessInterceptor<T>
  implements NestInterceptor<T, CommonResponseDto<T>>
{
  intercept(
    ctx: ExecutionContext,
    next: CallHandler,
  ): Observable<CommonResponseDto<T>> {
    const req = ctx.switchToHttp().getRequest();
    if (req.originalUrl === '/api/env' || req.url === '/api/env') {
      return next.handle();
    }

    return next.handle().pipe(
      map((data) => ({
        code: 2000,
        message: 'OK',
        data,
      })),
    );
  }
}
