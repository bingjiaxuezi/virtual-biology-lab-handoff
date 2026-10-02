import { InMemoryEventLog } from '@virtual-biology-lab/experiment-events';
import type { ExperimentEvent } from '@virtual-biology-lab/experiment-events';
import { createExperimentRuntime } from '@virtual-biology-lab/experiment-runtime';
import type {
  DispatchResult,
  ExperimentRuntime,
  RunView,
  RuntimeCommand,
} from '@virtual-biology-lab/experiment-runtime';

/**
 * 教师试玩会话：完全在浏览器内存中运行，不经 API、不落库。
 * 与学生端使用同一份 experiment-runtime，保证行为语义一致。
 */
export class PreviewSession {
  private constructor(
    private readonly runtime: ExperimentRuntime,
    private readonly eventLog: InMemoryEventLog,
    private readonly runId: string,
  ) {}

  /** 加载草稿 Definition 并立即开始运行；Definition 非法时抛错。 */
  static async start(definition: unknown): Promise<PreviewSession> {
    const eventLog = new InMemoryEventLog();
    const runtime = createExperimentRuntime({ eventLog });
    const started = runtime.startRun({
      definition,
      experimentVersionId: 'preview',
      studentId: 'teacher-preview',
    });
    if (!started.ok) {
      const summary = started.issues.map((i) => `${i.code}: ${i.message}`).join('；');
      throw new Error(`试玩启动失败：${summary}`);
    }
    const session = new PreviewSession(runtime, eventLog, started.run.runId);
    await runtime.start(session.runId);
    return session;
  }

  getRun(): RunView {
    const run = this.runtime.getRun(this.runId);
    if (!run) throw new Error('试玩会话已失效');
    return run;
  }

  async dispatch(command: RuntimeCommand): Promise<DispatchResult> {
    return this.runtime.dispatch(this.runId, command);
  }

  async events(): Promise<ExperimentEvent[]> {
    return this.eventLog.getByRun(this.runId);
  }
}
