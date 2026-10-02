import type { ExperimentDefinition } from '@virtual-biology-lab/experiment-schema';
import type { ValidationIssue } from '@virtual-biology-lab/experiment-validator';

/** 校验问题面板：error 阻断发布，warning 提示；点击定位到画布节点。 */
export function ValidationPanel({
  definition,
  issues,
  onLocate,
}: {
  definition: ExperimentDefinition;
  issues: ValidationIssue[];
  onLocate: (nodeId: string) => void;
}) {
  const errors = issues.filter((i) => i.severity === 'error');
  const warnings = issues.filter((i) => i.severity !== 'error');

  return (
    <div className="side-panel">
      {issues.length === 0 && <p className="panel-hint ok">校验通过，无问题</p>}
      {errors.length > 0 && (
        <p className="panel-hint error">{errors.length} 个 error，发布被阻断</p>
      )}
      {[...errors, ...warnings].map((issue, index) => {
        const nodeId = extractNodeId(definition, issue);
        return (
          <button
            key={`${issue.code}-${index}`}
            type="button"
            className={`issue issue-${issue.severity}`}
            disabled={!nodeId}
            onClick={() => nodeId && onLocate(nodeId)}
          >
            <span className="issue-code">{issue.code}</span>
            <span className="issue-message">{issue.message}</span>
            <span className="issue-path">{issue.path}</span>
          </button>
        );
      })}
    </div>
  );
}

/** issue.path 形如 nodes[3].config.variableId，按下标解析出节点 id。 */
function extractNodeId(definition: ExperimentDefinition, issue: ValidationIssue): string | null {
  const match = /^nodes\[(\d+)\]/.exec(issue.path);
  if (!match) return null;
  return definition.nodes[Number(match[1])]?.id ?? null;
}
