import { Handle, Position, ReactFlow, ReactFlowProvider, useReactFlow } from '@xyflow/react';
import type { Node, NodeProps } from '@xyflow/react';
import { useEffect, useMemo } from 'react';
import '@xyflow/react/dist/style.css';
import type { ExperimentDefinition } from '@virtual-biology-lab/experiment-schema';
import type { RunEvent } from '../api/types';
import type { MapNodeData } from '../lib/flow-map';
import { MAP_NODE_HEIGHT, MAP_NODE_WIDTH, buildFlowMap } from '../lib/flow-map';

type MapFlowNode = Node<MapNodeData, 'mapNode'>;

/** 单个地图节点：迷雾 / 已访问 / 当前 三态。Handle 不可见，仅供连线锚定。 */
function MapNodeView({ data }: NodeProps<MapFlowNode>) {
  return (
    <div className={`map-node ${data.state}`}>
      <Handle type="target" position={Position.Left} className="map-handle" />
      <span className="map-node-type">{data.typeLabel}</span>
      <span className="map-node-label">{data.label}</span>
      <Handle type="source" position={Position.Right} className="map-handle" />
    </div>
  );
}

const nodeTypes = { mapNode: MapNodeView };

export interface FlowMapProps {
  definition: ExperimentDefinition;
  events: RunEvent[];
  currentNodeId: string;
  canJump: boolean;
  onJump: (nodeId: string) => void;
  /** 复盘页：全图去迷雾、只读 */
  revealAll?: boolean;
}

/** 内部画布：需要在 ReactFlowProvider 内使用 useReactFlow。 */
function FlowMapCanvas({
  definition,
  events,
  currentNodeId,
  canJump,
  onJump,
  revealAll,
}: FlowMapProps) {
  const { setCenter } = useReactFlow();
  const model = useMemo(
    () => buildFlowMap(definition, events, currentNodeId, { revealAll: revealAll ?? false }),
    [definition, events, currentNodeId, revealAll],
  );

  // 进入新节点后把当前节点平滑移入视野；保持可读缩放，不强缩全图
  useEffect(() => {
    const current = model.nodes.find((n) => n.id === currentNodeId);
    if (!current) return;
    void setCenter(
      current.position.x + MAP_NODE_WIDTH / 2,
      current.position.y + MAP_NODE_HEIGHT / 2,
      {
        zoom: 1,
        duration: 300,
      },
    );
  }, [currentNodeId, model.nodes, setCenter]);

  return (
    <>
      <ReactFlow
        nodes={model.nodes}
        edges={model.edges}
        nodeTypes={nodeTypes}
        nodesDraggable={false}
        nodesConnectable={false}
        edgesFocusable={false}
        deleteKeyCode={null}
        // 不启用 onlyRenderVisibleElements：保证 jsdom/零尺寸容器下节点也渲染，76 节点量级性能足够
        minZoom={0.3}
        maxZoom={1.6}
        proOptions={{ hideAttribution: true }}
        onNodeClick={(_, node) => {
          if (!canJump || revealAll) return;
          if (node.data.state === 'fog' || node.id === currentNodeId) return;
          onJump(node.id);
        }}
      />
      <span className="map-badge">{`已探索 ${model.explored}/${model.total}`}</span>
    </>
  );
}

/** 战争迷雾流程图：进度与流程记录二合一。 */
export function FlowMap(props: FlowMapProps) {
  return (
    <div className="flow-map" aria-label="实验流程图">
      <ReactFlowProvider>
        <FlowMapCanvas {...props} />
      </ReactFlowProvider>
    </div>
  );
}
