import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (cs: ConfigService) => ({
        type: 'mysql',
        host: cs.get('MYSQL_HOST'),
        port: cs.get('MYSQL_PORT'),
        username: cs.get('MYSQL_USER'),
        password: cs.get('MYSQL_PASS'),
        database: cs.get('MYSQL_NAME'),
        entities: [__dirname + '/**/*.entity.{ts,js}'],
        autoLoadEntities: true,
        synchronize: true,
      }),
    }),
  ],
})
export class DatabaseModule {}
