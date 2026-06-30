import type { Metadata } from 'next';
import './globals.css';
import { Providers } from './providers';

export const metadata: Metadata = {
  title: 'سامان | سامانه مدیریت ساختمان',
  description: 'پلتفرم جامع مدیریت ساختمان، شارژ، حسابداری و تعمیرات',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fa" dir="rtl">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
