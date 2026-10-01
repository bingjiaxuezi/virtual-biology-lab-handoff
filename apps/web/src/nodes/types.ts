import type { ExperimentDefinition, ExperimentNode } from '@virtual-biology-lab/experiment-schema';
import type { RunStateView, RuntimeCommand } from '../api/types';

export interface NodeRendererProps {
  node: ExperimentNode;
  definition: ExperimentDefinition;
  state: RunStateView;
  busy: boolean;
  /** 提交命令；返回是否被服务端接受。 */
  onCommand: (command: RuntimeCommand) => Promise<boolean>;
}
