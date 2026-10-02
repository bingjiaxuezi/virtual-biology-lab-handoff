import { Handle, Position } from '@xyflow/react';
import type { NodeProps } from '@xyflow/react';
import type { FlowNode } from './derive';
import { nodeSubtitle } from './derive';

const TYPE_LABEL: Record<string, string> = {
  START: '开始',
  ACTION: '操作',
  VARIABLE_INPUT: '变量',
  MEDIA: '媒体',
  OBSERVATION: '观察',
  QUESTION: '提问',
  CONDITION: '条件',
  END: '结束',
};

/** Definition 节点的 React Flow 渲染：类型徽标 + 标题 + 摘要。 */
export function FlowNodeView({ data, selected }: NodeProps<FlowNode>) {
  const { node } = data;
  return (
    <div className={`flow-node flow-node-${node.type.toLowerCase()}${selected ? ' selected' : ''}`}>
      <Handle type="target" position={Position.Top} />
      <div className="flow-node-badge">{TYPE_LABEL[node.type] ?? node.type}</div>
      <div className="flow-node-label">{node.label ?? node.id}</div>
      <div className="flow-node-subtitle">{nodeSubtitle(node)}</div>
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
}
