import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { SuccessInterceptor } from './common/interceptors/success.interceptor';
import { RequestLoggerInterceptor } from './common/interceptors/request-logger.interceptor';
import { HttpExceptionFilter } from './common/filters/exception/http-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('api');

  app.useGlobalInterceptors(new SuccessInterceptor());
  app.useGlobalInterceptors(new RequestLoggerInterceptor());

  app.useGlobalFilters(new HttpExceptionFilter());

  await app.listen(4000);
}

void bootstrap();
