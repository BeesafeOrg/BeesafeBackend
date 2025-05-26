import { Inject, Injectable } from '@nestjs/common';
import { Cache } from 'cache-manager';
import { CACHE_MANAGER } from '@nestjs/common/cache';

@Injectable()
export class RedisService {
  constructor(@Inject(CACHE_MANAGER) private readonly cache: Cache) {}

  get<T = any>(key: string): Promise<T | undefined> {
    return this.cache.get<T>(key);
  }

  set(key: string, value: any, options?: { ttl?: number }) {
    return this.cache.set(key, value, options?.ttl);
  }

  del(key: string) {
    return this.cache.del(key);
  }

  async pushToSet(setKey: string, memberKey: string, ttl?: number) {
    const arr: string[] = (await this.get(setKey)) ?? [];
    arr.push(memberKey);
    await this.set(setKey, arr, { ttl });
  }

  async popAll(setKey: string): Promise<string[]> {
    const arr: string[] = (await this.get(setKey)) ?? [];
    await this.del(setKey);
    return arr;
  }
}