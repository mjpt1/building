/**
 * پیکربندی مرکزی برنامه — مقادیر از متغیرهای محیطی خوانده و اعتبارسنجی می‌شوند.
 */
export interface AppConfig {
  env: string;
  port: number;
  apiPrefix: string;
  apiVersion: string;
  corsOrigin: string;
  jwt: {
    accessSecret: string;
    accessTtl: number;
    refreshSecret: string;
    refreshTtl: number;
  };
  bcryptRounds: number;
  otp: { ttl: number; length: number };
  sms: { provider: string; apiKey: string; sender: string };
  payment: {
    provider: string;
    merchantId: string;
    sandbox: boolean;
    callbackUrl: string;
  };
  s3: {
    endpoint: string;
    region: string;
    accessKey: string;
    secretKey: string;
    bucket: string;
    publicUrl: string;
    maxUploadMb: number;
  };
  rateLimit: { ttl: number; max: number };
}

const toInt = (v: string | undefined, def: number) =>
  v === undefined || v === '' ? def : parseInt(v, 10);
const toBool = (v: string | undefined, def = false) =>
  v === undefined ? def : v === 'true' || v === '1';

export default (): AppConfig => ({
  env: process.env.NODE_ENV ?? 'development',
  port: toInt(process.env.API_PORT, 4000),
  apiPrefix: process.env.API_PREFIX ?? 'api',
  apiVersion: process.env.API_VERSION ?? 'v1',
  corsOrigin: process.env.CORS_ORIGIN ?? 'http://localhost:3000',
  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET ?? 'dev_access_secret',
    accessTtl: toInt(process.env.JWT_ACCESS_TTL, 900),
    refreshSecret: process.env.JWT_REFRESH_SECRET ?? 'dev_refresh_secret',
    refreshTtl: toInt(process.env.JWT_REFRESH_TTL, 2592000),
  },
  bcryptRounds: toInt(process.env.BCRYPT_ROUNDS, 12),
  otp: {
    ttl: toInt(process.env.OTP_TTL, 120),
    length: toInt(process.env.OTP_LENGTH, 5),
  },
  sms: {
    provider: process.env.SMS_PROVIDER ?? 'mock',
    apiKey: process.env.KAVENEGAR_API_KEY ?? '',
    sender: process.env.SMS_SENDER ?? '',
  },
  payment: {
    provider: process.env.PAYMENT_PROVIDER ?? 'mock',
    merchantId: process.env.ZARINPAL_MERCHANT_ID ?? '',
    sandbox: toBool(process.env.ZARINPAL_SANDBOX, true),
    callbackUrl:
      process.env.PAYMENT_CALLBACK_URL ??
      'http://localhost:4000/api/v1/payments/verify',
  },
  s3: {
    endpoint: process.env.S3_ENDPOINT ?? 'http://localhost:9000',
    region: process.env.S3_REGION ?? 'us-east-1',
    accessKey: process.env.S3_ACCESS_KEY ?? 'minioadmin',
    secretKey: process.env.S3_SECRET_KEY ?? 'minioadmin',
    bucket: process.env.S3_BUCKET ?? 'saman-files',
    publicUrl: process.env.S3_PUBLIC_URL ?? 'http://localhost:9000/saman-files',
    maxUploadMb: toInt(process.env.MAX_UPLOAD_MB, 10),
  },
  rateLimit: {
    ttl: toInt(process.env.RATE_LIMIT_TTL, 60),
    max: toInt(process.env.RATE_LIMIT_MAX, 120),
  },
});
