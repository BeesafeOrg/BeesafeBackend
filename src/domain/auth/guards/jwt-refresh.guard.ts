import { AuthGuard } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';
import { BusinessException } from '../../../common/filters/exception/business-exception';
import { ErrorType } from '../../../common/filters/exception/error-code.enum';

@Injectable()
export class JwtRefreshGuard extends AuthGuard('jwt-refresh') {
  handleRequest(err, user, info) {
    if (info?.name === 'TokenExpiredError') {
      throw new BusinessException(ErrorType.REFRESH_TOKEN_EXPIRED);
    }
    if (!user) {
      throw new BusinessException(ErrorType.INVALID_REFRESH_TOKEN);
    }
    return user;
  }
}
