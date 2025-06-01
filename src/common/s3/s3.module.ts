import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MulterModule } from '@nestjs/platform-express';
import { MulterOptions } from '@nestjs/platform-express/multer/interfaces/multer-options.interface';
import * as multerS3 from 'multer-s3';
import { S3Client } from '@aws-sdk/client-s3';
import { basename, extname } from 'path';
import { BusinessException } from '../filters/exception/business-exception';
import { ErrorType } from '../filters/exception/error-code.enum';

@Module({
  imports: [
    MulterModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (cs: ConfigService): MulterOptions => ({
        storage: multerS3({
          s3: new S3Client({
            region: cs.get<string>('AWS_S3_REGION')!,
            credentials: {
              accessKeyId: cs.get<string>('AWS_S3_ACCESS')!,
              secretAccessKey: cs.get<string>('AWS_S3_SECRET')!,
            },
          }),
          bucket: cs.get<string>('AWS_S3_BUCKET_NAME')!,
          //acl: 'public-read',
          contentType: multerS3.AUTO_CONTENT_TYPE,
          metadata(req, file, callback) {
            callback(null, { owner: 'it' });
          },
          key(req, file, callback) {
            const ext = extname(file.originalname); // 확장자
            const baseName = basename(file.originalname, ext); // 확장자 제외
            // 파일이름-날짜.확장자
            const fileName = `/beesafe/images/${baseName}-${Date.now()}${ext}`;
            callback(null, fileName);
          },
        }),
        fileFilter: (req, file, cb) => {
          const allowed = ['image/png', 'image/jpeg', 'image/webp'];
          if (allowed.includes(file.mimetype)) {
            cb(null, true);
          } else {
            cb(
              new BusinessException(
                ErrorType.INVALID_FILE_FORMAT,
                'Only PNG, JPEG, and WEBP formats under 20 MB are allowed.',
              ),
              false,
            );
          }
        },
        limits: {
          fileSize: 15 * 1_000_000, // 15 000 000 bytes
        },
      }),
    }),
  ],
  exports: [MulterModule],
})
export class S3Module {}
