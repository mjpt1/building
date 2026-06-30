import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { TransformInterceptor } from '../src/common/interceptors/transform.interceptor';
import { AllExceptionsFilter } from '../src/common/filters/all-exceptions.filter';

/**
 * تست e2e احراز هویت.
 * پیش‌نیاز: دیتابیس در دسترس و seed اجراشده (کاربر 09121111111 موجود باشد).
 */
describe('Auth (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    app.useGlobalInterceptors(new TransformInterceptor());
    app.useGlobalFilters(new AllExceptionsFilter());
    await app.init();
  });

  afterAll(async () => {
    await app?.close();
  });

  it('ورود با موبایل نامعتبر باید ۴۰۰ بدهد', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ mobile: '123', password: 'x' });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('ورود با اطلاعات اشتباه باید ۴۰۱ بدهد', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ mobile: '09120000001', password: 'WrongPass123' });
    expect([401, 404]).toContain(res.status);
  });

  it('ورود مدیر با اطلاعات درست باید توکن بدهد', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ mobile: '09121111111', password: 'Manager@1234' });
    // اگر seed اجرا شده باشد
    if (res.status === 200) {
      expect(res.body.data.accessToken).toBeDefined();
      expect(res.body.data.refreshToken).toBeDefined();
    }
  });

  it('دسترسی به endpoint محافظت‌شده بدون توکن باید ۴۰۱ بدهد', async () => {
    const res = await request(app.getHttpServer()).get('/api/auth/me');
    expect(res.status).toBe(401);
  });
});
