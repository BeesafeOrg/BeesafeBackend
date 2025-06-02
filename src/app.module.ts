import { Module, OnApplicationBootstrap } from '@nestjs/common';
import { AppController } from './app.controller';
import { DatabaseModule } from './common/database/database.module';
import { ConfigModule } from '@nestjs/config';
import { MemberModule } from './domain/member/member.module';
import { HiveReportModule } from './domain/hive-report/hive-report.module';
import { AuthModule } from './domain/auth/auth.module';
import { RedisModule } from './common/redis/redis.module';
import { RegionModule } from './domain/region/region.module';
import * as Joi from '@hapi/joi';
import { ScheduleModule } from '@nestjs/schedule';
import { RegionSeedService } from './domain/region/constant/region-seed.service';
import { S3Module } from './common/s3/s3.module';
import { OpenaiModule } from './common/openai/openai.module';

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

        AWS_S3_BUCKET_NAME: Joi.string().required(),
        AWS_S3_ACCESS: Joi.string().required(),
        AWS_S3_SECRET: Joi.string().required(),
        AWS_S3_REGION: Joi.string().required(),

        OPENAI_API_KEY: Joi.string().required(),
        OPENAI_MODEL: Joi.string().required(),
      }),
    }),
    DatabaseModule,
    MemberModule,
    HiveReportModule,
    AuthModule,
    RedisModule,
    RegionModule,
    ScheduleModule.forRoot(),
    S3Module,
    OpenaiModule,
  ],
  controllers: [AppController],
  providers: [],
})
export class AppModule implements OnApplicationBootstrap {
  constructor(private readonly regionSeedService: RegionSeedService) {}

  async onApplicationBootstrap() {
    await this.regionSeedService.sync();
  }
}
