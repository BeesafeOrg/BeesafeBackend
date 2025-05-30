import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { SuccessInterceptor } from './common/interceptors/success.interceptor';
import { RequestLoggerInterceptor } from './common/interceptors/request-logger.interceptor';
import { HttpExceptionFilter } from './common/filters/exception/http-exception.filter';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('api');

  app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }));

  app.useGlobalInterceptors(new SuccessInterceptor());
  app.useGlobalInterceptors(new RequestLoggerInterceptor());

  app.useGlobalFilters(new HttpExceptionFilter());

  const config = new DocumentBuilder()
    .setTitle('Beesafe API')
    .setDescription('Beesafe API Docs')
    .setVersion('1.0')
    .addTag('android-mobile-programming-team-1')
    .addBearerAuth(
      { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      'jwt-access',
    )
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  await app.listen(4000);
}

void bootstrap();
