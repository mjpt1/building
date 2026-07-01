/**
 * نقطه‌ورود Serverless برای اجرای بک‌اند NestJS روی Vercel.
 * از خروجیِ کامپایل‌شده‌ی dist/ استفاده می‌کند (بدون نیاز به alias در زمان اجرا).
 * نمونه‌ی Nest بین اجراهای گرم (warm) کش می‌شود تا cold start تکراری نداشته باشیم.
 */
require('reflect-metadata');
const express = require('express');
const helmet = require('helmet');
const { NestFactory } = require('@nestjs/core');
const { ExpressAdapter } = require('@nestjs/platform-express');
const { ValidationPipe, VersioningType } = require('@nestjs/common');
const { ConfigService } = require('@nestjs/config');
const { AppModule } = require('../dist/app.module');
const { AllExceptionsFilter } = require('../dist/common/filters/all-exceptions.filter');
const { TransformInterceptor } = require('../dist/common/interceptors/transform.interceptor');

const server = express();
let readyPromise = null;

async function bootstrap() {
  const app = await NestFactory.create(AppModule, new ExpressAdapter(server), { bufferLogs: false });
  const config = app.get(ConfigService);

  const prefix = config.get('apiPrefix') || 'api';
  const version = config.get('apiVersion') || 'v1';

  app.setGlobalPrefix(prefix);
  app.enableVersioning({ type: VersioningType.URI, defaultVersion: version.replace('v', '') });

  app.use(helmet());
  app.enableCors({
    origin: (config.get('corsOrigin') || '*').split(','),
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

  await app.init();
}

module.exports = async (req, res) => {
  if (!readyPromise) readyPromise = bootstrap();
  await readyPromise;
  server(req, res);
};
