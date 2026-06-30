import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';
/** علامت‌گذاری endpoint به‌عنوان عمومی (بدون نیاز به احراز هویت) */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
