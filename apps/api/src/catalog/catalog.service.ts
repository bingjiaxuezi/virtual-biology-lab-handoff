import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class CatalogService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async listPublished() {
    const experiments = await this.prisma.experiment.findMany({
      where: { versions: { some: {} } },
      select: {
        id: true,
        title: true,
        versions: {
          orderBy: { version: 'desc' },
          take: 1,
          select: { id: true, version: true, publishedAt: true },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });
    return experiments.flatMap((experiment) => {
      const latest = experiment.versions[0];
      if (!latest) return [];
      return [{ experimentId: experiment.id, title: experiment.title, latestVersion: latest }];
    });
  }

  async getPublishedVersion(versionId: string) {
    const version = await this.prisma.experimentVersion.findUnique({ where: { id: versionId } });
    if (!version) throw new NotFoundException(`Version "${versionId}" not found`);
    return {
      id: version.id,
      experimentId: version.experimentId,
      version: version.version,
      publishedAt: version.publishedAt,
      definition: version.definition,
    };
  }
}
