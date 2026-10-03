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

  it('Range 切片：合法区间 / 开区间 / 尾区间 / 越界 / 多区间回退', async () => {
    const bytes = Buffer.from(Array.from({ length: 4096 }, (_, i) => i % 251));
    const created = await assets.upload({
      type: 'VIDEO',
      name: 'range 测试视频',
      file: { buffer: bytes, mimetype: 'video/mp4', size: bytes.length, originalname: 'r.mp4' },
    });
    await prisma.asset.update({
      where: { assetId: created.assetId },
      data: { assetId: `it_${created.assetId}` },
    });
    const id = `it_${created.assetId}`;

    // 无 Range → 全量
    const full = await assets.getContentRange(id);
    expect(full && !('unsatisfiable' in full) && full.range === null).toBe(true);
    expect(full && !('unsatisfiable' in full) && full.data.length).toBe(4096);

    // 闭区间
    const part = await assets.getContentRange(id, 'bytes=0-1023');
    expect(part && !('unsatisfiable' in part) && part.range).toEqual({
      start: 0,
      end: 1023,
      total: 4096,
    });
    expect(part && !('unsatisfiable' in part) && part.data.equals(bytes.subarray(0, 1024))).toBe(
      true,
    );

    // 开区间 start-
    const open = await assets.getContentRange(id, 'bytes=2048-');
    expect(open && !('unsatisfiable' in open) && open.range).toEqual({
      start: 2048,
      end: 4095,
      total: 4096,
    });

    // 尾区间 -500
    const tail = await assets.getContentRange(id, 'bytes=-500');
    expect(tail && !('unsatisfiable' in tail) && tail.range).toEqual({
      start: 3596,
      end: 4095,
      total: 4096,
    });
    expect(tail && !('unsatisfiable' in tail) && tail.data.length).toBe(500);

    // 越界 → unsatisfiable（控制器据此返回 416）
    const over = await assets.getContentRange(id, 'bytes=99999999-');
    expect(over && 'unsatisfiable' in over && over.total).toBe(4096);

    // 多区间 → 回退全量
    const multi = await assets.getContentRange(id, 'bytes=0-100,200-300');
    expect(multi && !('unsatisfiable' in multi) && multi.range === null).toBe(true);
    expect(multi && !('unsatisfiable' in multi) && multi.data.length).toBe(4096);
  });
});
