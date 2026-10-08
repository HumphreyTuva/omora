import 'dotenv/config';
import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ValidationPipe } from '@nestjs/common';
import { join } from 'path';
import { AppModule } from './app.module';
async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.setGlobalPrefix('api/v1');
  app.enableCors({ origin: (process.env.WEB_ORIGIN || 'http://localhost:3000').split(',') });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.useStaticAssets(join(process.cwd(), process.env.UPLOAD_DIR || 'uploads'), { prefix: '/uploads' }); // local image storage (testing)
  await app.listen(process.env.PORT || 4000);
}
bootstrap();
