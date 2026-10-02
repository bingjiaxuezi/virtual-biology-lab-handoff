import { BadGatewayException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { defaultRegistry } from '@virtual-biology-lab/capability-registry';
import { experimentDefinitionSchema } from '@virtual-biology-lab/experiment-schema';
import { validateExperiment } from '@virtual-biology-lab/experiment-validator';
import type { ValidationIssue } from '@virtual-biology-lab/experiment-validator';
import { PrismaService } from '../prisma/prisma.service.js';
import { summarizeChange } from './diff.js';
import { buildChangePrompt, buildGenerationPrompt } from './prompts.js';
import { type AIProvider, AI_PROVIDER, AiOutputParseError } from './provider.js';

/** 初次生成 + 最多 2 轮修复。 */
const MAX_ATTEMPTS = 3;

export interface AiProposal {
  definition: unknown;
  issues: ValidationIssue[];
  needsReview: boolean;
  provider: string;
  summary?: string[];
}

@Injectable()
export class AiService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(AI_PROVIDER) private readonly provider: AIProvider,
  ) {}

  /** 意图 → 草案提案。只在内存中生成，绝不落库。 */
  async generate(experimentId: string, intent: string): Promise<AiProposal> {
    await this.requireExperiment(experimentId);
    return this.propose((repairIssues) =>
      this.provider.generateStructured(
        buildGenerationPrompt(defaultRegistry, intent, repairIssues),
      ),
    );
  }

  /** 指令 → Change Proposal（新 Definition + 服务端 diff 摘要）。 */
  async change(experimentId: string, instruction: string): Promise<AiProposal> {
    const experiment = await this.requireExperiment(experimentId);
    const proposal = await this.propose((repairIssues) =>
      this.provider.generateStructured(
        buildChangePrompt(defaultRegistry, experiment.draft, instruction, repairIssues),
      ),
    );

    const before = experimentDefinitionSchema.safeParse(experiment.draft);
    const after = experimentDefinitionSchema.safeParse(proposal.definition);
    if (before.success && after.success) {
      proposal.summary = summarizeChange(before.data, after.data);
    }
    return proposal;
  }

  /** 生成 → 三层校验 → error 回喂修复（有界）→ needsReview 兜底。 */
  private async propose(
    attempt: (repairIssues: ValidationIssue[]) => Promise<unknown>,
  ): Promise<AiProposal> {
    let issues: ValidationIssue[] = [];
    let definition: unknown;

    for (let round = 0; round < MAX_ATTEMPTS; round++) {
      try {
        definition = await attempt(round === 0 ? [] : issues);
      } catch (cause) {
        // 结构化输出截断/非 JSON 视为可修复失败，回喂给下一轮 Repair
        if (cause instanceof AiOutputParseError) {
          issues = [
            {
              code: 'SCHEMA_INVALID',
              path: '$',
              message: `上次输出不是完整合法的 JSON（${cause.message}）。请控制篇幅、只输出完整 JSON。`,
              severity: 'error',
            },
          ];
          continue;
        }
        throw cause;
      }
      const result = validateExperiment(definition);
      issues = result.issues;
      if (!issues.some((issue) => issue.severity === 'error')) {
        return {
          definition,
          issues,
          needsReview: false,
          provider: this.provider.id,
        };
      }
    }

    if (definition === undefined) {
      throw new BadGatewayException(
        `AI 多次输出均不是合法 JSON，请换个描述重试（${issues[0]?.message ?? '未知原因'}）`,
      );
    }
    return { definition, issues, needsReview: true, provider: this.provider.id };
  }

  private async requireExperiment(id: string) {
    const experiment = await this.prisma.experiment.findUnique({ where: { id } });
    if (!experiment) throw new NotFoundException(`Experiment "${id}" not found`);
    return experiment;
  }
}
