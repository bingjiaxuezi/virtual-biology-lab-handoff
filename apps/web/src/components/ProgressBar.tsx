import type { ExperimentDefinition } from '@virtual-biology-lab/experiment-schema';
import type { RunEvent } from '../api/types';
import { mainPathOf, nodeLabelOf, visitedNodesOf } from '../lib/run-derive';

export interface ProgressBarProps {
  definition: ExperimentDefinition;
  events: RunEvent[];
  currentNodeId: string;
}

/** 里程碑进度条：最长主路径为刻度，当前高亮 / 已访点亮 / 未达置灰。纯展示，不发命令。 */
export function ProgressBar({ definition, events, currentNodeId }: ProgressBarProps) {
  const path = mainPathOf(definition);
  const visited = visitedNodesOf(events);
  if (path.length === 0) return null;
  const doneCount = path.filter((id) => visited.has(id)).length;

  return (
    <div className="progress-wrap" aria-label="实验进度">
      <ol className="progress-bar">
        {path.map((nodeId, index) => {
          const state =
            nodeId === currentNodeId ? 'current' : visited.has(nodeId) ? 'done' : 'todo';
          const prevDone = index > 0 && (visited.has(path[index - 1] ?? '') || false);
          return (
            <li className="progress-step" key={nodeId}>
              {index > 0 ? (
                <span className={`progress-link ${prevDone ? 'done' : 'todo'}`} />
              ) : null}
              <span className="progress-milestone">
                <span className={`progress-dot ${state}`} title={nodeLabelOf(definition, nodeId)}>
                  {index + 1}
                </span>
                <span className="progress-label">{nodeLabelOf(definition, nodeId)}</span>
              </span>
            </li>
          );
        })}
      </ol>
      <span className="progress-count">
        {doneCount}/{path.length}
      </span>
    </div>
  );
}
