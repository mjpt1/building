import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as https from 'https';
import { customAlphabet } from 'nanoid';

export interface PaymentRequestInput {
  amount: number; // ریال
  description: string;
  mobile?: string;
  callbackUrl: string;
}

export interface PaymentRequestResult {
  authority: string;
  redirectUrl: string;
}

export interface PaymentVerifyResult {
  success: boolean;
  refId?: string;
  cardPan?: string;
  message: string;
}

/**
 * درگاه پرداخت — آداپتور با دو حالت:
 *   - mock: تراکنش شبیه‌سازی‌شده برای توسعه محلی (همیشه موفق فرض می‌شود)
 *   - zarinpal: اتصال واقعی به زرین‌پال (نیازمند merchant_id؛ پشتیبانی از sandbox)
 *
 * توجه: مبالغ زرین‌پال به ریال ارسال می‌شوند (نسخه‌ی API v4 «amount» را ریال می‌پذیرد
 * در صورت پیکربندی؛ این پیاده‌سازی ریال را مبنا گرفته است).
 */
@Injectable()
export class PaymentGatewayService {
  private readonly logger = new Logger(PaymentGatewayService.name);
  private readonly provider: string;
  private readonly merchantId: string;
  private readonly sandbox: boolean;
  private readonly mockGen = customAlphabet('0123456789', 12);

  constructor(config: ConfigService) {
    this.provider = config.get<string>('payment.provider') ?? 'mock';
    this.merchantId = config.get<string>('payment.merchantId') ?? '';
    this.sandbox = config.get<boolean>('payment.sandbox') ?? true;
  }

  get baseHost(): string {
    return this.sandbox ? 'sandbox.zarinpal.com' : 'payment.zarinpal.com';
  }

  async request(input: PaymentRequestInput): Promise<PaymentRequestResult> {
    if (this.provider !== 'zarinpal' || !this.merchantId) {
      const authority = `MOCK${this.mockGen()}`;
      this.logger.log(`[Payment:mock] درخواست پرداخت ${input.amount} ریال — authority=${authority}`);
      return {
        authority,
        // در حالت mock مستقیم به callback با وضعیت OK هدایت می‌شود
        redirectUrl: `${input.callbackUrl}?Authority=${authority}&Status=OK`,
      };
    }

    const payload = JSON.stringify({
      merchant_id: this.merchantId,
      amount: input.amount,
      description: input.description,
      callback_url: input.callbackUrl,
      metadata: input.mobile ? { mobile: input.mobile } : undefined,
    });

    const data = await this.post('/pg/v4/payment/request.json', payload);
    if (data?.data?.code === 100 && data?.data?.authority) {
      const authority = data.data.authority;
      return {
        authority,
        redirectUrl: `https://${this.baseHost}/pg/StartPay/${authority}`,
      };
    }
    this.logger.error(`خطای ایجاد تراکنش زرین‌پال: ${JSON.stringify(data?.errors ?? data)}`);
    throw new Error('ایجاد تراکنش پرداخت ناموفق بود.');
  }

  async verify(authority: string, amount: number): Promise<PaymentVerifyResult> {
    if (this.provider !== 'zarinpal' || !this.merchantId) {
      const ok = authority.startsWith('MOCK');
      return {
        success: ok,
        refId: ok ? this.mockGen() : undefined,
        cardPan: ok ? '6037******1234' : undefined,
        message: ok ? 'پرداخت آزمایشی با موفقیت تایید شد.' : 'تراکنش نامعتبر است.',
      };
    }

    const payload = JSON.stringify({
      merchant_id: this.merchantId,
      amount,
      authority,
    });
    const data = await this.post('/pg/v4/payment/verify.json', payload);
    const code = data?.data?.code;
    if (code === 100 || code === 101) {
      return {
        success: true,
        refId: String(data.data.ref_id),
        cardPan: data.data.card_pan,
        message: code === 101 ? 'تراکنش قبلاً تایید شده است.' : 'پرداخت با موفقیت تایید شد.',
      };
    }
    return {
      success: false,
      message: 'تایید پرداخت ناموفق بود یا توسط کاربر لغو شد.',
    };
  }

  private post(path: string, body: string): Promise<any> {
    return new Promise((resolve, reject) => {
      const req = https.request(
        {
          host: this.baseHost,
          path,
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(body),
          },
        },
        (res) => {
          let raw = '';
          res.on('data', (c) => (raw += c));
          res.on('end', () => {
            try {
              resolve(JSON.parse(raw));
            } catch {
              reject(new Error('پاسخ نامعتبر از درگاه پرداخت.'));
            }
          });
        },
      );
      req.on('error', reject);
      req.write(body);
      req.end();
    });
  }
}
