import { Module } from '@nestjs/common';
import { CacheModule } from '@nestjs/common/cache';
import { ConfigModule, ConfigService } from '@nestjs/config';
import * as redisStore from 'cache-manager-redis-store';
import { RedisService } from './redis.service';

@Module({
  imports: [
    CacheModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      isGlobal: true,
      useFactory: (cs: ConfigService) => {
        return {
          store: redisStore,
          url: cs.get<string>('REDIS_URL'),
          ttl: cs.get<number>('REDIS_TTL'),
        };
      },
    }),
  ],
  providers: [RedisService],
  exports: [RedisService],
})
export class RedisModule {}
