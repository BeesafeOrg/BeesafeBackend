import { Injectable } from '@nestjs/common';
import { Member } from './entities/member.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { CreateMemberDto } from './dto/create-member.dto';
import { BusinessException } from '../../common/filters/exception/business-exception';
import { ErrorType } from '../../common/filters/exception/error-code.enum';
import { MemberRole } from './constant/member-role.enum';
import { Region } from '../region/entities/region.entity';
import { InterestArea } from './entities/interest-area.entity';
import { InterestAreaDto } from './dto/update-interest-area.dto';

@Injectable()
export class MemberService {
  private readonly MAX_AREA = 3;

  constructor(
    @InjectRepository(Member)
    private readonly memberRepo: Repository<Member>,
    private readonly dataSource: DataSource,
  ) {}

  async findByEmail(email: string): Promise<Member | null> {
    return await this.memberRepo.findOne({
      where: { email },
    });
  }

  async findByIdOrThrowException(id: string): Promise<Member> {
    const member = await this.memberRepo.findOne({
      where: { id },
    });
    if (!member) {
      throw new BusinessException(ErrorType.MEMBER_NOT_FOUND);
    }
    return member;
  }

  async save(member: Member): Promise<Member> {
    return await this.memberRepo.save(member);
  }

  async createAndSave(dto: CreateMemberDto) {
    const newMember = this.memberRepo.create({
      ...dto,
    });
    return await this.save(newMember);
  }

  async setRole(memberId: string, role: MemberRole) {
    const affected = await this.memberRepo.update(memberId, {
      role,
    });
    if (!affected) {
      throw new BusinessException(ErrorType.MEMBER_NOT_FOUND);
    }
  }

  async setInterestAreas(
    memberId: string,
    areaDtos: InterestAreaDto[],
  ): Promise<void> {
    if (areaDtos.length === 0 || areaDtos.length > this.MAX_AREA) {
      throw new BusinessException(ErrorType.INVALID_INTEREST_AREA_COUNT);
    }

    await this.dataSource.transaction(async (manager) => {
      const member = await manager.findOne(Member, {
        where: { id: memberId },
        relations: ['interestAreas'],
      });
      if (!member) {
        throw new BusinessException(ErrorType.MEMBER_NOT_FOUND);
      }

      const regions = await manager.findByIds(Region, areaDtos);
      if (regions.length !== areaDtos.length) {
        throw new BusinessException(ErrorType.INVALID_REGION_CODE);
      }

      /* 4. diff 계산 → delete & insert */
      const current = new Set(
        member.interestAreas.map((ia) => ia.districtCode),
      );
      const incoming = new Set(areaDtos.map((dto) => dto.districtCode));

      const toRemove = member.interestAreas.filter(
        (ia) => !incoming.has(ia.districtCode),
      );
      const toAdd = [...incoming].filter((code) => !current.has(code));

      if (toRemove.length) {
        await manager.remove(InterestArea, toRemove);
      }
      if (toAdd.length) {
        const newEntities = toAdd.map((code) =>
          manager.create(InterestArea, { districtCode: code, member }),
        );
        await manager.save(newEntities);
      }
    });
  }
}
