import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class AssetsService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

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

  list() {
    return this.prisma.asset.findMany({ orderBy: { createdAt: 'desc' } });
  }

  async getByAssetId(assetId: string) {
    const asset = await this.prisma.asset.findUnique({ where: { assetId } });
    if (!asset) throw new NotFoundException(`Asset "${assetId}" not found`);
    return asset;
  }
}
