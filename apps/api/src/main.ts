import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') ?? [
    'http://localhost:3000',
    'http://localhost:3001',
  ];
  app.enableCors({ origin: allowedOrigins, credentials: true });
  const port = process.env.PORT ? Number(process.env.PORT) : 3001;
  await app.listen(port);
}

bootstrap();
