import { Module } from '@nestjs/common';
import { RegionFetcherService } from './region-fetcher.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Region } from './entities/region.entity';
import { HttpModule } from '@nestjs/axios';
import { RegionController } from './region.controller';
import { RegionService } from './region.service';
import { RedisModule } from '../../common/redis/redis.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Region]),
    HttpModule.register({ timeout: 5000 }),
    RedisModule,
  ],
  controllers: [RegionController],
  providers: [RegionFetcherService, RegionService],
  exports: [RegionFetcherService],
})
export class RegionModule {}
