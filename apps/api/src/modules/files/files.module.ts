import { Module, Injectable, Controller, Post, Get, Param, Res, UploadedFile, UseInterceptors, BadRequestException, Logger } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { Response } from 'express';
import * as AWS from 'aws-sdk';
import { customAlphabet } from 'nanoid';
import { AttachmentKind } from '@prisma/client';
import { PrismaService } from '@/common/prisma/prisma.service';
import { Permissions } from '@/common/decorators/permissions.decorator';
import { Public } from '@/common/decorators/public.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';

const ALLOWED = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
const nameGen = customAlphabet('abcdefghijklmnopqrstuvwxyz0123456789', 16);

@Injectable()
export class FilesService {
  private readonly logger = new Logger(FilesService.name);
  private readonly s3: AWS.S3;
  private readonly bucket: string;
  private readonly maxBytes: number;

  constructor(private readonly prisma: PrismaService, config: ConfigService) {
    const s3conf = config.get('s3') as any;
    this.bucket = s3conf.bucket;
    this.maxBytes = s3conf.maxUploadMb * 1024 * 1024;
    this.s3 = new AWS.S3({
      endpoint: s3conf.endpoint,
      accessKeyId: s3conf.accessKey,
      secretAccessKey: s3conf.secretKey,
      region: s3conf.region,
      s3ForcePathStyle: true,
      signatureVersion: 'v4',
    });
    this.ensureBucket();
  }

  private async ensureBucket() {
    try {
      await this.s3.headBucket({ Bucket: this.bucket }).promise();
    } catch {
      try {
        await this.s3.createBucket({ Bucket: this.bucket }).promise();
        this.logger.log(`باکت ${this.bucket} ساخته شد.`);
      } catch (e) {
        this.logger.warn(`عدم دسترسی به فضای ذخیره‌سازی: ${(e as Error).message}`);
      }
    }
  }

  private kindOf(mime: string): AttachmentKind {
    if (mime.startsWith('image/')) return AttachmentKind.IMAGE;
    if (mime === 'application/pdf') return AttachmentKind.PDF;
    return AttachmentKind.OTHER;
  }

  async upload(file: Express.Multer.File, userId: string, buildingId?: string) {
    if (!file) throw new BadRequestException('فایلی ارسال نشده است.');
    if (!ALLOWED.includes(file.mimetype)) {
      throw new BadRequestException('نوع فایل مجاز نیست (تصویر یا PDF).');
    }
    if (file.size > this.maxBytes) {
      throw new BadRequestException('حجم فایل بیش از حد مجاز است.');
    }
    const ext = file.originalname.split('.').pop() ?? 'bin';
    const storageKey = `${new Date().getFullYear()}/${nameGen()}.${ext}`;
    await this.s3
      .putObject({ Bucket: this.bucket, Key: storageKey, Body: file.buffer, ContentType: file.mimetype })
      .promise()
      .catch((e) => {
        this.logger.error(`خطای آپلود: ${e.message}`);
        throw new BadRequestException('آپلود فایل ناموفق بود.');
      });

    return this.prisma.attachment.create({
      data: {
        buildingId: buildingId ?? null,
        uploaderId: userId,
        fileName: file.originalname,
        storageKey,
        mimeType: file.mimetype,
        size: file.size,
        kind: this.kindOf(file.mimetype),
      },
    });
  }

  async stream(id: string, res: Response) {
    const att = await this.prisma.attachment.findUnique({ where: { id } });
    if (!att) throw new BadRequestException('فایل یافت نشد.');
    const obj = this.s3.getObject({ Bucket: this.bucket, Key: att.storageKey });
    res.setHeader('Content-Type', att.mimeType);
    obj.createReadStream().on('error', () => res.status(404).end()).pipe(res);
  }
}

@ApiTags('files')
@Controller('files')
class FilesController {
  constructor(private readonly svc: FilesService) {}

  @ApiBearerAuth()
  @ApiConsumes('multipart/form-data')
  @Post('upload')
  @Permissions('file:upload')
  @UseInterceptors(FileInterceptor('file'))
  upload(@UploadedFile() file: Express.Multer.File, @CurrentUser('id') uid: string) {
    return this.svc.upload(file, uid);
  }

  @Public()
  @Get(':id')
  download(@Param('id') id: string, @Res() res: Response) {
    return this.svc.stream(id, res);
  }
}

@Module({
  controllers: [FilesController],
  providers: [FilesService],
  exports: [FilesService],
})
export class FilesModule {}
