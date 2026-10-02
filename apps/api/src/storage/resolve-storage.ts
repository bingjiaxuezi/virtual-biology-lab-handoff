import path from 'node:path';
import { LocalDiskStorageProvider } from './local-disk.provider.js';
import type { StorageProvider } from './storage-provider.js';

/** Storage Provider 工厂：STORAGE_PROVIDER=local（默认）；STORAGE_DIR 默认 apps/api/storage。 */
export function resolveStorageProvider(env: NodeJS.ProcessEnv = process.env): StorageProvider {
  const kind = env.STORAGE_PROVIDER ?? 'local';
  if (kind === 'local') {
    return new LocalDiskStorageProvider(env.STORAGE_DIR ?? path.resolve(process.cwd(), 'storage'));
  }
  throw new Error(`Unknown STORAGE_PROVIDER "${kind}"`);
}
