import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { TokenExpiredError } from 'jsonwebtoken';
import { BusinessException } from '../../../common/filters/exception/business-exception';
import { ErrorCode } from '../../../common/filters/exception/error-code.enum';

@Injectable()
export class JwtAccessGuard extends AuthGuard('jwt-access') {
  handleRequest(err: any, user: any, info: any) {
    if (info instanceof TokenExpiredError) {
      throw new BusinessException(ErrorCode.ACCESS_TOKEN_EXPIRED);
    }
    if (err) throw err;
    if (!user) {
      throw new BusinessException(ErrorCode.INVALID_ACCESS_TOKEN);
    }
    return user;
  }
}
