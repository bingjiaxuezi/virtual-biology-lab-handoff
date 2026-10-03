import { Background, Controls, ReactFlow, ReactFlowProvider, useReactFlow } from '@xyflow/react';
import type { Connection, EdgeChange, NodeChange } from '@xyflow/react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import '@xyflow/react/dist/style.css';
import { experimentDefinitionSchema, nodeTypeSchema } from '@virtual-biology-lab/experiment-schema';
import type { ExperimentDefinition, NodeType } from '@virtual-biology-lab/experiment-schema';
import { validateExperiment } from '@virtual-biology-lab/experiment-validator';
import { ApiError, api } from '../api/client';
import type { ExperimentRecord } from '../api/types';
import { CopilotPanel } from '../copilot/CopilotPanel';
import { FlowNodeView } from '../editor/FlowNode';
import { Inspector } from '../editor/Inspector';
import { AssetsPanel, RulesPanel, VariablesPanel } from '../editor/SidePanels';
import { ValidationPanel } from '../editor/ValidationPanel';
import { definitionToFlow } from '../editor/derive';
import type { FlowEdge, FlowNode } from '../editor/derive';
import {
  addNode,
  addTransition,
  removeNode,
  removeTransition,
  updateNode,
  updateTransition,
} from '../editor/edits';
import { NODE_TYPE_LABEL } from '../editor/labels';
import { PreviewModal } from '../preview/PreviewModal';

const nodeTypes = { experimentNode: FlowNodeView };
type PanelTab = 'inspector' | 'variables' | 'rules' | 'assets' | 'issues';

export function EditorPage() {
  return (
    <ReactFlowProvider>
      <EditorInner />
    </ReactFlowProvider>
  );
}

