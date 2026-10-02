import type { EndNode } from '@virtual-biology-lab/experiment-schema';
import { Link, useParams } from 'react-router-dom';
import { NodeActionBar } from '../components/NodeActionBar';
import type { NodeRendererProps } from './types';

export function EndNodeView({ node, state, busy, step, back }: NodeRendererProps) {
  const typed = node as EndNode;
  const { runId } = useParams<{ runId: string }>();

  return (
    <section className="node-panel">
      <h2>实验完成</h2>
      {typed.config?.outcome ? <p className="outcome">结果：{typed.config.outcome}</p> : null}
      <p className="score">得分：{state.score}</p>
      <NodeActionBar step={step} busy={busy} canBack={back.canBack} onBack={back.onBack}>
        <Link className="primary link-button" to={`/runs/${runId}/review`}>
          查看实验复盘
        </Link>
        <Link className="link-button" to="/">
          返回实验目录
        </Link>
      </NodeActionBar>
    </section>
  );
}
