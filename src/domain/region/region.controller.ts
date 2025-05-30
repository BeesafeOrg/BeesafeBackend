import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAccessGuard } from '../auth/guards/jwt-access.guard';
import { MemberRoleGuard } from '../auth/guards/member-role-guard';
import { RegionService } from './region.service';
import { RegionGroupedDto } from './dto/region-grouped.dto';
import { MemberRoles } from '../auth/decorators/member-roles.decorator';
import { MemberRole } from '../member/constant/member-role.enum';
import { ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';

@Controller('regions')
@UseGuards(JwtAccessGuard, MemberRoleGuard)
export class RegionController {
  constructor(private readonly regionService: RegionService) {}

  @Get()
  @MemberRoles(MemberRole.BEEKEEPER)
  @ApiBearerAuth('jwt-access')
  @ApiOperation({ summary: '전체 지역 조회' })
  @ApiResponse({ status: 2000, description: '성공적으로 조회되었습니다.' })
  async findAll(): Promise<RegionGroupedDto[]> {
    return await this.regionService.findAll();
  }
}
