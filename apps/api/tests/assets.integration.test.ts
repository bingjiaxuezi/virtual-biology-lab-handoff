/**
 * 素材上传/分发集成测试：真实 PostgreSQL + 本地磁盘临时目录。
 * 需要 TEST_DATABASE_URL，未设置时跳过。
 */
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL;
const describeIf = TEST_DATABASE_URL ? describe : describe.skip;

type PrismaClientType = import('@prisma/client').PrismaClient;
type AssetsServiceType = import('../src/assets/assets.service.js').AssetsService;

describeIf('assets (integration)', () => {
  let prisma: PrismaClientType;
  let assets: AssetsServiceType;
  let storageDir: string;

  beforeAll(async () => {
    const { PrismaClient } = await import('@prisma/client');
    const { AssetsService } = await import('../src/assets/assets.service.js');
    const { LocalDiskStorageProvider } = await import('../src/storage/local-disk.provider.js');
    prisma = new PrismaClient({ datasourceUrl: TEST_DATABASE_URL! });
    storageDir = await mkdtemp(path.join(tmpdir(), 'vlab-assets-it-'));
    assets = new AssetsService(prisma as never, new LocalDiskStorageProvider(storageDir));
    await prisma.asset.deleteMany({ where: { assetId: { startsWith: 'it_' } } });
  });

  afterAll(async () => {
    await prisma.asset.deleteMany({ where: { assetId: { startsWith: 'it_' } } });
    await prisma.$disconnect();
    await rm(storageDir, { recursive: true, force: true });
  });

  it('上传 → 元数据落库 → 内容回读一致', async () => {
    const bytes = Buffer.from('fake-png-content');
    const created = await assets.upload({
      type: 'IMAGE',
      name: '集成测试图片',
      file: { buffer: bytes, mimetype: 'image/png', size: bytes.length, originalname: 't.png' },
    });

    expect(created.assetId).toMatch(/^asset_/);
    expect(created.storageKey).toMatch(/\.png$/);
    expect(created.mimeType).toBe('image/png');
    expect(created.sizeBytes).toBe(bytes.length);

    // 测试隔离：改名为 it_ 前缀便于清理
    await prisma.asset.update({
      where: { assetId: created.assetId },
      data: { assetId: `it_${created.assetId}` },
    });

    const content = await assets.getContent(`it_${created.assetId}`);
    expect(content?.data.equals(bytes)).toBe(true);
    expect(content?.mimeType).toBe('image/png');
  });

  it('MIME 与声明类型不符 → 400，不落库不落盘', async () => {
    await expect(
      assets.upload({
        type: 'VIDEO',
        file: {
          buffer: Buffer.from('x'),
          mimetype: 'image/png',
          size: 1,
          originalname: 'x.png',
        },
      }),
    ).rejects.toMatchObject({ response: { code: 'ASSET_MIME_MISMATCH' } });
  });

  it('仅登记元数据的资源 getContent 返回 null（学生端据此降级）', async () => {
    await assets.register({ assetId: 'it_meta_only', type: 'VIDEO', name: '仅元数据' });
    expect(await assets.getContent('it_meta_only')).toBeNull();
  });
});
