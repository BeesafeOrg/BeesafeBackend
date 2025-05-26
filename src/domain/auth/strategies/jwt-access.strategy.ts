import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { MemberRole } from '../../member/constant/member-role.enum';

@Injectable()
export class JwtAccessStrategy extends PassportStrategy(
  Strategy,
  'jwt-access',
) {
  constructor(cs: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        ExtractJwt.fromAuthHeaderAsBearerToken(),
      ]),
      secretOrKey: cs.getOrThrow('JWT_ACCESS_SECRET'),
    });
  }

  async validate(payload: { sub: string; role: MemberRole }): Promise<any> {
    return { memberId: payload.sub, role: payload.role };
  }
}
