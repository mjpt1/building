# ---------- مرحله build ----------
FROM node:20-alpine AS builder
WORKDIR /app
RUN apk add --no-cache python3 make g++ openssl
COPY package.json ./
RUN npm install
COPY prisma ./prisma
RUN npx prisma generate
COPY . .
RUN npm run build

# ---------- مرحله runtime ----------
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN apk add --no-cache openssl
COPY package.json tsconfig.json ./
# وابستگی‌های توسعه برای prisma migrate و اجرای seed لازم‌اند
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/src ./src
EXPOSE 4000
# اجرای migration سپس استارت
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main.js"]
