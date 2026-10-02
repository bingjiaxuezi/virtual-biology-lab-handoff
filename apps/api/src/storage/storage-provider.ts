/** Storage Provider 接口：隔离具体供应商（本地磁盘 / OSS / S3），业务只面向该接口。 */

export interface StoredObject {
  data: Buffer;
}

export interface StorageProvider {
  readonly id: string;
  put(key: string, data: Buffer): Promise<void>;
  /** 不存在时返回 null，由调用方决定 404 语义。 */
  get(key: string): Promise<StoredObject | null>;
  delete(key: string): Promise<void>;
}

export const STORAGE_PROVIDER = Symbol('STORAGE_PROVIDER');

/** storageKey 白名单：仅允许 字母/数字/._- 与单层以上路径，拒绝 .. 与绝对路径。 */
export function assertSafeStorageKey(key: string): void {
  if (!/^(?!.*\.\.)[A-Za-z0-9][A-Za-z0-9._/-]*$/.test(key) || key.includes('//')) {
    throw new Error(`Illegal storage key: ${key}`);
  }
}
