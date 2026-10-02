import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import { STORAGE_PROVIDER, type StorageProvider } from '../storage/storage-provider.js';

/** multer 内存存储上传文件的最小结构（避免仅为类型引入 @types/multer）。 */
export interface UploadedFilePayload {
  buffer: Buffer;
  mimetype: string;
  size: number;
  originalname: string;
}

/** 声明类型 → MIME 白名单。 */
const MIME_ALLOWLIST: Record<string, string[]> = {
  IMAGE: ['image/png', 'image/jpeg', 'image/webp', 'image/gif'],
  VIDEO: ['video/mp4', 'video/webm'],
  TEXT: ['text/plain', 'text/markdown'],
};

const EXT_BY_MIME: Record<string, string> = {
  'image/png': '.png',
  'image/jpeg': '.jpg',
  'image/webp': '.webp',
  'image/gif': '.gif',
  'video/mp4': '.mp4',
  'video/webm': '.webm',
  'text/plain': '.txt',
  'text/markdown': '.md',
};

@Injectable()
export class AssetsService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(STORAGE_PROVIDER) private readonly storage: StorageProvider,
  ) {}

  async register(input: {
    assetId: string;
    type: string;
    name?: string | undefined;
    metadata?: Record<string, unknown> | undefined;
  }) {
    const existing = await this.prisma.asset.findUnique({ where: { assetId: input.assetId } });
    if (existing) throw new ConflictException(`Asset "${input.assetId}" already registered`);
    return this.prisma.asset.create({
      data: {
        assetId: input.assetId,
        type: input.type,
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.metadata !== undefined
          ? { metadata: input.metadata as Prisma.InputJsonValue }
          : {}),
      },
    });
  }

  /** 上传实体文件：MIME 白名单校验 → 落盘 → 建记录。assetId 由服务端生成。 */
  async upload(input: { type: string; name?: string | undefined; file: UploadedFilePayload }) {
    const allowlist = MIME_ALLOWLIST[input.type];
    if (!allowlist) {
      throw new BadRequestException({ code: 'ASSET_TYPE_UNSUPPORTED', type: input.type });
    }
    if (!allowlist.includes(input.file.mimetype)) {
      throw new BadRequestException({
        code: 'ASSET_MIME_MISMATCH',
        type: input.type,
        mimeType: input.file.mimetype,
      });
    }

    const assetId = `asset_${globalThis.crypto.randomUUID().replaceAll('-', '').slice(0, 12)}`;
    const storageKey = `${assetId}${EXT_BY_MIME[input.file.mimetype] ?? ''}`;
    await this.storage.put(storageKey, input.file.buffer);
    try {
      return await this.prisma.asset.create({
        data: {
          assetId,
          type: input.type,
          storageKey,
          mimeType: input.file.mimetype,
          sizeBytes: input.file.size,
          ...(input.name ? { name: input.name } : {}),
        },
      });
    } catch (error) {
      // 记录失败时回收已落盘文件，避免孤儿对象
      await this.storage.delete(storageKey).catch(() => undefined);
      throw error;
    }
  }

  /** 读取实体文件；仅登记元数据时返回 null。 */
  async getContent(assetId: string) {
    const asset = await this.getByAssetId(assetId);
    if (!asset.storageKey || !asset.mimeType) return null;
    const object = await this.storage.get(asset.storageKey);
    if (!object) return null;
    return { data: object.data, mimeType: asset.mimeType, sizeBytes: asset.sizeBytes };
  }

  list() {
    return this.prisma.asset.findMany({ orderBy: { createdAt: 'desc' } });
  }

  async getByAssetId(assetId: string) {
    const asset = await this.prisma.asset.findUnique({ where: { assetId } });
    if (!asset) throw new NotFoundException(`Asset "${assetId}" not found`);
    return asset;
  }
}
