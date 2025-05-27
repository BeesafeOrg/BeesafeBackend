import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { DatabaseModule } from './common/database/database.module';
import { ConfigModule } from '@nestjs/config';
import { MemberModule } from './domain/member/member.module';
import { HiveReportModule } from './domain/hive-report/hive-report.module';
import { AuthModule } from './domain/auth/auth.module';
import { RedisModule } from './common/redis/redis.module';
import { RegionModule } from './domain/region/region.module';
import * as Joi from '@hapi/joi';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      validationSchema: Joi.object({
        MYSQL_HOST: Joi.string().required(),
        MYSQL_PORT: Joi.number().required(),
        MYSQL_USER: Joi.string().required(),
        MYSQL_PASS: Joi.string().required(),
        MYSQL_NAME: Joi.string().required(),

        JWT_ACCESS_SECRET: Joi.string().required(),
        JWT_ACCESS_EXPIRES: Joi.number().required(),
        JWT_REFRESH_SECRET: Joi.string().required(),
        JWT_REFRESH_EXPIRES: Joi.number().required(),

        REDIS_URL: Joi.string().required(),
        REDIS_TTL: Joi.number().required(),

        VWORLD_KEY: Joi.string().required(),
        VWORLD_DOMAIN: Joi.string().required(),
      }),
    }),
    DatabaseModule,
    MemberModule,
    HiveReportModule,
    AuthModule,
    RedisModule,
    RegionModule,
  ],
  controllers: [AppController],
  providers: [],
})
export class AppModule {}
