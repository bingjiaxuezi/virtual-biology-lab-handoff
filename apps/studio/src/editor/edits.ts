import type {
  AssetReference,
  ExperimentDefinition,
  ExperimentNode,
  ExperimentVariable,
  NodeType,
  Rule,
  Transition,
} from '@virtual-biology-lab/experiment-schema';

/** 编辑器写回操作：全部是纯函数，输入旧 Definition，返回新 Definition。 */

export function defaultNodeFor(type: NodeType, id: string): ExperimentNode {
  switch (type) {
    case 'START':
      return { id, type, label: '开始' };
    case 'ACTION':
      return { id, type, label: '操作', config: { actionKind: 'CUSTOM_ACTION' } };
    case 'VARIABLE_INPUT':
      return { id, type, label: '变量输入', config: { variableId: '', inputMode: 'SLIDER' } };
    case 'MEDIA':
      return { id, type, label: '媒体', config: { assetId: '', mediaType: 'IMAGE' } };
    case 'OBSERVATION':
      return { id, type, label: '观察记录', config: { prompt: '记录你观察到的现象' } };
    case 'QUESTION':
      return { id, type, label: '提问', config: { prompt: '问题？' } };
    case 'CONDITION':
      return {
        id,
        type,
        label: '条件',
        config: { condition: { variableId: '', operator: 'EQ', value: 0 } },
      };
    case 'END':
      return { id, type, label: '结束', config: { outcome: '完成' } };
  }
}

export function addNode(
  def: ExperimentDefinition,
  type: NodeType,
  id: string,
): ExperimentDefinition {
  if (def.nodes.some((n) => n.id === id)) {
    throw new Error(`节点 id "${id}" 已存在`);
  }
  return { ...def, nodes: [...def.nodes, defaultNodeFor(type, id)] };
}

/** 删除节点时级联删除与其相连的 Transition。 */
export function removeNode(def: ExperimentDefinition, nodeId: string): ExperimentDefinition {
  return {
    ...def,
    nodes: def.nodes.filter((n) => n.id !== nodeId),
    transitions: def.transitions.filter((t) => t.from !== nodeId && t.to !== nodeId),
  };
}

export function updateNode(
  def: ExperimentDefinition,
  nodeId: string,
  node: ExperimentNode,
): ExperimentDefinition {
  return {
    ...def,
    nodes: def.nodes.map((n) => (n.id === nodeId ? node : n)),
  };
}

/** 建线即建 Transition；from→to 已存在时复用并返回原定义。 */
export function addTransition(
  def: ExperimentDefinition,
  from: string,
  to: string,
  id: string,
): ExperimentDefinition {
  if (def.transitions.some((t) => t.from === from && t.to === to)) return def;
  const transition: Transition = { id, from, to };
  return { ...def, transitions: [...def.transitions, transition] };
}

export function removeTransition(
  def: ExperimentDefinition,
  transitionId: string,
): ExperimentDefinition {
  return { ...def, transitions: def.transitions.filter((t) => t.id !== transitionId) };
}

export function updateTransition(
  def: ExperimentDefinition,
  transitionId: string,
  patch: Partial<Omit<Transition, 'id'>>,
): ExperimentDefinition {
  return {
    ...def,
    transitions: def.transitions.map((t) => (t.id === transitionId ? { ...t, ...patch } : t)),
  };
}

export function upsertVariable(
  def: ExperimentDefinition,
  variable: ExperimentVariable,
): ExperimentDefinition {
  const exists = def.variables.some((v) => v.id === variable.id);
  return {
    ...def,
    variables: exists
      ? def.variables.map((v) => (v.id === variable.id ? variable : v))
      : [...def.variables, variable],
  };
}

export function removeVariable(
  def: ExperimentDefinition,
  variableId: string,
): ExperimentDefinition {
  return { ...def, variables: def.variables.filter((v) => v.id !== variableId) };
}

export function upsertRule(def: ExperimentDefinition, rule: Rule): ExperimentDefinition {
  const exists = def.rules.some((r) => r.id === rule.id);
  return {
    ...def,
    rules: exists ? def.rules.map((r) => (r.id === rule.id ? rule : r)) : [...def.rules, rule],
  };
}

export function removeRule(def: ExperimentDefinition, ruleId: string): ExperimentDefinition {
  return { ...def, rules: def.rules.filter((r) => r.id !== ruleId) };
}

export function upsertAsset(
  def: ExperimentDefinition,
  asset: AssetReference,
): ExperimentDefinition {
  const exists = def.assets.some((a) => a.id === asset.id);
  return {
    ...def,
    assets: exists
      ? def.assets.map((a) => (a.id === asset.id ? asset : a))
      : [...def.assets, asset],
  };
}

export function removeAsset(def: ExperimentDefinition, assetRowId: string): ExperimentDefinition {
  return { ...def, assets: def.assets.filter((a) => a.id !== assetRowId) };
}
