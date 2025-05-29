import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAccessGuard } from '../auth/guards/jwt-access.guard';
import { MemberRoleGuard } from '../auth/guards/member-role-guard';
import { RegionService } from './region.service';
import { RegionGroupedDto } from './dto/region-grouped.dto';
import { MemberRoles } from '../auth/decorators/member-roles.decorator';
import { MemberRole } from '../member/constant/member-role.enum';

@Controller('regions')
@UseGuards(JwtAccessGuard, MemberRoleGuard)
export class RegionController {
  constructor(private readonly regionService: RegionService) {}

  @Get()
  @MemberRoles(MemberRole.BEEKEEPER)
  async findAll(): Promise<RegionGroupedDto[]> {
    return await this.regionService.findAll();
  }
}
