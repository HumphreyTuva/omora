import { BadRequestException, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { mkdir, readFile, unlink, writeFile } from 'fs/promises';
import { dirname, join } from 'path';
import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
const EXT: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };
// Don't trust the browser's claimed type: check the file's first bytes too.
const genuine = (mime: string, b: Buffer) => mime === 'image/jpeg' ? b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff : mime === 'image/png' ? b.subarray(0, 4).toString('hex') === '89504e47' : b.subarray(0, 4).toString() === 'RIFF' && b.subarray(8, 12).toString() === 'WEBP';
const DOC_EXT: Record<string, string> = { ...EXT, 'application/pdf': 'pdf' };
const genuineDoc = (mime: string, b: Buffer) => mime === 'application/pdf' ? b.subarray(0, 4).toString() === '%PDF' : genuine(mime, b);
// STORAGE_DRIVER=local (default) saves to ./uploads: fine on your own computer, but on Render's free server that disk is wiped on every restart.
// STORAGE_DRIVER=s3 stores photos permanently in Cloudflare R2 (or AWS S3 / any S3-compatible service).
@Injectable()
export class StorageService {
  private s3 = process.env.STORAGE_DRIVER === 's3' ? new S3Client({
    region: process.env.S3_REGION || 'auto', endpoint: process.env.S3_ENDPOINT,
    credentials: { accessKeyId: process.env.S3_ACCESS_KEY!, secretAccessKey: process.env.S3_SECRET_KEY! },
    requestChecksumCalculation: 'WHEN_REQUIRED', responseChecksumValidation: 'WHEN_REQUIRED', // keeps R2 and other S3-compatible services happy
  }) : null;
  // PRIVATE bucket for identity documents: its own bucket and its own keys, with NO public address. Files are only ever read back through the API
  // by their owner or an admin. If it is not configured, uploads are refused (they are never saved to the public photo bucket).
  private docs = process.env.STORAGE_DRIVER === 's3' && process.env.S3_DOCS_BUCKET && process.env.S3_DOCS_ACCESS_KEY && process.env.S3_DOCS_SECRET_KEY ? new S3Client({
    region: process.env.S3_REGION || 'auto', endpoint: process.env.S3_ENDPOINT,
    credentials: { accessKeyId: process.env.S3_DOCS_ACCESS_KEY, secretAccessKey: process.env.S3_DOCS_SECRET_KEY },
    requestChecksumCalculation: 'WHEN_REQUIRED', responseChecksumValidation: 'WHEN_REQUIRED',
  }) : null;
  private safeKey(key: string) { if (!key.startsWith('seller-docs/') || key.includes('..')) throw new BadRequestException('Invalid file'); return key; }
  async savePrivate(file: { buffer: Buffer; mimetype: string }, folder: string): Promise<string> {
    const ext = DOC_EXT[file.mimetype];
    if (!ext || !genuineDoc(file.mimetype, file.buffer)) throw new BadRequestException('Only JPG, PNG, WebP or PDF files are allowed');
    if (process.env.STORAGE_DRIVER === 's3' && !this.docs) throw new ServiceUnavailableException('Document uploads are not set up yet. Please contact support.');
    const key = this.safeKey(`${folder}/${randomUUID()}.${ext}`);
    if (this.docs) await this.docs.send(new PutObjectCommand({ Bucket: process.env.S3_DOCS_BUCKET, Key: key, Body: file.buffer, ContentType: file.mimetype, CacheControl: 'private, no-store' }));
    else { const path = join(process.env.PRIVATE_UPLOAD_DIR || 'private-uploads', key); await mkdir(dirname(path), { recursive: true }); await writeFile(path, file.buffer); }
    return key;
  }
  async readPrivate(key: string): Promise<Buffer> {
    this.safeKey(key);
    if (this.docs) { const r = await this.docs.send(new GetObjectCommand({ Bucket: process.env.S3_DOCS_BUCKET, Key: key })); return Buffer.from(await (r.Body as any).transformToByteArray()); }
    return readFile(join(process.env.PRIVATE_UPLOAD_DIR || 'private-uploads', key));
  }
  async deletePrivate(key: string): Promise<void> {
    try { this.safeKey(key); if (this.docs) await this.docs.send(new DeleteObjectCommand({ Bucket: process.env.S3_DOCS_BUCKET, Key: key })); else await unlink(join(process.env.PRIVATE_UPLOAD_DIR || 'private-uploads', key)); } catch (e) { console.error('Could not delete document', e); }
  }
  constructor() {
    if (!this.s3 && process.env.RENDER) console.warn('WARNING: product photos are saved on a temporary disk and will disappear on restart. Set STORAGE_DRIVER=s3 (Cloudflare R2).');
  }
  // Removes a photo file (best effort: a missing file is not an error). Only touches the products/ folder.
  async deleteImage(url: string): Promise<void> {
    try {
      const base = (process.env.S3_PUBLIC_URL || '').replace(/\/+$/, ''), local = `${process.env.API_PUBLIC_URL || 'http://localhost:4000'}/uploads/`;
      const key = this.s3 && base && url.startsWith(base + '/') ? url.slice(base.length + 1) : url.startsWith(local) ? url.slice(local.length) : '';
      if (!key.startsWith('products/') || key.includes('..')) return;
      if (this.s3 && url.startsWith(base)) await this.s3.send(new DeleteObjectCommand({ Bucket: process.env.S3_BUCKET, Key: key }));
      else await unlink(join(process.env.UPLOAD_DIR || 'uploads', key));
    } catch (e) { console.error('Could not delete photo file', e); }
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
