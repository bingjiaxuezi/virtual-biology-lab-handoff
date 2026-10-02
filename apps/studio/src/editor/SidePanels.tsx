import type {
  ExperimentDefinition,
  ExperimentVariable,
  Rule,
  RuleEffect,
} from '@virtual-biology-lab/experiment-schema';
import { ConditionEditor } from './ConditionEditor';

/** 变量 / 规则 / 资源 三个列表编辑面板。 */

export function VariablesPanel({
  definition,
  onChange,
}: {
  definition: ExperimentDefinition;
  onChange: (next: ExperimentDefinition) => void;
}) {
  const update = (variable: ExperimentVariable) =>
    onChange({
      ...definition,
      variables: definition.variables.map((v) => (v.id === variable.id ? variable : v)),
    });
  const add = (type: ExperimentVariable['type']) => {
    const id = `var-${definition.variables.length + 1}`;
    const variable: ExperimentVariable =
      type === 'NUMBER'
        ? { id, name: id, type, defaultValue: 0, min: 0, max: 100 }
        : type === 'ENUM'
          ? { id, name: id, type, options: ['选项A', '选项B'], defaultValue: '选项A' }
          : { id, name: id, type, defaultValue: false };
    onChange({ ...definition, variables: [...definition.variables, variable] });
  };

  return (
    <div className="side-panel">
      <div className="panel-actions">
        <button type="button" onClick={() => add('NUMBER')}>
          + 数值
        </button>
        <button type="button" onClick={() => add('ENUM')}>
          + 枚举
        </button>
        <button type="button" onClick={() => add('BOOLEAN')}>
          + 布尔
        </button>
      </div>
      {definition.variables.length === 0 && <p className="panel-hint">还没有变量</p>}
      {definition.variables.map((variable) => (
        <div key={variable.id} className="panel-card">
          <div className="panel-card-row">
            <input
              value={variable.id}
              onChange={(e) => {
                const newId = e.target.value;
                if (newId === variable.id || definition.variables.some((v) => v.id === newId))
                  return;
                onChange({
                  ...definition,
                  variables: definition.variables.map((v) =>
                    v.id === variable.id ? { ...v, id: newId } : v,
                  ),
                });
              }}
            />
            <input
              value={variable.name}
              placeholder="显示名"
              onChange={(e) => update({ ...variable, name: e.target.value })}
            />
            <span className="tag">{variable.type}</span>
            <button
              type="button"
              className="danger"
              onClick={() =>
                onChange({
                  ...definition,
                  variables: definition.variables.filter((v) => v.id !== variable.id),
                })
              }
            >
              删
            </button>
          </div>
          {variable.type === 'NUMBER' && (
            <div className="panel-card-row">
              <label>
                默认
                <input
                  type="number"
                  value={variable.defaultValue}
                  onChange={(e) => update({ ...variable, defaultValue: Number(e.target.value) })}
                />
              </label>
              <label>
                最小
                <input
                  type="number"
                  value={variable.min}
                  onChange={(e) => update({ ...variable, min: Number(e.target.value) })}
                />
              </label>
              <label>
                最大
                <input
                  type="number"
                  value={variable.max}
                  onChange={(e) => update({ ...variable, max: Number(e.target.value) })}
                />
              </label>
              <label>
                单位
                <input
                  value={variable.unit ?? ''}
                  onChange={(e) =>
                    update({ ...variable, ...(e.target.value ? { unit: e.target.value } : {}) })
                  }
                />
              </label>
            </div>
          )}
          {variable.type === 'ENUM' && (
            <div className="panel-card-row">
              <label>
                选项（逗号分隔）
                <input
                  value={variable.options.join(',')}
                  onChange={(e) => {
                    const options = e.target.value
                      .split(',')
                      .map((s) => s.trim())
                      .filter((s) => s !== '');
                    if (options.length === 0) return;
                    const defaultValue = options.includes(variable.defaultValue)
                      ? variable.defaultValue
                      : (options[0] ?? variable.defaultValue);
                    update({ ...variable, options, defaultValue });
                  }}
                />
              </label>
              <label>
                默认
                <select
                  value={variable.defaultValue}
                  onChange={(e) => update({ ...variable, defaultValue: e.target.value })}
                >
                  {variable.options.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          )}
          {variable.type === 'BOOLEAN' && (
            <div className="panel-card-row">
              <label>
                默认
                <select
                  value={String(variable.defaultValue)}
                  onChange={(e) => update({ ...variable, defaultValue: e.target.value === 'true' })}
                >
                  <option value="false">false</option>
                  <option value="true">true</option>
                </select>
              </label>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

export function RulesPanel({
  definition,
  onChange,
}: {
  definition: ExperimentDefinition;
  onChange: (next: ExperimentDefinition) => void;
}) {
  const update = (rule: Rule) =>
    onChange({
      ...definition,
      rules: definition.rules.map((r) => (r.id === rule.id ? rule : r)),
    });
  const add = () =>
    onChange({
      ...definition,
      rules: [
        ...definition.rules,
        {
          id: `rule-${definition.rules.length + 1}`,
          when: { variableId: '', operator: 'EQ', value: 0 },
          effects: [{ type: 'SCORE', value: 0 }],
        },
      ],
    });

  const updateEffect = (rule: Rule, index: number, effect: RuleEffect) =>
    update({ ...rule, effects: rule.effects.map((e, i) => (i === index ? effect : e)) });

  return (
    <div className="side-panel">
      <div className="panel-actions">
        <button type="button" onClick={add}>
          + 规则
        </button>
      </div>
      {definition.rules.length === 0 && <p className="panel-hint">还没有规则</p>}
      {definition.rules.map((rule) => (
        <div key={rule.id} className="panel-card">
          <div className="panel-card-row">
            <strong>{rule.id}</strong>
            <button
              type="button"
              className="danger"
              onClick={() =>
                onChange({ ...definition, rules: definition.rules.filter((r) => r.id !== rule.id) })
              }
            >
              删
            </button>
          </div>
          <div className="rule-when">当</div>
          <ConditionEditor
            condition={rule.when}
            variables={definition.variables}
            onChange={(when) => update({ ...rule, when })}
          />
          <div className="rule-when">则</div>
          {rule.effects.map((effect, index) => (
            <div key={`${rule.id}-fx-${index}`} className="panel-card-row">
              <select
                value={effect.type}
                onChange={(e) => {
                  const type = e.target.value as RuleEffect['type'];
                  const next: RuleEffect =
                    type === 'SCORE'
                      ? { type, value: 0 }
                      : { type, variableId: definition.variables[0]?.id ?? '', value: 0 };
                  updateEffect(rule, index, next);
                }}
              >
                <option value="SET">SET</option>
                <option value="ADD">ADD</option>
                <option value="SUBTRACT">SUBTRACT</option>
                <option value="SCORE">SCORE</option>
              </select>
              {effect.type !== 'SCORE' && (
                <select
                  value={effect.variableId}
                  onChange={(e) =>
                    updateEffect(rule, index, { ...effect, variableId: e.target.value })
                  }
                >
                  <option value="">（变量）</option>
                  {definition.variables.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.id}
                    </option>
                  ))}
                </select>
              )}
              <input
                type="number"
                value={Number(effect.value)}
                onChange={(e) =>
                  updateEffect(rule, index, { ...effect, value: Number(e.target.value) })
                }
              />
              <button
                type="button"
                className="danger"
                disabled={rule.effects.length <= 1}
                onClick={() =>
                  update({ ...rule, effects: rule.effects.filter((_, i) => i !== index) })
                }
              >
                删
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() =>
              update({ ...rule, effects: [...rule.effects, { type: 'SCORE', value: 0 }] })
            }
          >
            + 效果
          </button>
        </div>
      ))}
    </div>
  );
}

export function AssetsPanel({
  definition,
  onChange,
}: {
  definition: ExperimentDefinition;
  onChange: (next: ExperimentDefinition) => void;
}) {
  const add = () =>
    onChange({
      ...definition,
      assets: [
        ...definition.assets,
        { id: `asset-row-${definition.assets.length + 1}`, assetId: '', type: 'IMAGE' },
      ],
    });

  return (
    <div className="side-panel">
      <div className="panel-actions">
        <button type="button" onClick={add}>
          + 资源引用
        </button>
      </div>
      <p className="panel-hint">只登记 assetId 逻辑引用，禁止填写任何 URL。</p>
      {definition.assets.map((asset) => (
        <div key={asset.id} className="panel-card">
          <div className="panel-card-row">
            <input
              value={asset.assetId}
              placeholder="assetId"
              onChange={(e) =>
                onChange({
                  ...definition,
                  assets: definition.assets.map((a) =>
                    a.id === asset.id ? { ...a, assetId: e.target.value } : a,
                  ),
                })
              }
            />
            <select
              value={asset.type}
              onChange={(e) =>
                onChange({
                  ...definition,
                  assets: definition.assets.map((a) =>
                    a.id === asset.id
                      ? { ...a, type: e.target.value as 'VIDEO' | 'IMAGE' | 'TEXT' }
                      : a,
                  ),
                })
              }
            >
              <option value="IMAGE">图片</option>
              <option value="VIDEO">视频</option>
              <option value="TEXT">文本</option>
            </select>
            <input
              value={asset.name ?? ''}
              placeholder="名称（可选）"
              onChange={(e) =>
                onChange({
                  ...definition,
                  assets: definition.assets.map((a) =>
                    a.id === asset.id
                      ? { ...a, ...(e.target.value ? { name: e.target.value } : {}) }
                      : a,
                  ),
                })
              }
            />
            <button
              type="button"
              className="danger"
              onClick={() =>
                onChange({
                  ...definition,
                  assets: definition.assets.filter((a) => a.id !== asset.id),
                })
              }
            >
              删
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
