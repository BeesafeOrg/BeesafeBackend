import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { firstValueFrom } from 'rxjs';
import { Member } from '../member/entities/member.entity';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { MemberService } from '../member/member.service';

@Injectable()
export class AuthService {
  private readonly profileUrl = 'https://kapi.kakao.com/v2/user/me';

  constructor(
    private readonly http: HttpService,
    private readonly cs: ConfigService,
    private readonly memberService: MemberService,
  ) {}

  async getProfile(accessToken: string): Promise<any> {
    try {
      const { data } = await firstValueFrom(
        this.http.get(this.profileUrl, {
          headers: { Authorization: `Bearer ${accessToken}` },
        }),
      );
      return data;
    } catch (e: any) {
      const { error, error_description, error_code } = e?.response?.data;
      throw new InternalServerErrorException(
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
}