function EditorInner() {
  const { id = '' } = useParams();
  const reactFlow = useReactFlow();
  const [record, setRecord] = useState<ExperimentRecord | null>(null);
  const [definition, setDefinition] = useState<ExperimentDefinition | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [tab, setTab] = useState<PanelTab>('inspector');
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedTransitionId, setSelectedTransitionId] = useState<string | null>(null);
  const [newNodeType, setNewNodeType] = useState<NodeType>('ACTION');
  const [previewOpen, setPreviewOpen] = useState(false);
  const [copilotOpen, setCopilotOpen] = useState(false);
  const idCounter = useRef(1);
  // assetId → 服务端是否已有实体文件（驱动「未上传文件」标记）
  const [assetFiles, setAssetFiles] = useState<Record<string, boolean>>({});

  useEffect(() => {
    api
      .getExperiment(id)
      .then((experiment) => {
        setRecord(experiment);
        const parsed = experimentDefinitionSchema.safeParse(experiment.draft);
        if (parsed.success) setDefinition(parsed.data);
        else setLoadError('草稿不是合法的 Experiment Definition，无法可视化编辑');
      })
      .catch((e: unknown) => setLoadError(e instanceof Error ? e.message : String(e)));
  }, [id]);

  const refreshAssetFiles = useCallback(() => {
    api
      .listAssets()
      .then((records) => {
        setAssetFiles(Object.fromEntries(records.map((r) => [r.assetId, Boolean(r.storageKey)])));
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    refreshAssetFiles();
  }, [refreshAssetFiles]);

  const issues = useMemo(
    () => (definition ? validateExperiment(definition).issues : []),
    [definition],
  );
  const errorCount = issues.filter((i) => i.severity === 'error').length;

  // Definition → 图投影（每次变更重新派生；坐标只在前端内存中）
  const flow = useMemo(() => (definition ? definitionToFlow(definition) : null), [definition]);

  const apply = useCallback((next: ExperimentDefinition) => {
    setDefinition(next);
    setDirty(true);
    setNotice(null);
  }, []);

  const genId = useCallback(
    (prefix: string) => `${prefix}-${Date.now().toString(36)}-${idCounter.current++}`,
    [],
  );

  const onConnect = useCallback(
    (connection: Connection) => {
      if (!definition || !connection.source || !connection.target) return;
      apply(addTransition(definition, connection.source, connection.target, genId('t')));
    },
    [definition, apply, genId],
  );

  const onNodesChange = useCallback(
    (changes: NodeChange<FlowNode>[]) => {
      if (!definition) return;
      let next = definition;
      for (const change of changes) {
        if (change.type === 'remove') {
          next = removeNode(next, change.id);
          if (selectedNodeId === change.id) setSelectedNodeId(null);
        }
      }
      if (next !== definition) apply(next);
    },
    [definition, apply, selectedNodeId],
  );

  const onEdgesChange = useCallback(
    (changes: EdgeChange<FlowEdge>[]) => {
      if (!definition) return;
      let next = definition;
      for (const change of changes) {
        if (change.type === 'remove') {
          next = removeTransition(next, change.id);
          if (selectedTransitionId === change.id) setSelectedTransitionId(null);
        }
      }
      if (next !== definition) apply(next);
    },
    [definition, apply, selectedTransitionId],
  );

  const save = useCallback(async () => {
    if (!definition || !record) return;
    setSaving(true);
    try {
      await api.updateExperiment(record.id, {
        draft: definition,
        title: definition.metadata.title,
      });
      setDirty(false);
      setNotice('已保存');
    } catch (err) {
      setNotice(err instanceof Error ? `保存失败：${err.message}` : '保存失败');
    } finally {
      setSaving(false);
    }
  }, [definition, record]);

  const publish = useCallback(async () => {
    if (!record) return;
    if (dirty) await save();
    try {
      const result = await api.publishExperiment(record.id);
      setNotice(`已发布 v${result.version.version}`);
    } catch (err) {
      if (err instanceof ApiError && err.status === 422) {
        setNotice('发布被阻断：请先解决问题面板中的 error');
        setTab('issues');
      } else {
        setNotice(err instanceof Error ? `发布失败：${err.message}` : '发布失败');
      }
    }
  }, [record, dirty, save]);

  const locateNode = useCallback(
    (nodeId: string) => {
      setSelectedNodeId(nodeId);
      setSelectedTransitionId(null);
      setTab('inspector');
      void reactFlow.fitView({ nodes: [{ id: nodeId }], duration: 300, maxZoom: 1.2 });
    },
    [reactFlow],
  );

  if (loadError) {
    return (
      <div className="page">
        <p className="panel-hint error">{loadError}</p>
        <Link to="/">返回列表</Link>
      </div>
    );
  }
  if (!definition || !record || !flow) {
    return (
      <div className="page">
        <p className="panel-hint">加载中…</p>
      </div>
    );
  }

  const selectedNode = definition.nodes.find((n) => n.id === selectedNodeId) ?? null;
  const selectedTransition =
    definition.transitions.find((t) => t.id === selectedTransitionId) ?? null;

  return (
    <div className="editor-page">
      <header className="topbar">
        <Link to="/" className="back-link">
          ← 列表
        </Link>
        <input
          className="input title-input"
          value={definition.metadata.title}
          onChange={(e) =>
            apply({ ...definition, metadata: { ...definition.metadata, title: e.target.value } })
          }
        />
        {dirty && <span className="tag warn">未保存</span>}
        {notice && <span className="tag">{notice}</span>}
        <div className="topbar-actions">
          <select value={newNodeType} onChange={(e) => setNewNodeType(e.target.value as NodeType)}>
            {nodeTypeSchema.options.map((type) => (
              <option key={type} value={type}>
                {NODE_TYPE_LABEL[type]}
              </option>
            ))}
          </select>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => apply(addNode(definition, newNodeType, genId('n')))}
          >
            + 节点
          </button>
          <button
            type="button"
            className="btn btn-primary"
            disabled={saving}
            onClick={() => void save()}
          >
            {saving ? '保存中…' : '保存'}
          </button>
          <button type="button" className="btn btn-secondary" onClick={() => setPreviewOpen(true)}>
            试玩
          </button>
          <button type="button" className="btn btn-secondary" onClick={() => void publish()}>
            发布
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            title="AI Copilot"
            onClick={() => setCopilotOpen(true)}
          >
            ✨ AI
          </button>
        </div>
      </header>
      <div className="editor-body">
        <div className="editor-canvas">
          <ReactFlow
            nodes={flow.nodes}
            edges={flow.edges}
            nodeTypes={nodeTypes}
            onConnect={onConnect}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onNodeClick={(_, node) => {
              setSelectedNodeId(node.id);
              setSelectedTransitionId(null);
              setTab('inspector');
            }}
            onEdgeClick={(_, edge) => {
              setSelectedTransitionId(edge.id);
              setSelectedNodeId(null);
              setTab('inspector');
            }}
            onPaneClick={() => {
              setSelectedNodeId(null);
              setSelectedTransitionId(null);
            }}
            fitView
            deleteKeyCode={['Backspace', 'Delete']}
          >
            <Background />
            <Controls />
          </ReactFlow>
        </div>
        <aside className="editor-side">
          <div className="tabs">
            <button
              type="button"
              className={tab === 'inspector' ? 'active' : ''}
              onClick={() => setTab('inspector')}
            >
              属性
            </button>
            <button
              type="button"
              className={tab === 'variables' ? 'active' : ''}
              onClick={() => setTab('variables')}
            >
              变量({definition.variables.length})
            </button>
            <button
              type="button"
              className={tab === 'rules' ? 'active' : ''}
              onClick={() => setTab('rules')}
            >
              规则({definition.rules.length})
            </button>
            <button
              type="button"
              className={tab === 'assets' ? 'active' : ''}
              onClick={() => setTab('assets')}
            >
              资源({definition.assets.length})
            </button>
            <button
              type="button"
              className={tab === 'issues' ? 'active' : ''}
              onClick={() => setTab('issues')}
            >
              问题{errorCount > 0 ? `(${errorCount})` : ''}
            </button>
          </div>
          {tab === 'inspector' && (
            <Inspector
              definition={definition}
              assetFiles={assetFiles}
              selectedNode={selectedNode}
              selectedTransition={selectedTransition}
              onUpdateNode={(node) => apply(updateNode(definition, node.id, node))}
              onUpdateTransition={(t) => apply(updateTransition(definition, t.id, t))}
              onRemoveNode={(nodeId) => {
                apply(removeNode(definition, nodeId));
                setSelectedNodeId(null);
              }}
              onRemoveTransition={(tid) => {
                apply(removeTransition(definition, tid));
                setSelectedTransitionId(null);
              }}
            />
          )}
          {tab === 'variables' && <VariablesPanel definition={definition} onChange={apply} />}
          {tab === 'rules' && <RulesPanel definition={definition} onChange={apply} />}
          {tab === 'assets' && (
            <AssetsPanel
              definition={definition}
              onChange={apply}
              assetFiles={assetFiles}
              onAssetsChanged={refreshAssetFiles}
            />
          )}
          {tab === 'issues' && (
            <ValidationPanel definition={definition} issues={issues} onLocate={locateNode} />
          )}
        </aside>
      </div>
      {previewOpen && (
        <PreviewModal definition={definition} onClose={() => setPreviewOpen(false)} />
      )}
      {copilotOpen && (
        <CopilotPanel
          experimentId={record.id}
          onApply={(next) => {
            apply(next);
            setNotice('AI 提案已应用到草稿（未保存）');
          }}
          onClose={() => setCopilotOpen(false)}
        />
      )}
    </div>
  );
}
