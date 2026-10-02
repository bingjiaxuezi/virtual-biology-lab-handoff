import type {
  ExperimentDefinition,
  ExperimentNode,
  Transition,
  VariableInputMode,
} from '@virtual-biology-lab/experiment-schema';
import { ConditionEditor } from './ConditionEditor';
import { MEDIA_TYPE_LABEL, NODE_TYPE_LABEL } from './labels';

/** 右侧属性面板：选中节点或连线时编辑其配置，写回 Definition。 */
export function Inspector({
  definition,
  assetFiles,
  selectedNode,
  selectedTransition,
  onUpdateNode,
  onUpdateTransition,
  onRemoveNode,
  onRemoveTransition,
}: {
  definition: ExperimentDefinition;
  /** assetId → 服务端是否已有实体文件（MEDIA 节点提示用） */
  assetFiles: Record<string, boolean>;
  selectedNode: ExperimentNode | null;
  selectedTransition: Transition | null;
  onUpdateNode: (node: ExperimentNode) => void;
  onUpdateTransition: (transition: Transition) => void;
  onRemoveNode: (nodeId: string) => void;
  onRemoveTransition: (transitionId: string) => void;
}) {
  if (selectedNode) {
    return (
      <NodeForm
        definition={definition}
        assetFiles={assetFiles}
        node={selectedNode}
        onUpdate={onUpdateNode}
        onRemove={onRemoveNode}
      />
    );
  }
  if (selectedTransition) {
    return (
      <TransitionForm
        definition={definition}
        transition={selectedTransition}
        onUpdate={onUpdateTransition}
        onRemove={onRemoveTransition}
      />
    );
  }
  return <p className="panel-hint">选择画布中的节点或连线进行编辑</p>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    // biome-ignore lint/a11y/noLabelWithoutControl: children 内联了对应控件
    <label className="field">
      <span>{label}</span>
      {children}
    </label>
  );
}

