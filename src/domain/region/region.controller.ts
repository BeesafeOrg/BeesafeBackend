import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAccessGuard } from '../auth/guards/jwt-access.guard';
import { MemberRoleGuard } from '../auth/guards/member-role-guard';
import { RegionService } from './region.service';
import { RegionGroupedDto } from './dto/region-grouped.dto';

@Controller('regions')
@UseGuards(JwtAccessGuard, MemberRoleGuard)
export class RegionController {
  constructor(private readonly regionService: RegionService) {}

  @Get()
  async findAll(): Promise<RegionGroupedDto[]> {
    return await this.regionService.findAll();
  }
}
