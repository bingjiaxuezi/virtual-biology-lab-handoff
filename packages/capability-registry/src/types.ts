import type {
  ConditionOperator,
  EffectType,
  MediaType,
  NodeType,
  VariableType,
} from '@virtual-biology-lab/experiment-schema';
import type { z } from 'zod';

interface CapabilityEntryBase<TType extends string> {
  type: TType;
  version: string;
  description: string;
}

/**
 * Node Capability：AI 生成约束、编辑器节点库、Validation 与 Runtime 选择的统一入口。
 * runtimeHandler / renderer 为 Iteration 1 预留的关联位。
 */
export interface NodeCapability extends CapabilityEntryBase<NodeType> {
  configSchema: z.ZodType;
  aiAuthoringHint: string;
  runtimeHandler?: string;
  renderer?: string;
}

export interface VariableCapability extends CapabilityEntryBase<VariableType> {}
export interface OperatorCapability extends CapabilityEntryBase<ConditionOperator> {
  /** 该操作符兼容的变量类型 */
  compatibleVariableTypes: VariableType[];
}
export interface EffectCapability extends CapabilityEntryBase<EffectType> {}
export interface MediaCapability extends CapabilityEntryBase<MediaType> {}

export interface CapabilityRegistry {
  getNodeCapability(type: NodeType): NodeCapability | undefined;
  hasNodeCapability(type: string): boolean;
  listNodeCapabilities(): NodeCapability[];
  registerNodeCapability(capability: NodeCapability): void;
  getVariableCapability(type: VariableType): VariableCapability | undefined;
  hasVariableType(type: string): boolean;
  listVariableCapabilities(): VariableCapability[];
  getOperatorCapability(operator: ConditionOperator): OperatorCapability | undefined;
  hasOperator(operator: string): boolean;
  listOperatorCapabilities(): OperatorCapability[];
  getEffectCapability(type: EffectType): EffectCapability | undefined;
  hasEffect(type: string): boolean;
  listEffectCapabilities(): EffectCapability[];
  getMediaCapability(type: MediaType): MediaCapability | undefined;
  hasMediaType(type: string): boolean;
  listMediaCapabilities(): MediaCapability[];
}
