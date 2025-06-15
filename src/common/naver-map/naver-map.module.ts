import { Module } from '@nestjs/common';
import { NaverMapService } from './naver-map.service';
import { HttpModule } from '@nestjs/axios';

@Module({
  imports: [HttpModule],
  providers: [NaverMapService],
  exports: [NaverMapService],
})
export class NaverMapModule {}
