import type { RunState } from '@virtual-biology-lab/experiment-events';
import type { ExperimentDefinition, ExperimentNode } from '@virtual-biology-lab/experiment-schema';
import type { TextGenerationRequest } from '../ai/provider.js';

const SYSTEM = `你是生物仿真实验平台的学生助教。规则：
1. 你只能引导学生思考，绝不能替学生作答、替学生设置变量或透露答案；
2. 用简洁友好的中文，面向中学生；
3. 不要编造实验定义中不存在的内容。`;

export interface StudentContext {
  definition: ExperimentDefinition;
  currentNode: ExperimentNode | undefined;
  state: RunState;
  recentEvents: { type: string; nodeId: string | null; payload: unknown }[];
}

const HINT_LEVEL_GUIDE: Record<string, string> = {
  LIGHT: '只给思考方向，不解释原理、不提具体操作。',
  STANDARD: '可以解释相关原理，但不要直接说出该怎么做。',
  STRONG: '可以给出较具体的操作思路，但仍不得透露问题答案。',
};

export function buildBriefingPrompt(ctx: StudentContext): TextGenerationRequest {
  const { definition } = ctx;
  const variables = definition.variables.map((v) => `${v.name}(${v.type})`).join('、') || '无';
  const steps = definition.nodes
    .filter((n) => n.type !== 'START' && n.type !== 'END')
    .map((n) => n.label ?? n.type)
    .join(' → ');
  return {
    systemPrompt: SYSTEM,
    userPrompt: `请为以下实验写一段 100 字左右的实验导读（实验目标 + 大致流程 + 鼓励学生先预测再动手）：
标题：${definition.metadata.title}
描述：${definition.metadata.description ?? '无'}
教学目标：${definition.teaching.objectives.join('；')}
可调变量：${variables}
大致流程：${steps}`,
    context: { usage: 'briefing', title: definition.metadata.title },
  };
}

export function buildHintPrompt(ctx: StudentContext): TextGenerationRequest {
  const { definition, currentNode, state } = ctx;
  const tutor = definition.aiPolicy.tutor;
  const levelGuide = HINT_LEVEL_GUIDE[tutor.hintLevel] ?? HINT_LEVEL_GUIDE.STANDARD ?? '';
  const nodeDesc = currentNode
    ? `节点 ${currentNode.id}（类型 ${currentNode.type}，标题「${currentNode.label ?? currentNode.id}」）`
    : '未知节点';
  const events = ctx.recentEvents
    .slice(-5)
    .map((e) => `${e.type}${e.nodeId ? `@${e.nodeId}` : ''}`)
    .join('，');
  return {
    systemPrompt: SYSTEM,
    userPrompt: `学生正在做实验「${definition.metadata.title}」，请求提示。
当前：${nodeDesc}
当前状态：${JSON.stringify(state.variables)}（得分 ${state.score}）
近期事件：${events || '无'}
提示深度要求（${tutor.hintLevel}）：${levelGuide}
${tutor.allowExplainTheory ? '允许解释原理。' : '不允许解释原理。'}
${tutor.allowPointOutWrongDirection ? '允许指出方向性错误。' : '不允许指出方向性错误。'}
绝对禁止透露任何问题的答案。`,
    context: {
      usage: 'hint',
      hintLevel: tutor.hintLevel,
      currentNodeId: currentNode?.id,
      variables: state.variables,
    },
  };
}

export function buildObservationAssistPrompt(
  ctx: StudentContext,
  draftText: string,
): TextGenerationRequest {
  const node = ctx.currentNode;
  const prompt = node?.type === 'OBSERVATION' ? node.config.prompt : '';
  return {
    systemPrompt: SYSTEM,
    userPrompt: `学生在观察记录节点（提示语：「${prompt}」）写下了草稿：
「${draftText}」
请给出 2-3 条完善建议（补充观察维度、描述精确性、与变量的关联），不要替学生写完整答案。`,
    context: { usage: 'observation-assist', draftText },
  };
}

export function buildReviewPrompt(
  ctx: StudentContext,
  allEvents: { type: string; nodeId: string | null }[],
): TextGenerationRequest {
  const { definition, state } = ctx;
  const keyEvents = allEvents
    .filter((e) =>
      ['VARIABLE_CHANGED', 'OBSERVATION_SUBMITTED', 'QUESTION_ANSWERED', 'RULE_APPLIED'].includes(
        e.type,
      ),
    )
    .map((e) => `${e.type}${e.nodeId ? `@${e.nodeId}` : ''}`)
    .join('，');
  return {
    systemPrompt: SYSTEM,
    userPrompt: `学生完成了实验「${definition.metadata.title}」，最终得分 ${state.score}。
最终状态：${JSON.stringify(state.variables)}
关键操作：${keyEvents || '无'}
请写一段 150 字左右的复盘：肯定做得好的地方，指出可以改进的思考方式，提出一个拓展问题。`,
    context: { usage: 'review', score: state.score, eventCount: allEvents.length },
  };
}
