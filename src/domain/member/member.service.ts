import { Injectable } from '@nestjs/common';
import { Member } from './entities/member.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateMemberDto } from './dto/create-member.dto';

@Injectable()
export class MemberService {
  constructor(
    @InjectRepository(Member)
    private readonly memberRepo: Repository<Member>,
  ) {}

  async findByEmail(email: string): Promise<Member | null> {
    return await this.memberRepo.findOne({
      where: { email },
    });
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
}
