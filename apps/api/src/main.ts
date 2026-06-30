import 'reflect-metadata';
import { NestFactory, Reflector } from '@nestjs/core';
import { ValidationPipe, VersioningType, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: false });
  const config = app.get(ConfigService);
  const logger = new Logger('Bootstrap');

  const prefix = config.get<string>('apiPrefix') ?? 'api';
  const version = config.get<string>('apiVersion') ?? 'v1';

  app.setGlobalPrefix(prefix);
  app.enableVersioning({ type: VersioningType.URI, defaultVersion: version.replace('v', '') });

  app.use(helmet());
  app.enableCors({
    origin: config.get<string>('corsOrigin')?.split(',') ?? '*',
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  app.useGlobalFilters(new AllExceptionsFilter());
  app.useGlobalInterceptors(new TransformInterceptor());

  // مستندات Swagger
  const swaggerConfig = new DocumentBuilder()
    .setTitle('سامانه مدیریت ساختمان — API')
    .setDescription('مستندات REST API سامانه‌ی سامان')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup(`${prefix}/docs`, app, document);

  const port = config.get<number>('port') ?? 4000;
  await app.listen(port);
  logger.log(`API روی http://localhost:${port}/${prefix}/${version} اجرا شد.`);
  logger.log(`مستندات: http://localhost:${port}/${prefix}/docs`);
}

bootstrap();
