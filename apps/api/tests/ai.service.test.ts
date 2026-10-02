import { BadGatewayException, NotFoundException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AiService } from '../src/ai/ai.service.js';
import { templateDefinition } from '../src/ai/mock.provider.js';
import {
  type AIProvider,
  AiOutputParseError,
  type StructuredGenerationRequest,
} from '../src/ai/provider.js';

vi.mock('@prisma/client', () => ({ PrismaClient: class {} }));

/** 按脚本依次返回输出的假 Provider，记录每次收到的 repair issues。 */
class ScriptedProvider implements AIProvider {
  readonly id = 'scripted';
  readonly calls: StructuredGenerationRequest[] = [];
  constructor(private readonly outputs: unknown[]) {}

  async generateStructured(request: StructuredGenerationRequest): Promise<unknown> {
    this.calls.push(request);
    const output = this.outputs[Math.min(this.calls.length - 1, this.outputs.length - 1)];
    return structuredClone(output);
  }

  async generateText(): Promise<string> {
    throw new Error('not used');
  }
}

function makePrisma(draft: unknown = templateDefinition()) {
  return {
    experiment: {
      findUnique: vi.fn().mockResolvedValue({ id: 'exp1', title: 't', draft }),
    },
  };
}

/** 前 failTimes 次抛 AiOutputParseError，之后返回正常输出的 Provider。 */
class FlakyParseProvider extends ScriptedProvider {
  constructor(
    private readonly failTimes: number,
    outputs: unknown[],
  ) {
    super(outputs);
  }

  override async generateStructured(request: StructuredGenerationRequest): Promise<unknown> {
    if (this.calls.length < this.failTimes) {
      this.calls.push(request);
      throw new AiOutputParseError('AI 输出被截断');
    }
    return super.generateStructured(request);
  }
}

function brokenTemplate(): Record<string, unknown> {
  // 引用未定义变量 → 语义层 error
  const broken = templateDefinition() as unknown as Record<string, unknown>;
  for (const n of broken.nodes as { type: string; config?: { variableId?: string } }[]) {
    if (n.type === 'VARIABLE_INPUT' && n.config) n.config.variableId = 'ghost-var';
  }
  return broken;
}

describe('AiService', () => {
  let prisma: ReturnType<typeof makePrisma>;

  beforeEach(() => {
    prisma = makePrisma();
  });

  it('生成成功：一次通过校验，issues 无 error，needsReview=false', async () => {
    const provider = new ScriptedProvider([templateDefinition()]);
    const service = new AiService(prisma as never, provider);

    const proposal = await service.generate('exp1', '生成一个温度实验');

    expect(proposal.needsReview).toBe(false);
    expect(proposal.issues.filter((i) => i.severity === 'error')).toEqual([]);
    expect(proposal.provider).toBe('scripted');
    expect(provider.calls).toHaveLength(1);
  });

  it('Repair Loop：首轮 error 回喂后修复成功', async () => {
    const provider = new ScriptedProvider([brokenTemplate(), templateDefinition()]);
    const service = new AiService(prisma as never, provider);

    const proposal = await service.generate('exp1', '生成');

    expect(proposal.needsReview).toBe(false);
    expect(provider.calls).toHaveLength(2);
    // 第二轮的 prompt 带着第一轮的问题列表
    expect(provider.calls[1]!.userPrompt).toContain('VARIABLE_REF_UNDEFINED');
  });

  it('2 轮修复仍失败：needsReview=true 并附完整问题列表', async () => {
    const provider = new ScriptedProvider([brokenTemplate()]);
    const service = new AiService(prisma as never, provider);

    const proposal = await service.generate('exp1', '生成');

    expect(proposal.needsReview).toBe(true);
    expect(provider.calls).toHaveLength(3);
    expect(proposal.issues.some((i) => i.code === 'VARIABLE_REF_UNDEFINED')).toBe(true);
  });

  it('实验不存在：404', async () => {
    prisma.experiment.findUnique.mockResolvedValue(null);
    const service404 = new AiService(prisma as never, new ScriptedProvider([]));
    await expect(service404.generate('missing', 'x')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('输出截断（AiOutputParseError）：进入修复轮次后成功', async () => {
    const provider = new FlakyParseProvider(1, [templateDefinition()]);
    const service = new AiService(prisma as never, provider);

    const proposal = await service.generate('exp1', '生成');

    expect(proposal.needsReview).toBe(false);
    expect(provider.calls).toHaveLength(2);
    // 第二轮的 prompt 带着截断问题说明
    expect(provider.calls[1]!.userPrompt).toContain('SCHEMA_INVALID');
  });

  it('输出持续无法解析：抛出 502 而非返回空提案', async () => {
    const provider = new FlakyParseProvider(3, [templateDefinition()]);
    const service = new AiService(prisma as never, provider);

    await expect(service.generate('exp1', '生成')).rejects.toBeInstanceOf(BadGatewayException);
    expect(provider.calls).toHaveLength(3);
  });

  it('change：返回服务端生成的变更摘要（不信 AI 自述）', async () => {
    const before = templateDefinition();
    const after = templateDefinition();
    after.nodes.push({
      id: 'ask-1',
      type: 'QUESTION',
      label: '新提问',
      config: { prompt: '为什么？' },
    });
    after.transitions.push({ id: 't-q', from: 'observe', to: 'ask-1' });
    after.transitions.push({ id: 't-q2', from: 'ask-1', to: 'end-normal' });

    const provider = new ScriptedProvider([after]);
    const service = new AiService(prisma as never, provider);

    const proposal = await service.change('exp1', '增加一个提问节点');

    expect(proposal.needsReview).toBe(false);
    expect(proposal.summary).toBeDefined();
    expect(proposal.summary!.some((line) => line.includes('新增节点 ask-1'))).toBe(true);
    expect(proposal.summary!.some((line) => line.includes('新增连线'))).toBe(true);
    // context 里带着当前草稿与指令（Mock 等本地 Provider 直接消费）
    expect(provider.calls[0]!.context?.currentDefinition).toEqual(before);
    expect(provider.calls[0]!.context?.instruction).toBe('增加一个提问节点');
  });
});
