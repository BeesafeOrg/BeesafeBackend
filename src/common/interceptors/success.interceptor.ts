import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { map, Observable } from 'rxjs';

export interface CommonResponseDto<T = unknown> {
  code: number;
  message: string;
  data: T;
}

@Injectable()
export class SuccessInterceptor<T>
  implements NestInterceptor<T, CommonResponseDto<T>>
{
  // 파라미터 이름을 ctx 로 그대로 사용
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
