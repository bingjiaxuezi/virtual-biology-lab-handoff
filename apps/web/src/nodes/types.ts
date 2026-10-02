import type { ExperimentDefinition, ExperimentNode } from '@virtual-biology-lab/experiment-schema';
import type { RunStateView, RuntimeCommand } from '../api/types';

export interface NodeRendererProps {
  node: ExperimentNode;
  definition: ExperimentDefinition;
  state: RunStateView;
  busy: boolean;
  /** 提交命令；返回是否被服务端接受。 */
  onCommand: (command: RuntimeCommand) => Promise<boolean>;
  /** 第 N 步：当前访问栈深度（回退会减少） */
  step: number;
  /** 回退：是否可用 + 触发 BACK 命令 */
  back: { canBack: boolean; onBack: () => void };
  /** AI 辅助上下文：runId 与观察助手开关（仅 OBSERVATION 节点消费）。 */
  ai?: { runId: string; observationAssistEnabled: boolean };
}
