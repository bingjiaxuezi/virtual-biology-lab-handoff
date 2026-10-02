import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { templateDefinition } from '../src/ai/mock.provider.js';
import type { AIProvider, TextGenerationRequest } from '../src/ai/provider.js';
import { StudentAiService } from '../src/student-ai/student-ai.service.js';

vi.mock('@prisma/client', () => ({ PrismaClient: class {} }));

class TextProvider implements AIProvider {
  readonly id = 'text-test';
  readonly calls: TextGenerationRequest[] = [];
  async generateStructured(): Promise<unknown> {
    throw new Error('not used');
  }
  async generateText(request: TextGenerationRequest): Promise<string> {
    this.calls.push(request);
    return `文本回复:${request.context?.usage ?? 'unknown'}`;
  }
}

function enabledDefinition() {
  const def = templateDefinition();
  def.aiPolicy = {
    briefing: { enabled: true },
    tutor: { ...def.aiPolicy.tutor, enabled: true, hintLevel: 'LIGHT' },
    observationAssist: { enabled: true },
    review: { enabled: true },
  };
  return def;
}

function makePrisma(overrides: { status?: string; aiPolicyEnabled?: boolean } = {}) {
  const definition = enabledDefinition();
  if (overrides.aiPolicyEnabled === false) {
    definition.aiPolicy = {
      briefing: { enabled: false },
      tutor: { ...definition.aiPolicy.tutor, enabled: false },
      observationAssist: { enabled: false },
      review: { enabled: false },
    };
  }
  const run = {
    id: 'run1',
    status: overrides.status ?? 'RUNNING',
    currentNodeId: 'set-temp',
    state: { variables: { temperature: 25 }, score: 0 },
    lastSequence: 5,
    experimentVersion: { id: 'ver1', definition },
  };
  const tx = {
    experimentRun: { updateMany: vi.fn().mockResolvedValue({ count: 1 }) },
    experimentEvent: { createMany: vi.fn().mockResolvedValue({ count: 2 }) },
  };
  return {
    experimentRun: { findUnique: vi.fn().mockResolvedValue(run) },
    experimentEvent: {
      findMany: vi.fn().mockResolvedValue([]),
      count: vi.fn().mockResolvedValue(0),
      createMany: tx.experimentEvent.createMany,
    },
    $transaction: vi.fn((fn: (t: typeof tx) => unknown) => fn(tx)),
    __tx: tx,
    __run: run,
  };
}

describe('StudentAiService', () => {
  let prisma: ReturnType<typeof makePrisma>;
  let provider: TextProvider;
  let service: StudentAiService;

  beforeEach(() => {
    prisma = makePrisma();
    provider = new TextProvider();
    service = new StudentAiService(prisma as never, provider);
  });

  it('briefing：返回文本并落库 AI_BRIEFING_VIEWED，sequence 自 lastSequence 连续', async () => {
    const result = await service.briefing('run1');

    expect(result.text).toContain('briefing');
    const events = prisma.__tx.experimentEvent.createMany.mock.calls[0]![0].data as {
      sequence: number;
      type: string;
    }[];
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({ sequence: 6, type: 'AI_BRIEFING_VIEWED' });
    // lastSequence 同步推进，但不触碰状态字段
    const update = prisma.__tx.experimentRun.updateMany.mock.calls[0]![0] as {
      data: Record<string, unknown>;
    };
    expect(update.data).toEqual({ lastSequence: 6 });
  });

  it('hint：双事件连号落库，上下文包含当前节点与 hintLevel', async () => {
    await service.hint('run1');

    const events = prisma.__tx.experimentEvent.createMany.mock.calls[0]![0].data as {
      sequence: number;
      type: string;
    }[];
    expect(events.map((e) => e.type)).toEqual(['AI_HINT_REQUESTED', 'AI_HINT_SHOWN']);
    expect(events.map((e) => e.sequence)).toEqual([6, 7]);
    expect(provider.calls[0]!.userPrompt).toContain('set-temp');
    expect(provider.calls[0]!.userPrompt).toContain('LIGHT');
  });

  it('observationAssist：只返回建议，Run 状态字段零变更', async () => {
    const result = await service.observationAssist('run1', '有气泡');

    expect(result.suggestion).toContain('observation-assist');
    expect(provider.calls[0]!.userPrompt).toContain('有气泡');
    // 只更新 lastSequence，不产生 OBSERVATION_SUBMITTED，不碰 currentNodeId/state
    const update = prisma.__tx.experimentRun.updateMany.mock.calls[0]![0] as {
      data: Record<string, unknown>;
    };
    expect(Object.keys(update.data)).toEqual(['lastSequence']);
  });

  it('review：RUNNING 状态返回 409 AI_REVIEW_NOT_READY，不调 Provider', async () => {
    await expect(service.review('run1')).rejects.toMatchObject({
      response: { code: 'AI_REVIEW_NOT_READY' },
    });
    await expect(service.review('run1')).rejects.toBeInstanceOf(ConflictException);
    expect(provider.calls).toHaveLength(0);
  });

  it('review：COMPLETED 状态基于完整事件流生成并落库 AI_REVIEW_GENERATED', async () => {
    prisma = makePrisma({ status: 'COMPLETED' });
    service = new StudentAiService(prisma as never, provider);

    await service.review('run1');

    const events = prisma.__tx.experimentEvent.createMany.mock.calls[0]![0].data as {
      type: string;
    }[];
    expect(events[0]!.type).toBe('AI_REVIEW_GENERATED');
  });

  it('门控：功能 disabled 时 403，不调 Provider、不记事件', async () => {
    prisma = makePrisma({ aiPolicyEnabled: false });
    service = new StudentAiService(prisma as never, provider);

    await expect(service.hint('run1')).rejects.toMatchObject({
      response: { code: 'AI_FEATURE_DISABLED' },
    });
    await expect(service.hint('run1')).rejects.toBeInstanceOf(ForbiddenException);
    expect(provider.calls).toHaveLength(0);
    expect(prisma.__tx.experimentEvent.createMany).not.toHaveBeenCalled();
  });

  it('Run 不存在：404', async () => {
    prisma.experimentRun.findUnique.mockResolvedValue(null);
    await expect(service.briefing('missing')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('配额：hint 达到上限返回 429，不调 Provider、不记事件', async () => {
    prisma.experimentEvent.count.mockResolvedValue(20);

    await expect(service.hint('run1')).rejects.toMatchObject({ status: 429 });
    await expect(service.hint('run1')).rejects.toMatchObject({
      response: { code: 'AI_RATE_LIMITED', feature: 'hint', max: 20 },
    });
    expect(provider.calls).toHaveLength(0);
    expect(prisma.__tx.experimentEvent.createMany).not.toHaveBeenCalled();
  });
});
