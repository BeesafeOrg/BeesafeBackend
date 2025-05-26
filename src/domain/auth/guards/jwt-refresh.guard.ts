import { AuthGuard } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';
import { BusinessException } from '../../../common/filters/exception/business-exception';
import { ErrorCode } from '../../../common/filters/exception/error-code.enum';

@Injectable()
export class JwtRefreshGuard extends AuthGuard('jwt-refresh') {
  handleRequest(err, user, info) {
    if (info?.name === 'TokenExpiredError') {
      throw new BusinessException(ErrorCode.REFRESH_TOKEN_EXPIRED);
    }
    if (!user) {
      throw new BusinessException(ErrorCode.INVALID_REFRESH_TOKEN);
    }
    return user;
  }
}
