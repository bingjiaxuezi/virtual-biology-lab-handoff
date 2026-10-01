import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@prisma/client', () => ({ PrismaClient: class {} }));

import { CatalogService } from '../src/catalog/catalog.service.js';

describe('CatalogService', () => {
  let findMany: ReturnType<typeof vi.fn>;
  let service: CatalogService;

  beforeEach(() => {
    findMany = vi.fn();
    service = new CatalogService({ experiment: { findMany } } as never);
  });

  it('only queries experiments that have at least one published version', async () => {
    findMany.mockResolvedValue([]);
    await service.listPublished();
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { versions: { some: {} } } }),
    );
  });

  it('returns title and latest version info, never the draft', async () => {
    findMany.mockResolvedValue([
      {
        id: 'exp1',
        title: '温度对酶活性的影响',
        versions: [{ id: 'ver1', version: 2, publishedAt: new Date('2026-10-01') }],
      },
    ]);
    const result = await service.listPublished();
    expect(result).toHaveLength(1);
    expect(result[0]!.experimentId).toBe('exp1');
    expect(result[0]!.latestVersion.version).toBe(2);
    expect(result[0]).not.toHaveProperty('draft');
  });
});
