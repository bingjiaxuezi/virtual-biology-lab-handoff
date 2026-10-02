import {
  Inject,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import type { ValidationIssue } from '@virtual-biology-lab/experiment-validator';
import { validateExperiment } from '@virtual-biology-lab/experiment-validator';
import { PrismaService } from '../prisma/prisma.service.js';

export interface DraftSaveResult {
  experiment: unknown;
  warnings: ValidationIssue[];
}

@Injectable()
export class ExperimentsService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  /**
   * 草稿保存：只要求结构可解析（三层校验跑完），语义/能力问题作为 warning 返回。
   * 完全无法解析的定义返回 422 并附带完整 issues。
   */
  async create(title: string, draft: unknown): Promise<DraftSaveResult> {
    const issues = this.validateDraft(draft);
    const experiment = await this.prisma.experiment.create({
      data: { title, draft: draft as Prisma.InputJsonValue },
    });
    return { experiment, warnings: issues };
  }

  async update(
    id: string,
    input: { title?: string | undefined; draft?: unknown },
  ): Promise<DraftSaveResult> {
    const existing = await this.prisma.experiment.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException(`Experiment "${id}" not found`);
    const issues = input.draft === undefined ? [] : this.validateDraft(input.draft);
    const experiment = await this.prisma.experiment.update({
      where: { id },
      data: {
        ...(input.title !== undefined ? { title: input.title } : {}),
        ...(input.draft !== undefined ? { draft: input.draft as Prisma.InputJsonValue } : {}),
      },
    });
    return { experiment, warnings: issues };
  }

  list() {
    return this.prisma.experiment.findMany({
      orderBy: { updatedAt: 'desc' },
      include: { versions: { select: { id: true, version: true, publishedAt: true } } },
    });
  }

  async get(id: string) {
    const experiment = await this.prisma.experiment.findUnique({
      where: { id },
      include: { versions: { orderBy: { version: 'desc' } } },
    });
    if (!experiment) throw new NotFoundException(`Experiment "${id}" not found`);
    return experiment;
  }

  async remove(id: string) {
    const existing = await this.prisma.experiment.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException(`Experiment "${id}" not found`);
    await this.prisma.experiment.delete({ where: { id } });
    return { deleted: true };
  }

  /**
   * 发布：三层校验全过（无 error 级问题）才生成不可变版本。
   * 版本号在事务内取 MAX+1，防止并发发布产生重复版本。
   */
  async publish(id: string) {
    const experiment = await this.prisma.experiment.findUnique({ where: { id } });
    if (!experiment) throw new NotFoundException(`Experiment "${id}" not found`);

    const validation = validateExperiment(experiment.draft);
    if (!validation.valid) {
      throw new UnprocessableEntityException({
        message: 'Experiment failed validation and cannot be published',
        issues: validation.issues,
      });
    }

    const version = await this.prisma.$transaction(async (tx) => {
      const latest = await tx.experimentVersion.findFirst({
        where: { experimentId: id },
        orderBy: { version: 'desc' },
        select: { version: true },
      });
      return tx.experimentVersion.create({
        data: {
          experimentId: id,
          version: (latest?.version ?? 0) + 1,
          definition: experiment.draft as Prisma.InputJsonValue,
        },
      });
    });
    return { version, warnings: validation.issues };
  }

  async versions(id: string) {
    const experiment = await this.prisma.experiment.findUnique({ where: { id } });
    if (!experiment) throw new NotFoundException(`Experiment "${id}" not found`);
    return this.prisma.experimentVersion.findMany({
      where: { experimentId: id },
      orderBy: { version: 'desc' },
    });
  }

  /** 教师查看某实验全部已发布版本下的学生 Run 摘要（只读，按开始时间倒序）。 */
  async listRuns(id: string) {
    const experiment = await this.prisma.experiment.findUnique({ where: { id } });
    if (!experiment) throw new NotFoundException(`Experiment "${id}" not found`);
    const runs = await this.prisma.experimentRun.findMany({
      where: { experimentVersion: { experimentId: id } },
      orderBy: { startedAt: 'desc' },
      include: { experimentVersion: { select: { version: true } } },
    });
    return runs.map((run) => ({
      runId: run.id,
      version: run.experimentVersion.version,
      studentId: run.studentId,
      status: run.status,
      score: this.extractScore(run.state),
      startedAt: run.startedAt,
      completedAt: run.completedAt,
    }));
  }

  private extractScore(state: Prisma.JsonValue): number | null {
    if (state && typeof state === 'object' && !Array.isArray(state)) {
      const score = (state as Record<string, unknown>).score;
      if (typeof score === 'number') return score;
    }
    return null;
  }

  private validateDraft(draft: unknown): ValidationIssue[] {
    const validation = validateExperiment(draft);
    if (!validation.valid && validation.issues.some((i) => i.code === 'SCHEMA_INVALID')) {
      // 结构都不可解析时草稿也不予保存
      throw new UnprocessableEntityException({
        message: 'Draft is not a parseable experiment definition',
        issues: validation.issues,
      });
    }
    return validation.issues;
  }
}
