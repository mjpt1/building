import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as https from 'https';

/**
 * سرویس پیامک — آداپتور با دو حالت:
 *   - mock: فقط در لاگ چاپ می‌کند (توسعه محلی)
 *   - kavenegar: ارسال واقعی از طریق پنل کاوه‌نگار (نیازمند API key)
 */
@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);
  private readonly provider: string;
  private readonly apiKey: string;
  private readonly sender: string;

  constructor(config: ConfigService) {
    this.provider = config.get<string>('sms.provider') ?? 'mock';
    this.apiKey = config.get<string>('sms.apiKey') ?? '';
    this.sender = config.get<string>('sms.sender') ?? '';
  }

  async send(receptor: string, message: string): Promise<void> {
    if (this.provider !== 'kavenegar' || !this.apiKey) {
      this.logger.log(`[SMS:mock] به ${receptor}: ${message}`);
      return;
    }
    await this.sendViaKavenegar(receptor, message);
  }

  /** ارسال کد OTP با قالب آماده */
  async sendOtp(receptor: string, code: string): Promise<void> {
    const message = `سامانه مدیریت ساختمان\nکد ورود شما: ${code}\nاین کد را با کسی به اشتراک نگذارید.`;
    await this.send(receptor, message);
  }

  private sendViaKavenegar(receptor: string, message: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const params = new URLSearchParams({
        receptor,
        message,
        sender: this.sender,
      }).toString();
      const path = `/v1/${this.apiKey}/sms/send.json?${params}`;
      const req = https.request(
        { host: 'api.kavenegar.com', path, method: 'POST' },
        (res) => {
          let body = '';
          res.on('data', (c) => (body += c));
          res.on('end', () => {
            if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
              resolve();
            } else {
              this.logger.error(`خطای ارسال پیامک: ${body}`);
              reject(new Error('ارسال پیامک ناموفق بود.'));
            }
          });
        },
      );
      req.on('error', (e) => {
        this.logger.error(`خطای شبکه پیامک: ${e.message}`);
        reject(e);
      });
      req.end();
    });
  }
}
