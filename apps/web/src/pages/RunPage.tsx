import type { ExperimentDefinition } from '@virtual-biology-lab/experiment-schema';
import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../api/client';
import type { RunEvent, RunView, RuntimeCommand } from '../api/types';
import { AiAssistant } from '../components/AiAssistant';
import { ProgressBar } from '../components/ProgressBar';
import { RunSidePanel } from '../components/RunSidePanel';
import { collectBackpack, visitStackOf } from '../lib/run-derive';
import { getNodeRenderer } from '../nodes/registry';

const POLL_INTERVAL_MS = 3000;

export function RunPage() {
  const { runId = '' } = useParams<{ runId: string }>();
  const [run, setRun] = useState<RunView | null>(null);
  const [definition, setDefinition] = useState<ExperimentDefinition | null>(null);
  const [events, setEvents] = useState<RunEvent[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const mergeEvents = useCallback((incoming: RunEvent[]) => {
    setEvents((current) => {
      const seen = new Set(current.map((event) => event.sequence));
      const fresh = incoming.filter((event) => !seen.has(event.sequence));
      return [...current, ...fresh].sort((a, b) => a.sequence - b.sequence);
    });
  }, []);

  // 初始加载：Run 状态 + 已发布 Definition + 事件流
  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const runView = await api.getRun(runId);
        const version = await api.getVersion(runView.experimentVersionId);
        const eventList = await api.getEvents(runId);
        if (cancelled) return;
        setRun(runView);
        setDefinition(version.definition);
        setEvents(eventList);
      } catch (cause) {
        if (!cancelled) setError(cause instanceof Error ? cause.message : '加载失败');
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [runId]);

  // 轮询兜底：多标签页或异常情况下的轨迹刷新
  useEffect(() => {
    const timer = setInterval(() => {
      api
        .getEvents(runId)
        .then(mergeEvents)
        .catch(() => undefined);
    }, POLL_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [runId, mergeEvents]);

  const sendCommand = useCallback(
    async (command: RuntimeCommand): Promise<boolean> => {
      setBusy(true);
      setError(null);
      try {
        const result = await api.dispatch(runId, command);
        setRun(result.run);
        if (result.ok) {
          mergeEvents(result.events);
          return true;
        }
        setError(result.reason);
        return false;
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : '命令发送失败');
        return false;
      } finally {
        setBusy(false);
      }
    },
    [runId, mergeEvents],
  );

  if (error && !run) return <p className="error-banner">{error}</p>;
  if (!run || !definition) return <p>加载中……</p>;

  const node = definition.nodes.find((n) => n.id === run.currentNodeId);
  if (!node) return <p className="error-banner">当前节点不在实验定义中：{run.currentNodeId}</p>;

  // 访问栈深度 = 「第 N 步」；与 Runtime 一致兼容跳转（JUMPED_TO 弹栈至目标）
  const step = Math.max(1, visitStackOf(events).length);
  const backpackCount = (() => {
    const bag = collectBackpack(events, definition);
    return bag.observations.length + bag.questions.length + bag.variables.length;
  })();
  const canBack = run.status === 'RUNNING' && step > 1;
  const back = { canBack, onBack: () => void sendCommand({ type: 'BACK' }) };

  const Renderer = getNodeRenderer(node.type);

  const canJump = run.status === 'RUNNING';
  const onJump = (nodeId: string) => void sendCommand({ type: 'JUMP_TO', nodeId });

  return (
    <div className="run-layout">
      <div className="run-main">
        <ProgressBar definition={definition} events={events} currentNodeId={run.currentNodeId} />
        {error ? <p className="error-banner">{error}</p> : null}
        <Renderer
          key={run.currentNodeId}
          node={node}
          definition={definition}
          state={run.state}
          busy={busy}
          onCommand={sendCommand}
          step={step}
          back={back}
          ai={{ runId, observationAssistEnabled: definition.aiPolicy.observationAssist.enabled }}
        />
      </div>
      <div className="run-side">
        <RunSidePanel
          events={events}
          definition={definition}
          currentNodeId={run.currentNodeId}
          canJump={canJump}
          onJump={onJump}
          backpackCount={backpackCount}
        />
        <AiAssistant runId={runId} node={node} definition={definition} status={run.status} />
      </div>
    </div>
  );
}
