import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import {
  type StorageProvider,
  type StoredObject,
  assertSafeStorageKey,
} from './storage-provider.js';

/** 本地磁盘实现：STORAGE_DIR 下的普通文件树，供开发与单机部署使用。 */
export class LocalDiskStorageProvider implements StorageProvider {
  readonly id = 'local-disk';

  constructor(private readonly rootDir: string) {}

  private resolve(key: string): string {
    assertSafeStorageKey(key);
    const full = path.resolve(this.rootDir, key);
    if (!full.startsWith(path.resolve(this.rootDir) + path.sep)) {
      throw new Error(`Illegal storage key: ${key}`);
    }
    return full;
  }

  async put(key: string, data: Buffer): Promise<void> {
    const full = this.resolve(key);
    await mkdir(path.dirname(full), { recursive: true });
    await writeFile(full, data);
  }

  async get(key: string): Promise<StoredObject | null> {
    try {
      return { data: await readFile(this.resolve(key)) };
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null;
      throw error;
    }
  }

  async delete(key: string): Promise<void> {
    await rm(this.resolve(key), { force: true });
  }
}
