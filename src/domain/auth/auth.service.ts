import { Injectable } from '@nestjs/common';
import { firstValueFrom } from 'rxjs';
import { Member } from '../member/entities/member.entity';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { MemberService } from '../member/member.service';
import { JwtService } from '@nestjs/jwt';
import * as uuid from 'uuid';
import { createHash } from 'crypto';
import { RedisService } from '../../common/redis/redis.service';
import { BusinessException } from '../../common/filters/exception/business-exception';
import { ErrorType } from '../../common/filters/exception/error-code.enum';
import { SetMemberRoleDto } from './dto/set-member-role.dto';

@Injectable()
export class AuthService {
  private readonly KAKAO_PROFILE_URL = 'https://kapi.kakao.com/v2/user/me';
  private readonly JWT_REFRESH_LIST_REDIS_KEY = 'memberRTs';

  constructor(
    private readonly http: HttpService,
    private readonly configService: ConfigService,
    private readonly memberService: MemberService,
    private readonly jwtService: JwtService,
    private readonly redisService: RedisService,
  ) {}

  async getProfile(accessToken: string): Promise<any> {
    try {
      const { data } = await firstValueFrom(
        this.http.get(this.KAKAO_PROFILE_URL, {
          headers: { Authorization: `Bearer ${accessToken}` },
        }),
      );
      return data;
    } catch (e: any) {
      const { error, error_description, error_code } = e?.response?.data;
      throw new BusinessException(
        ErrorType.KAKAO_LOGIN_FAILED,
        `[${error_code}] ${error} -> ${error_description}`,
      );
    }
  }

  async upsertMember(profile: any): Promise<Member> {
    const kakaoAccount = profile.kakao_account ?? {};
    const email = kakaoAccount.email;
    const nickname = kakaoAccount.profile?.nickname;
    const profileImageUrl = kakaoAccount.profile?.profile_image_url;

    let member = await this.memberService.findByEmail(email);

    if (member) {
      let updated = false;

      if (nickname && member.nickname !== nickname) {
        member.nickname = nickname;
        updated = true;
      }
      if (profileImageUrl && member.profileImageUrl !== profileImageUrl) {
        member.profileImageUrl = profileImageUrl;
        updated = true;
      }

      return updated ? await this.memberService.save(member) : member;
    } else {
      return await this.memberService.createAndSave({
        nickname,
        email,
        profileImageUrl,
      });
    }
  }

  async issueTokens(member: Member) {
    const accessToken = await this.sign(
      { sub: member.id, role: member.role },
      this.configService.get<string>('JWT_ACCESS_SECRET'),
      this.configService.get<string>('JWT_ACCESS_EXPIRES'),
    );

    const refreshTokenId = uuid.v1();
    const refreshToken = await this.sign(
      { sub: member.id, jti: refreshTokenId },
      this.configService.get('JWT_REFRESH_SECRET'),
      this.configService.get('JWT_REFRESH_EXPIRES'),
    );

    const key = this.getRefreshTokenRedisKey(refreshTokenId);
    const ttl = this.getRefreshTokenTtlSec();

    await this.redisService.set(key, member.id, { ttl });
    await this.redisService.pushToSet(
      `${this.JWT_REFRESH_LIST_REDIS_KEY}:${member.id}`,
      key,
      ttl,
    );

    return { accessToken, refreshToken };
  }

  private async sign(payload, secret, exp) {
    return this.jwtService.signAsync(payload, { secret, expiresIn: exp });
  }

  private getRefreshTokenRedisKey(refreshTokenId: string) {
    const hash = createHash('sha256').update(refreshTokenId).digest('hex');
    return `rt:${hash}`;
  }

  private getRefreshTokenTtlSec() {
    return <number>this.configService.get('JWT_REFRESH_EXPIRES') / 1000;
  }

  async rotate(memberId: string, oldRefreshTokenRedisId: string) {
    const member = await this.memberService.findByIdOrThrowException(memberId);

    const key = this.getRefreshTokenRedisKey(oldRefreshTokenRedisId);
    const ownerId = await this.redisService.get<string>(key);

    if (ownerId !== member.id) {
      throw new BusinessException(ErrorType.INVALID_REFRESH_TOKEN);
    }

    await this.redisService.del(key);
    await this.revokeAll(memberId);
    return this.issueTokens(member);
  }

  async revokeAll(memberId: string) {
    const listKey = `${this.JWT_REFRESH_LIST_REDIS_KEY}:${memberId}`;
    const keys = await this.redisService.popAll(listKey);
    if (keys.length) {
      await Promise.all(keys.map((k) => this.redisService.del(k)));
    }
  }

  async setMemberRole(memberId: string, memberRoleDto: SetMemberRoleDto) {
    await this.memberService.setRole(memberId, memberRoleDto.role);
  }
}
