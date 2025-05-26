import { AuthGuard } from '@nestjs/passport';
import { BadRequestException, Injectable } from '@nestjs/common';

@Injectable()
export class JwtRefreshGuard extends AuthGuard('jwt-refresh') {
  handleRequest(err, user, info) {
    if (info?.name === 'TokenExpiredError') {
      throw new BadRequestException('refresh expired');
    }
    if (!user) {
      throw new BadRequestException('invalid refresh');
    }
    return user;
  }
}
