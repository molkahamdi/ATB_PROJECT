import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.use(require('express').json({ limit: '10mb' }));
  app.use(require('express').urlencoded({ limit: '10mb', extended: true }));

  app.useGlobalPipes(new ValidationPipe({
    whitelist:            true,
    transform:            true,
    forbidNonWhitelisted: false,
  }));

  app.enableCors({
    origin: [
      'http://localhost:5173',
      'http://localhost:3001',
      'http://57.129.112.6',
      'http://57.129.112.6:80',
      'http://57.129.112.6:5173',
      'http://57.129.112.6:3001',
    ],
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  });

  const port = process.env.PORT || 3000;
  await app.listen(port, '0.0.0.0');
  console.log(` Backend ATB démarré sur : http://localhost:${port}`);
  console.log(` Endpoints : http://localhost:${port}/customer`);
}
bootstrap();