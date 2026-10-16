import {
  S3Client,
  PutObjectCommand,
  HeadObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { getEnv } from '../src/config/env.config';

async function main() {
  const env = getEnv();
  const endpoint = `http://${env.MINIO_ENDPOINT}:${env.MINIO_PORT}`;

  console.log(`[check-storage] Kết nối tới S3 Storage tại endpoint: ${endpoint}`);
  console.log(`[check-storage] Bucket: ${env.MINIO_BUCKET}`);

  const s3Client = new S3Client({
    endpoint,
    region: 'us-east-1',
    credentials: {
      accessKeyId: env.MINIO_ACCESS_KEY,
      secretAccessKey: env.MINIO_SECRET_KEY,
    },
    forcePathStyle: true,
  });

  const testKey = `uploads/check-storage-${Date.now()}.txt`;
  const fileContent = 'Hello from XFarm check-storage test!';
  const fileBuffer = Buffer.from(fileContent, 'utf-8');
  const contentType = 'text/plain';

  // 1. Presign PUT URL
  console.log('[1/4] Đang tạo presigned PUT URL...');
  const putCommand = new PutObjectCommand({
    Bucket: env.MINIO_BUCKET,
    Key: testKey,
    ContentType: contentType,
    ContentLength: fileBuffer.length,
  });
  const uploadUrl = await getSignedUrl(s3Client, putCommand, { expiresIn: 900 });
  console.log(`✔ Presigned URL: ${uploadUrl.substring(0, 80)}...`);

  // 2. Upload 1 file via presigned URL
  console.log('[2/4] Đang tải file lên qua presigned URL (PUT)...');
  const uploadRes = await fetch(uploadUrl, {
    method: 'PUT',
    headers: {
      'Content-Type': contentType,
      'Content-Length': fileBuffer.length.toString(),
    },
    body: fileBuffer,
  });

  if (!uploadRes.ok) {
    const errorText = await uploadRes.text();
    throw new Error(`Tải file thất bại (status: ${uploadRes.status}): ${errorText}`);
  }
  console.log(`✔ Tải file thành công (HTTP ${uploadRes.status})`);

  // 3. HeadObject
  console.log('[3/4] Đang kiểm tra thông tin đối tượng bằng HeadObject...');
  const head = await s3Client.send(
    new HeadObjectCommand({
      Bucket: env.MINIO_BUCKET,
      Key: testKey,
    }),
  );
  console.log(
    `✔ HeadObject hợp lệ: ContentType=${head.ContentType}, ContentLength=${head.ContentLength}`,
  );

  // Kiểm tra đọc công khai qua URL
  const publicUrl = `http://${env.MINIO_ENDPOINT}:${env.MINIO_PORT}/${env.MINIO_BUCKET}/${testKey}`;
  const publicRes = await fetch(publicUrl);
  if (publicRes.ok) {
    const fetchedContent = await publicRes.text();
    console.log(`✔ Đọc công khai thành công: "${fetchedContent}"`);
  } else {
    console.warn(`⚠ Đọc công khai trả về HTTP ${publicRes.status}`);
  }

  // 4. Xóa
  console.log('[4/4] Đang xóa đối tượng thử nghiệm...');
  await s3Client.send(
    new DeleteObjectCommand({
      Bucket: env.MINIO_BUCKET,
      Key: testKey,
    }),
  );
  console.log('✔ Xóa file thành công!');

  console.log(
    '\n🎉 Hoàn thành kiểm tra lưu trữ: Tất cả thao tác Presign PUT, Upload, HeadObject, Delete đều thành công.',
  );
}

main().catch((err) => {
  console.error('❌ Kiểm tra lưu trữ thất bại:', err);
  process.exit(1);
});
