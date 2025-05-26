import { BadRequestException, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { TokenExpiredError } from 'jsonwebtoken';

@Injectable()
export class JwtAccessGuard extends AuthGuard('jwt-access') {
  handleRequest(err: any, user: any, info: any) {
    if (info instanceof TokenExpiredError) {
      throw new BadRequestException('access expired');
    }
    if (err) throw err;
    if (!user) {
      throw new BadRequestException('invalid access');
    }
    return user;
  }
}
