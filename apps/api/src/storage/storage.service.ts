import { BadRequestException, Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { mkdir, writeFile } from 'fs/promises';
import { dirname, join } from 'path';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
const EXT: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };
// Don't trust the browser's claimed type: check the file's first bytes too.
const genuine = (mime: string, b: Buffer) => mime === 'image/jpeg' ? b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff : mime === 'image/png' ? b.subarray(0, 4).toString('hex') === '89504e47' : b.subarray(0, 4).toString() === 'RIFF' && b.subarray(8, 12).toString() === 'WEBP';
// STORAGE_DRIVER=local (default) saves to ./uploads: fine on your own computer, but on Render's free server that disk is wiped on every restart.
// STORAGE_DRIVER=s3 stores photos permanently in Cloudflare R2 (or AWS S3 / any S3-compatible service).
@Injectable()
export class StorageService {
  private s3 = process.env.STORAGE_DRIVER === 's3' ? new S3Client({
    region: process.env.S3_REGION || 'auto', endpoint: process.env.S3_ENDPOINT,
    credentials: { accessKeyId: process.env.S3_ACCESS_KEY!, secretAccessKey: process.env.S3_SECRET_KEY! },
    requestChecksumCalculation: 'WHEN_REQUIRED', responseChecksumValidation: 'WHEN_REQUIRED', // keeps R2 and other S3-compatible services happy
  }) : null;
  constructor() {
    if (!this.s3 && process.env.RENDER) console.warn('WARNING: product photos are saved on a temporary disk and will disappear on restart. Set STORAGE_DRIVER=s3 (Cloudflare R2).');
  }
  async saveImage(file: { buffer: Buffer; mimetype: string; size: number }): Promise<string> {
    const ext = EXT[file.mimetype];
    if (!ext || !genuine(file.mimetype, file.buffer)) throw new BadRequestException('Only JPG, PNG or WebP images are allowed');
    const key = `products/${randomUUID()}.${ext}`;
    if (this.s3) {
      await this.s3.send(new PutObjectCommand({ Bucket: process.env.S3_BUCKET, Key: key, Body: file.buffer, ContentType: file.mimetype, CacheControl: 'public, max-age=31536000' }));
      return `${(process.env.S3_PUBLIC_URL || '').replace(/\/+$/, '')}/${key}`;
    }
    const path = join(process.env.UPLOAD_DIR || 'uploads', key);
    await mkdir(dirname(path), { recursive: true }); await writeFile(path, file.buffer);
    return `${process.env.API_PUBLIC_URL || 'http://localhost:4000'}/uploads/${key}`;
  }
}
