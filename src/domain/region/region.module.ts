import { Module } from '@nestjs/common';
import { RegionFetcherService } from './region-fetcher.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Region } from './entities/region.entity';
import { HttpModule } from '@nestjs/axios';

@Module({
  imports: [
    TypeOrmModule.forFeature([Region]),
    HttpModule.register({ timeout: 5000 }),
  ],
  providers: [RegionFetcherService],
  exports: [RegionFetcherService],
})
export class RegionModule {}