function NodeForm({
  definition,
  assetFiles,
  node,
  onUpdate,
  onRemove,
}: {
  definition: ExperimentDefinition;
  assetFiles: Record<string, boolean>;
  node: ExperimentNode;
  onUpdate: (node: ExperimentNode) => void;
  onRemove: (nodeId: string) => void;
}) {
  const setLabel = (label: string) => onUpdate({ ...node, ...(label ? { label } : {}) });

  return (
    <div className="inspector">
      <h3>节点 · {NODE_TYPE_LABEL[node.type] ?? node.type}</h3>
      <Field label="ID">
        <input value={node.id} disabled />
      </Field>
      <Field label="标题">
        <input value={node.label ?? ''} onChange={(e) => setLabel(e.target.value)} />
      </Field>

      {node.type === 'ACTION' && (
        <>
          <Field label="操作类型 actionKind">
            <input
              value={node.config.actionKind}
              onChange={(e) =>
                onUpdate({ ...node, config: { ...node.config, actionKind: e.target.value } })
              }
            />
          </Field>
          <Field label="描述">
            <textarea
              value={node.config.description ?? ''}
              onChange={(e) =>
                onUpdate({
                  ...node,
                  config: {
                    ...node.config,
                    ...(e.target.value ? { description: e.target.value } : {}),
                  },
                })
              }
            />
          </Field>
        </>
      )}

      {node.type === 'VARIABLE_INPUT' && (
        <>
          <Field label="绑定变量">
            <select
              value={node.config.variableId}
              onChange={(e) =>
                onUpdate({ ...node, config: { ...node.config, variableId: e.target.value } })
              }
            >
              <option value="">（选择变量）</option>
              {definition.variables.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name}（{v.id}）
                </option>
              ))}
            </select>
          </Field>
          <Field label="输入方式">
            <select
              value={node.config.inputMode}
              onChange={(e) =>
                onUpdate({
                  ...node,
                  config: { ...node.config, inputMode: e.target.value as VariableInputMode },
                })
              }
            >
              <option value="SLIDER">滑块</option>
              <option value="NUMBER_INPUT">数字输入</option>
              <option value="SELECT">下拉选择</option>
              <option value="TOGGLE">开关</option>
            </select>
          </Field>
        </>
      )}

      {node.type === 'MEDIA' && (
        <>
          <Field label="资源 assetId">
            <select
              value={node.config.assetId}
              onChange={(e) =>
                onUpdate({ ...node, config: { ...node.config, assetId: e.target.value } })
              }
            >
              <option value="">（选择资源）</option>
              {definition.assets.map((a) => (
                <option key={a.id} value={a.assetId}>
                  {a.name ?? a.assetId}（
                  {MEDIA_TYPE_LABEL[a.type as keyof typeof MEDIA_TYPE_LABEL] ?? a.type}）
                </option>
              ))}
            </select>
          </Field>
          {node.config.assetId && !assetFiles[node.config.assetId] && (
            <p className="panel-hint error">该资源尚未上传实体文件，请先在「资源」面板上传。</p>
          )}
          <Field label="媒体类型">
            <select
              value={node.config.mediaType}
              onChange={(e) =>
                onUpdate({
                  ...node,
                  config: {
                    ...node.config,
                    mediaType: e.target.value as 'VIDEO' | 'IMAGE' | 'TEXT',
                  },
                })
              }
            >
              <option value="IMAGE">图片</option>
              <option value="VIDEO">视频</option>
              <option value="TEXT">文本</option>
            </select>
          </Field>
          <Field label="说明文字">
            <textarea
              value={node.config.caption ?? ''}
              onChange={(e) =>
                onUpdate({
                  ...node,
                  config: {
                    ...node.config,
                    ...(e.target.value ? { caption: e.target.value } : {}),
                  },
                })
              }
            />
          </Field>
        </>
      )}

      {node.type === 'OBSERVATION' && (
        <>
          <Field label="提示语">
            <textarea
              value={node.config.prompt}
              onChange={(e) =>
                onUpdate({ ...node, config: { ...node.config, prompt: e.target.value } })
              }
            />
          </Field>
          <Field label="输入占位">
            <input
              value={node.config.placeholder ?? ''}
              onChange={(e) =>
                onUpdate({
                  ...node,
                  config: {
                    ...node.config,
                    ...(e.target.value ? { placeholder: e.target.value } : {}),
                  },
                })
              }
            />
          </Field>
        </>
      )}

      {node.type === 'QUESTION' && (
        <>
          <Field label="题干">
            <textarea
              value={node.config.prompt}
              onChange={(e) =>
                onUpdate({ ...node, config: { ...node.config, prompt: e.target.value } })
              }
            />
          </Field>
          <Field label="选项（每行一个，留空为开放作答）">
            <textarea
              value={(node.config.options ?? []).join('\n')}
              onChange={(e) => {
                const options = e.target.value.split('\n').filter((line) => line.trim() !== '');
                onUpdate({
                  ...node,
                  config: { ...node.config, ...(options.length > 0 ? { options } : {}) },
                });
              }}
            />
          </Field>
        </>
      )}

      {node.type === 'CONDITION' && (
        <Field label="条件表达式">
          <ConditionEditor
            condition={node.config.condition}
            variables={definition.variables}
            onChange={(condition) => onUpdate({ ...node, config: { condition } })}
          />
        </Field>
      )}

      {node.type === 'END' && (
        <Field label="结局 outcome">
          <input
            value={node.config?.outcome ?? ''}
            onChange={(e) =>
              onUpdate({
                ...node,
                config: { ...(e.target.value ? { outcome: e.target.value } : {}) },
              })
            }
          />
        </Field>
      )}

      <button type="button" className="danger" onClick={() => onRemove(node.id)}>
        删除节点（级联删除相关连线）
      </button>
    </div>
  );
}

function TransitionForm({
  definition,
  transition,
  onUpdate,
  onRemove,
}: {
  definition: ExperimentDefinition;
  transition: Transition;
  onUpdate: (transition: Transition) => void;
  onRemove: (transitionId: string) => void;
}) {
  const hasCondition = transition.condition !== undefined;

  return (
    <div className="inspector">
      <h3>
        连线 · {transition.from} → {transition.to}
      </h3>
      <Field label="优先级（数字小者优先）">
        <input
          type="number"
          value={transition.priority ?? 0}
          onChange={(e) => onUpdate({ ...transition, priority: Number(e.target.value) })}
        />
      </Field>
      <label className="field-inline">
        <input
          type="checkbox"
          checked={hasCondition}
          onChange={(e) =>
            onUpdate(
              e.target.checked
                ? {
                    ...transition,
                    condition: { variableId: '', operator: 'EQ', value: 0 },
                  }
                : (() => {
                    const { condition: _drop, ...rest } = transition;
                    return rest;
                  })(),
            )
          }
        />
        <span>带条件（不满足时不走这条边）</span>
      </label>
      {transition.condition && (
        <ConditionEditor
          condition={transition.condition}
          variables={definition.variables}
          onChange={(condition) => onUpdate({ ...transition, condition })}
        />
      )}
      <button type="button" className="danger" onClick={() => onRemove(transition.id)}>
        删除连线
      </button>
    </div>
  );
}
