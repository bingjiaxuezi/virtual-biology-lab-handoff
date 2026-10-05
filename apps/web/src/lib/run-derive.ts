import type { ExperimentDefinition } from '@virtual-biology-lab/experiment-schema';
import type { RunEvent } from '../api/types';

/** 从事件流重建访问栈（与 Runtime 语义一致）：NODE_ENTERED 压栈、STEPPED_BACK 弹栈、JUMPED_TO 弹栈至目标。 */
export function visitStackOf(events: RunEvent[]): string[] {
  const stack: string[] = [];
  for (const event of events) {
    if (event.type === 'NODE_ENTERED' && event.nodeId) {
      stack.push(event.nodeId);
    } else if (event.type === 'STEPPED_BACK') {
      stack.pop();
    } else if (event.type === 'JUMPED_TO') {
      const to = event.payload.to;
      const idx = typeof to === 'string' ? stack.lastIndexOf(to) : -1;
      if (idx >= 0) stack.length = idx + 1;
    }
  }
  return stack;
}

/** 已进入过的节点集合（含跳转目标）。 */
export function visitedNodesOf(events: RunEvent[]): Set<string> {
  const visited = new Set<string>();
  for (const event of events) {
    if (event.type === 'NODE_ENTERED' && event.nodeId) visited.add(event.nodeId);
    if (event.type === 'JUMPED_TO' && typeof event.payload.to === 'string') {
      visited.add(event.payload.to);
    }
  }
  return visited;
}

/**
 * 最长主路径（START → END）：分叉图没有线性总长，
 * 用节点数最多的路径作为里程碑刻度；环按已访问截断。
 */
export function mainPathOf(definition: ExperimentDefinition): string[] {
  const start = definition.nodes.find((n) => n.type === 'START');
  if (!start) return [];
  const memo = new Map<string, string[]>();
  const visiting = new Set<string>();

  function longest(nodeId: string): string[] {
    const cached = memo.get(nodeId);
    if (cached) return cached;
    if (visiting.has(nodeId)) return [nodeId]; // 环：止于自身
    visiting.add(nodeId);
    const nexts = definition.transitions.filter((t) => t.from === nodeId);
    let best: string[] = [];
    for (const t of nexts) {
      const candidate = longest(t.to);
      if (candidate.length > best.length) best = candidate;
    }
    visiting.delete(nodeId);
    const result = [nodeId, ...best];
    memo.set(nodeId, result);
    return result;
  }

  return longest(start.id);
}

export function nodeLabelOf(definition: ExperimentDefinition, nodeId: string): string {
  const node = definition.nodes.find((n) => n.id === nodeId);
  return node?.label ?? nodeId;
}

export function variableLabelOf(definition: ExperimentDefinition, variableId: string): string {
  const variable = definition.variables.find((v) => v.id === variableId);
  return variable ? `${variable.name}（${variableId}）` : variableId;
}

/** 事件的可读摘要（轨迹与背包共用）。 */
export function summarizeEvent(event: RunEvent, definition: ExperimentDefinition): string | null {
  const p = event.payload;
  const nodeLabel = event.nodeId ? nodeLabelOf(definition, event.nodeId) : null;
  switch (event.type) {
    case 'RUN_STARTED':
      return '开始实验';
    case 'NODE_ENTERED':
      return nodeLabel ? `进入「${nodeLabel}」` : '进入节点';
    case 'STEPPED_BACK':
      return typeof p.to === 'string' ? `回退到「${nodeLabelOf(definition, p.to)}」` : '回退';
    case 'JUMPED_TO':
      return typeof p.to === 'string' ? `跳转到「${nodeLabelOf(definition, p.to)}」` : '跳转';
    case 'ACTION_PERFORMED':
      return nodeLabel ? `完成操作「${nodeLabel}」` : '执行操作';
    case 'VARIABLE_CHANGED': {
      if (typeof p.variableId !== 'string') return '变量变化';
      const label = variableLabelOf(definition, p.variableId);
      return `${label} → ${String(p.to)}`;
    }
    case 'QUESTION_ANSWERED':
      return nodeLabel
        ? `回答「${nodeLabel}」：${String(p.answer ?? '')}`
        : `回答：${String(p.answer ?? '')}`;
    case 'OBSERVATION_SUBMITTED':
      return nodeLabel ? `提交观察「${nodeLabel}」` : '提交观察记录';
    case 'RULE_APPLIED': {
      const effects = Array.isArray(p.effects) ? p.effects : [];
      const score = effects.find(
        (e) => typeof e === 'object' && e !== null && (e as { type?: unknown }).type === 'SCORE',
      ) as { value?: unknown } | undefined;
      return typeof score?.value === 'number'
        ? `得分 ${score.value >= 0 ? '+' : ''}${score.value}`
        : '规则生效';
    }
    case 'TRANSITION_TAKEN':
      return null; // 噪音事件，轨迹不展示
    case 'AI_BRIEFING_VIEWED':
      return '查看 AI 导读';
    case 'AI_HINT_REQUESTED':
      return '请求 AI 提示';
    case 'AI_HINT_SHOWN':
      return 'AI 给出提示';
    case 'AI_OBSERVATION_ASSISTED':
      return 'AI 观察辅助';
    case 'AI_REVIEW_GENERATED':
      return '生成 AI 复盘';
    case 'RUN_COMPLETED':
      return '完成实验';
    default:
      return event.type;
  }
}

/** 背包条目。 */
export interface BackpackItem {
  eventId: string;
  kind: 'observation' | 'question' | 'variable';
  title: string;
  detail: string;
  timestamp: string;
}

export interface BackpackContent {
  observations: BackpackItem[];
  questions: BackpackItem[];
  variables: BackpackItem[];
}

/** 从事件流聚合背包内容（纯前端派生，无后端写接口）。 */
export function collectBackpack(
  events: RunEvent[],
  definition: ExperimentDefinition,
): BackpackContent {
  const observations: BackpackItem[] = [];
  const questions: BackpackItem[] = [];
  const variables: BackpackItem[] = [];
  for (const event of events) {
    const nodeLabel = event.nodeId ? nodeLabelOf(definition, event.nodeId) : '';
    if (event.type === 'OBSERVATION_SUBMITTED') {
      observations.push({
        eventId: event.eventId,
        kind: 'observation',
        title: nodeLabel,
        detail: String(event.payload.text ?? ''),
        timestamp: event.timestamp,
      });
    } else if (event.type === 'QUESTION_ANSWERED') {
      questions.push({
        eventId: event.eventId,
        kind: 'question',
        title: nodeLabel,
        detail: `我的回答：${String(event.payload.answer ?? '')}`,
        timestamp: event.timestamp,
      });
    } else if (event.type === 'VARIABLE_CHANGED' && typeof event.payload.variableId === 'string') {
      variables.push({
        eventId: event.eventId,
        kind: 'variable',
        title: variableLabelOf(definition, event.payload.variableId),
        detail: `${String(event.payload.from ?? '（未设置）')} → ${String(event.payload.to)}`,
        timestamp: event.timestamp,
      });
    }
  }
  return { observations, questions, variables };
}
