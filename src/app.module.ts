import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { DatabaseModule } from './common/database/database.module';
import { ConfigModule } from '@nestjs/config';
import { MemberModule } from './domain/member/member.module';
import { HiveReportModule } from './domain/hive-report/hive-report.module';
import { AuthModule } from './domain/auth/auth.module';
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
      }),
    }),
    DatabaseModule,
    MemberModule,
    HiveReportModule,
    AuthModule,
  ],
  controllers: [AppController],
  providers: [],
})
export class AppModule {}
