import type { NodeRendererProps } from './types';

export function UnknownNodeView({ node }: NodeRendererProps) {
  return (
    <section className="node-panel">
      <h2>暂不支持</h2>
      <p>当前节点类型（{node.type}）暂不支持展示，请联系教师。</p>
    </section>
  );
}
