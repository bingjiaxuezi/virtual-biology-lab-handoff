import type {
  ExperimentDefinition,
  ExperimentNode,
  ExperimentVariable,
  Rule,
} from '@virtual-biology-lab/experiment-schema';

/**
 * Change Proposal 的变更摘要：服务端对比新旧 Definition 生成，
 * 不信任 AI 自述的变更说明。
 */
export function summarizeChange(
  before: ExperimentDefinition,
  after: ExperimentDefinition,
): string[] {
  const summary: string[] = [];

  if (before.metadata.title !== after.metadata.title) {
    summary.push(`标题：「${before.metadata.title}」→「${after.metadata.title}」`);
  }

  diffById(before.nodes, after.nodes, summary, {
    added: (n: ExperimentNode) => `新增节点 ${n.id}（${n.type}）`,
    removed: (n: ExperimentNode) => `删除节点 ${n.id}（${n.type}）`,
    changed: (n: ExperimentNode) => `修改节点 ${n.id}（${n.type}）`,
  });

  diffById(before.variables, after.variables, summary, {
    added: (v: ExperimentVariable) => `新增变量 ${v.id}（${v.type}）`,
    removed: (v: ExperimentVariable) => `删除变量 ${v.id}（${v.type}）`,
    changed: (v: ExperimentVariable) => `修改变量 ${v.id}（${v.type}）`,
  });

  diffById(before.rules, after.rules, summary, {
    added: (r: Rule) => `新增规则 ${r.id}`,
    removed: (r: Rule) => `删除规则 ${r.id}`,
    changed: (r: Rule) => `修改规则 ${r.id}`,
  });

  const beforeT = new Set(before.transitions.map((t) => `${t.from}->${t.to}`));
  const afterT = new Set(after.transitions.map((t) => `${t.from}->${t.to}`));
  const addedT = [...afterT].filter((t) => !beforeT.has(t));
  const removedT = [...beforeT].filter((t) => !afterT.has(t));
  if (addedT.length > 0) summary.push(`新增连线 ${addedT.length} 条（${addedT.join('，')}）`);
  if (removedT.length > 0) summary.push(`删除连线 ${removedT.length} 条（${removedT.join('，')}）`);

  if (before.assets.length !== after.assets.length) {
    summary.push(`资源引用：${before.assets.length} → ${after.assets.length} 条`);
  }

  if (summary.length === 0) summary.push('内容无实质变化');
  return summary;
}

function diffById<T extends { id: string }>(
  before: T[],
  after: T[],
  out: string[],
  labels: {
    added: (item: T) => string;
    removed: (item: T) => string;
    changed: (item: T) => string;
  },
) {
  const beforeMap = new Map(before.map((item) => [item.id, item]));
  const afterMap = new Map(after.map((item) => [item.id, item]));

  for (const [id, item] of afterMap) {
    const old = beforeMap.get(id);
    if (!old) out.push(labels.added(item));
    else if (JSON.stringify(old) !== JSON.stringify(item)) out.push(labels.changed(item));
  }
  for (const [id, item] of beforeMap) {
    if (!afterMap.has(id)) out.push(labels.removed(item));
  }
}
