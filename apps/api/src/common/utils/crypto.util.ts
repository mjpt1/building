/**
 * توابع رمزنگاری: هش پسورد/OTP با argon2 و تولید کد و شماره‌ی یکتا.
 */
import * as argon2 from 'argon2';
import { customAlphabet } from 'nanoid';

const DIGITS = '0123456789';

export async function hashSecret(plain: string): Promise<string> {
  return argon2.hash(plain, { type: argon2.argon2id });
}

export async function verifySecret(hash: string, plain: string): Promise<boolean> {
  try {
    return await argon2.verify(hash, plain);
  } catch {
    return false;
  }
}

/** کد عددی OTP با طول دلخواه */
export function generateOtp(length = 5): string {
  const gen = customAlphabet(DIGITS, length);
  return gen();
}

/** شماره‌ی رهگیری/رسید یکتا با پیشوند */
export function generateTrackingNo(prefix = 'MNT'): string {
  const gen = customAlphabet(DIGITS, 8);
  return `${prefix}-${gen()}`;
}

const receiptGen = customAlphabet(DIGITS, 10);
export function generateReceiptNo(): string {
  return `RCP${receiptGen()}`;
}
