import {
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import type { RunState } from '@virtual-biology-lab/experiment-events';
import { experimentDefinitionSchema } from '@virtual-biology-lab/experiment-schema';
import type { ExperimentDefinition } from '@virtual-biology-lab/experiment-schema';
import { type AIProvider, AI_PROVIDER } from '../ai/provider.js';
import { PrismaService } from '../prisma/prisma.service.js';
import {
  type StudentContext,
  buildBriefingPrompt,
  buildHintPrompt,
  buildObservationAssistPrompt,
  buildReviewPrompt,
} from './student-ai-prompts.js';

type AiEventType =
  | 'AI_BRIEFING_VIEWED'
  | 'AI_HINT_REQUESTED'
  | 'AI_HINT_SHOWN'
  | 'AI_OBSERVATION_ASSISTED'
  | 'AI_REVIEW_GENERATED';

/** Student AI：只读上下文 + 文本生成；除 AI 事件落库外不改变 Run 任何状态。 */
@Injectable()
export class StudentAiService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(AI_PROVIDER) private readonly provider: AIProvider,
  ) {}

  async briefing(runId: string) {
    const { run, ctx } = await this.loadContext(runId);
    this.requireEnabled(ctx.definition.aiPolicy.briefing.enabled);
    const text = await this.provider.generateText(buildBriefingPrompt(ctx));
    await this.appendAiEvents(run, [{ type: 'AI_BRIEFING_VIEWED', payload: {} }], ctx.state);
    return { text };
  }

  async hint(runId: string) {
    const { run, ctx } = await this.loadContext(runId);
    this.requireEnabled(ctx.definition.aiPolicy.tutor.enabled);
    const text = await this.provider.generateText(buildHintPrompt(ctx));
    await this.appendAiEvents(
      run,
      [
        { type: 'AI_HINT_REQUESTED', payload: {} },
        { type: 'AI_HINT_SHOWN', payload: { length: text.length } },
      ],
      ctx.state,
    );
    return { text };
  }

  async observationAssist(runId: string, draftText: string) {
    const { run, ctx } = await this.loadContext(runId);
    this.requireEnabled(ctx.definition.aiPolicy.observationAssist.enabled);
    const suggestion = await this.provider.generateText(
      buildObservationAssistPrompt(ctx, draftText),
    );
    await this.appendAiEvents(
      run,
      [{ type: 'AI_OBSERVATION_ASSISTED', payload: { draftLength: draftText.length } }],
      ctx.state,
    );
    return { suggestion };
  }

  async review(runId: string) {
    const { run, ctx } = await this.loadContext(runId);
    this.requireEnabled(ctx.definition.aiPolicy.review.enabled);
    if (run.status !== 'COMPLETED') {
      throw new ConflictException({ code: 'AI_REVIEW_NOT_READY' });
    }
    const allEvents = await this.prisma.experimentEvent.findMany({
      where: { runId: run.id },
      orderBy: { sequence: 'asc' },
      select: { type: true, nodeId: true },
    });
    const text = await this.provider.generateText(buildReviewPrompt(ctx, allEvents));
    await this.appendAiEvents(run, [{ type: 'AI_REVIEW_GENERATED', payload: {} }], ctx.state);
    return { text };
  }

  private requireEnabled(enabled: boolean) {
    if (!enabled) {
      throw new ForbiddenException({ code: 'AI_FEATURE_DISABLED' });
    }
  }

  /** 只读上下文：Run 快照 + 固定版本 Definition + 近期 20 条事件。 */
  private async loadContext(runId: string) {
    const run = await this.prisma.experimentRun.findUnique({
      where: { id: runId },
      include: { experimentVersion: true },
    });
    if (!run) throw new NotFoundException(`Run "${runId}" not found`);

    const parsed = experimentDefinitionSchema.safeParse(run.experimentVersion.definition);
    if (!parsed.success) {
      throw new ConflictException(`Run "${runId}" 的版本定义不可解析`);
    }
    const definition: ExperimentDefinition = parsed.data;
    const state = run.state as unknown as RunState;

    const recent = await this.prisma.experimentEvent.findMany({
      where: { runId: run.id },
      orderBy: { sequence: 'desc' },
      take: 20,
      select: { type: true, nodeId: true, payload: true },
    });

    const ctx: StudentContext = {
      definition,
      currentNode: definition.nodes.find((n) => n.id === run.currentNodeId),
      state,
      recentEvents: recent.reverse(),
    };
    return { run, ctx };
  }

  /**
   * AI 事件与学生命令共用 (runId, sequence) 序列：
   * 事务内乐观并发（lastSequence 守卫）+ 唯一约束兜底，轨迹严格单调。
   */
  private async appendAiEvents(
    run: { id: string; lastSequence: number; currentNodeId: string },
    events: { type: AiEventType; payload: Record<string, unknown> }[],
    state: RunState,
  ) {
    const newLastSequence = run.lastSequence + events.length;
    try {
      await this.prisma.$transaction(async (tx) => {
        const updated = await tx.experimentRun.updateMany({
          where: { id: run.id, lastSequence: run.lastSequence },
          data: { lastSequence: newLastSequence },
        });
        if (updated.count === 0) {
          throw new ConflictException(`Run "${run.id}" was modified concurrently, retry`);
        }
        await tx.experimentEvent.createMany({
          data: events.map((event, index) => ({
            id: globalThis.crypto.randomUUID(),
            runId: run.id,
            sequence: run.lastSequence + index + 1,
            type: event.type,
            nodeId: run.currentNodeId,
            payload: event.payload as Prisma.InputJsonValue,
            stateAfter: state as unknown as Prisma.InputJsonValue,
          })),
        });
      });
    } catch (error) {
      if (error instanceof Error && 'code' in error && error.code === 'P2002') {
        throw new ConflictException(`Run "${run.id}" was modified concurrently, retry`);
      }
      throw error;
    }
  }
}
