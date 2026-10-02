import type {
  Condition,
  ExperimentDefinition,
  ExperimentNode,
  Transition,
} from '@virtual-biology-lab/experiment-schema';
import type { Edge, Node } from '@xyflow/react';
import dagre from 'dagre';

export interface FlowNodeData extends Record<string, unknown> {
  node: ExperimentNode;
}

export interface FlowEdgeData extends Record<string, unknown> {
  transition: Transition;
}

export type FlowNode = Node<FlowNodeData, 'experimentNode'>;
export type FlowEdge = Edge<FlowEdgeData>;

const NODE_WIDTH = 180;
const NODE_HEIGHT = 56;

/** 条件表达式的人类可读摘要，用于连线标签。 */
export function conditionSummary(condition: Condition | undefined): string {
  if (!condition) return '';
  return `${condition.variableId} ${condition.operator} ${JSON.stringify(condition.value)}`;
}

/** 节点的展示副标题（按类型取关键配置）。 */
export function nodeSubtitle(node: ExperimentNode): string {
  switch (node.type) {
    case 'START':
      return '入口';
    case 'ACTION':
      return node.config.actionKind;
    case 'VARIABLE_INPUT':
      return `变量 ${node.config.variableId}`;
    case 'MEDIA':
      return `${node.config.mediaType} · ${node.config.assetId}`;
    case 'OBSERVATION':
      return node.config.prompt;
    case 'QUESTION':
      return node.config.prompt;
    case 'CONDITION':
      return conditionSummary(node.config.condition);
    case 'END':
      return node.config?.outcome ?? '结束';
  }
}

/**
 * Definition → React Flow 投影。坐标只存在于返回值中，绝不写回 Definition；
 * 每次打开/结构变化时用 dagre 做一次自动布局。
 */
export function definitionToFlow(definition: ExperimentDefinition): {
  nodes: FlowNode[];
  edges: FlowEdge[];
} {
  const g = new dagre.graphlib.Graph();
  g.setGraph({ rankdir: 'TB', nodesep: 40, ranksep: 80 });
  g.setDefaultEdgeLabel(() => ({}));

  for (const node of definition.nodes) {
    g.setNode(node.id, { width: NODE_WIDTH, height: NODE_HEIGHT });
  }
  for (const transition of definition.transitions) {
    if (g.hasNode(transition.from) && g.hasNode(transition.to)) {
      g.setEdge(transition.from, transition.to);
    }
  }
  dagre.layout(g);

  const nodes: FlowNode[] = definition.nodes.map((node) => {
    const pos = g.node(node.id);
    return {
      id: node.id,
      type: 'experimentNode' as const,
      position: {
        x: (pos?.x ?? 0) - NODE_WIDTH / 2,
        y: (pos?.y ?? 0) - NODE_HEIGHT / 2,
      },
      data: { node },
    };
  });

  const edges: FlowEdge[] = definition.transitions.map((transition) => {
    const label = conditionSummary(transition.condition);
    return {
      id: transition.id,
      source: transition.from,
      target: transition.to,
      data: { transition },
      ...(label ? { label } : {}),
    };
  });

  return { nodes, edges };
}
