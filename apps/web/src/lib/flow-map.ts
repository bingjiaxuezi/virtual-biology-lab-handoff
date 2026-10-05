import type { ExperimentDefinition } from '@virtual-biology-lab/experiment-schema';
import dagre from 'dagre';
import type { RunEvent } from '../api/types';
import { nodeLabelOf, visitedNodesOf } from './run-derive';

export type MapNodeState = 'fog' | 'visited' | 'current';

/** 地图节点数据。迷雾节点的真实标题 MUST NOT 进入此结构（防 DOM 泄露）。 */
export interface MapNodeData extends Record<string, unknown> {
  state: MapNodeState;
  nodeType: string;
  typeLabel: string;
  label: string;
}

export interface MapNode {
  id: string;
  type: 'mapNode';
  position: { x: number; y: number };
  data: MapNodeData;
  draggable: false;
  connectable: false;
}

export interface MapEdge {
  id: string;
  source: string;
  target: string;
  className: 'lit' | 'dim';
}

export interface FlowMapModel {
  nodes: MapNode[];
  edges: MapEdge[];
  /** 已探索节点数（已进入集合 ∩ Definition 节点） */
  explored: number;
  /** 节点总数 */
  total: number;
}

export const MAP_NODE_WIDTH = 148;
export const MAP_NODE_HEIGHT = 44;

export const NODE_TYPE_LABEL: Record<string, string> = {
  START: '开始',
  ACTION: '操作',
  VARIABLE_INPUT: '变量',
  MEDIA: '媒体',
  OBSERVATION: '观察',
  QUESTION: '问答',
  CONDITION: '判断',
  END: '结束',
};

export const FOG_LABEL = '???';

/**
 * Definition + 事件流 → 战争迷雾流程图模型。
 * 布局结果只存于返回值，不写回 Definition；环路由 dagre 自行处理。
 * revealAll 用于复盘页：全图去迷雾、只读。
 */
export function buildFlowMap(
  definition: ExperimentDefinition,
  events: RunEvent[],
  currentNodeId: string,
  options?: { revealAll?: boolean },
): FlowMapModel {
  const visited = options?.revealAll
    ? new Set(definition.nodes.map((n) => n.id))
    : visitedNodesOf(events);

  const g = new dagre.graphlib.Graph();
  g.setGraph({ rankdir: 'LR', nodesep: 14, ranksep: 36, marginx: 12, marginy: 12 });
  g.setDefaultEdgeLabel(() => ({}));
  for (const node of definition.nodes) {
    g.setNode(node.id, { width: MAP_NODE_WIDTH, height: MAP_NODE_HEIGHT });
  }
  for (const transition of definition.transitions) {
    if (g.hasNode(transition.from) && g.hasNode(transition.to)) {
      g.setEdge(transition.from, transition.to);
    }
  }
  dagre.layout(g);

  const nodes: MapNode[] = definition.nodes.map((node) => {
    const pos = g.node(node.id);
    const isVisited = visited.has(node.id);
    const state: MapNodeState =
      node.id === currentNodeId ? 'current' : isVisited ? 'visited' : 'fog';
    return {
      id: node.id,
      type: 'mapNode',
      position: {
        x: (pos?.x ?? 0) - MAP_NODE_WIDTH / 2,
        y: (pos?.y ?? 0) - MAP_NODE_HEIGHT / 2,
      },
      data: {
        state,
        nodeType: node.type,
        typeLabel: NODE_TYPE_LABEL[node.type] ?? node.type,
        label: state === 'fog' ? FOG_LABEL : nodeLabelOf(definition, node.id),
      },
      draggable: false,
      connectable: false,
    };
  });

  const edges: MapEdge[] = definition.transitions.map((transition) => ({
    id: transition.id,
    source: transition.from,
    target: transition.to,
    className: visited.has(transition.from) && visited.has(transition.to) ? 'lit' : 'dim',
  }));

  const explored = definition.nodes.filter((n) => visited.has(n.id)).length;
  return { nodes, edges, explored, total: definition.nodes.length };
}
