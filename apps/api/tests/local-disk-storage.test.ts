import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { LocalDiskStorageProvider } from '../src/storage/local-disk.provider.js';

describe('LocalDiskStorageProvider', () => {
  let dir: string;
  let storage: LocalDiskStorageProvider;

  beforeEach(async () => {
    dir = await mkdtemp(path.join(tmpdir(), 'vlab-storage-'));
    storage = new LocalDiskStorageProvider(dir);
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it('put/get/delete 往返一致', async () => {
    const data = Buffer.from('fake-png-bytes');
    await storage.put('asset_a1.png', data);

    const got = await storage.get('asset_a1.png');
    expect(got?.data.equals(data)).toBe(true);

    await storage.delete('asset_a1.png');
    expect(await storage.get('asset_a1.png')).toBeNull();
  });

  it('get 不存在返回 null', async () => {
    expect(await storage.get('asset_nope.png')).toBeNull();
  });

  it('非法 key 拒绝：.. 穿越 / 绝对路径 / 空段', async () => {
    for (const bad of ['../etc/passwd', 'a/../../b', '/abs/path.png', 'a//b.png']) {
      await expect(storage.put(bad, Buffer.from('x'))).rejects.toThrow('Illegal storage key');
    }
  });
});
