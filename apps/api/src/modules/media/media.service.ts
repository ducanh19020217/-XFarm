import { BadRequestException, Injectable } from '@nestjs/common';
import { S3Client, HeadObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import * as crypto from 'crypto';
import { prisma } from '@xfarm/db';
import { getEnv } from '../../config/env.config';
import { PresignMediaDto, CreateMediaDto } from './media.dto';

@Injectable()
export class MediaService {
  private s3Client: S3Client;

  constructor() {
    const env = getEnv();
    const endpoint = `http://${env.MINIO_ENDPOINT}:${env.MINIO_PORT}`;

    this.s3Client = new S3Client({
      endpoint,
      region: 'us-east-1',
      credentials: {
        accessKeyId: env.MINIO_ACCESS_KEY,
        secretAccessKey: env.MINIO_SECRET_KEY,
      },
      forcePathStyle: true,
    });
  }

  async getPresignedUrl(dto: PresignMediaDto) {
    const env = getEnv();
    const extensionByMime: Record<string, string> = {
      'image/jpeg': 'jpg',
      'image/png': 'png',
      'image/webp': 'webp',
      'application/pdf': 'pdf',
    };
    const ext = extensionByMime[dto.mime];
    const randomHex = crypto.randomBytes(8).toString('hex');
    const key = `uploads/${Date.now()}-${randomHex}.${ext}`;

    const command = new PutObjectCommand({
      Bucket: env.MINIO_BUCKET,
      Key: key,
      ContentType: dto.mime,
      ContentLength: dto.size,
    });

    const uploadUrl = await getSignedUrl(this.s3Client, command, {
      expiresIn: 900, // 15 mins
    });

    const publicUrl = `http://${env.MINIO_ENDPOINT}:${env.MINIO_PORT}/${env.MINIO_BUCKET}/${key}`;

    return {
      uploadUrl,
      key,
      url: publicUrl,
    };
  }

  async create(dto: CreateMediaDto, userId?: string) {
    const env = getEnv();
    if (!/^uploads\/\d+-[0-9a-f]{16}\.[a-z0-9]{1,5}$/.test(dto.key)) {
      throw new BadRequestException('Key tệp không hợp lệ');
    }

    let head;
    try {
      head = await this.s3Client.send(
        new HeadObjectCommand({
          Bucket: env.MINIO_BUCKET,
          Key: dto.key,
        }),
      );
    } catch {
      throw new BadRequestException('Không tìm thấy tệp đã tải lên');
    }

    if (!head.ContentType || head.ContentLength === undefined) {
      throw new BadRequestException('Tệp tải lên thiếu thông tin bắt buộc');
    }

    const protocol = env.MINIO_USE_SSL ? 'https' : 'http';
    const url = `${protocol}://${env.MINIO_ENDPOINT}:${env.MINIO_PORT}/${env.MINIO_BUCKET}/${dto.key}`;
    const media = await prisma.media.create({
      data: {
        key: dto.key,
        url,
        mime: head.ContentType,
        size: head.ContentLength,
        alt: dto.alt,
        uploadedById: userId,
      },
    });

    return media;
  }
}
