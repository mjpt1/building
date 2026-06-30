/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // روی Vercel خروجی پیش‌فرض استفاده می‌شود؛ standalone فقط برای Docker لازم است.
  output: process.env.VERCEL ? undefined : 'standalone',
};
module.exports = nextConfig;
