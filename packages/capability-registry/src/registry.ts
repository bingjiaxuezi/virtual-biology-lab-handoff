import {
  actionNodeSchema,
  conditionNodeSchema,
  endNodeSchema,
  mediaNodeSchema,
  observationNodeSchema,
  questionNodeSchema,
  startNodeSchema,
  variableInputNodeSchema,
} from '@virtual-biology-lab/experiment-schema';
import type {
  CapabilityRegistry,
  EffectCapability,
  MediaCapability,
  NodeCapability,
  OperatorCapability,
  VariableCapability,
} from './types.js';

const REGISTRY_VERSION = '0.1.0';

function defaultNodeCapabilities(): NodeCapability[] {
  return [
    {
      type: 'START',
      version: REGISTRY_VERSION,
      description: '实验入口节点，每个实验必须恰好一个。',
      configSchema: startNodeSchema,
      aiAuthoringHint: '每个实验必须且只能有一个 START，作为流程起点，不携带配置。',
    },
    {
      type: 'ACTION',
      version: REGISTRY_VERSION,
      description: '学生执行一个离散操作，例如“加入试剂”。',
      configSchema: actionNodeSchema.shape.config,
      aiAuthoringHint:
        '用于需要学生主动操作的步骤；config 必填 actionKind（描述操作语义，如 "加热试管"），description 可选。',
    },
    {
      type: 'VARIABLE_INPUT',
      version: REGISTRY_VERSION,
      description: '允许学生输入/调整一个已定义变量。',
      configSchema: variableInputNodeSchema.shape.config,
      aiAuthoringHint:
        '当老师说“让学生自己调某个量”时使用；config 必填 variableId（必须引用 variables 中已定义的变量）与 inputMode（按变量类型选择 SLIDER/NUMBER_INPUT/SELECT/TOGGLE）。',
    },
    {
      type: 'MEDIA',
      version: REGISTRY_VERSION,
      description: '展示实验结果或过程：VIDEO / IMAGE / TEXT。',
      configSchema: mediaNodeSchema.shape.config,
      aiAuthoringHint:
        '用于呈现实验现象或结果；config 必填 assetId（必须引用 assets 中已声明的资源，禁止直接写 URL）与 mediaType（VIDEO/IMAGE/TEXT），caption 可选。',
    },
    {
      type: 'OBSERVATION',
      version: REGISTRY_VERSION,
      description: '学生填写实验观察记录。',
      configSchema: observationNodeSchema.shape.config,
      aiAuthoringHint:
        '用于要求学生记录观察到的现象；config 必填 prompt（引导学生观察什么的问题），placeholder 可选。观察文本是数据不是状态变量。',
    },
    {
      type: 'QUESTION',
      version: REGISTRY_VERSION,
      description: '结构化教学问题。',
      configSchema: questionNodeSchema.shape.config,
      aiAuthoringHint:
        '用于插入思考题；config 必填 prompt（问题正文）；可提供 options 作为选项，无 options 时为开放问答。',
    },
    {
      type: 'CONDITION',
      version: REGISTRY_VERSION,
      description: '显示/表达条件判断；真正流程跳转由 Transition condition 控制。',
      configSchema: conditionNodeSchema.shape.config,
      aiAuthoringHint:
        '仅用于在画布上显式呈现分支语义；config 必填 condition（{ variableId, operator, value }）。实际跳转条件写在 Transition 上，不要依赖本节点控制流程。',
    },
    {
      type: 'END',
      version: REGISTRY_VERSION,
      description: '实验终点，至少一个；可用 outcome 区分不同结局。',
      configSchema: endNodeSchema,
      aiAuthoringHint: '每条实验路径都必须到达 END；不同结果用多个 END + outcome 表达。',
    },
  ];
}

function defaultVariableCapabilities(): VariableCapability[] {
  return [
    {
      type: 'NUMBER',
      version: REGISTRY_VERSION,
      description: '数值变量，含 defaultValue/min/max/unit。',
    },
    {
      type: 'ENUM',
      version: REGISTRY_VERSION,
      description: '枚举变量，含 options/defaultValue。',
    },
    {
      type: 'BOOLEAN',
      version: REGISTRY_VERSION,
      description: '布尔变量，含 defaultValue。',
    },
  ];
}

function defaultOperatorCapabilities(): OperatorCapability[] {
  const comparable: OperatorCapability['compatibleVariableTypes'] = ['NUMBER'];
  const equality: OperatorCapability['compatibleVariableTypes'] = ['NUMBER', 'ENUM', 'BOOLEAN'];
  return [
    {
      type: 'EQ',
      version: REGISTRY_VERSION,
      description: '等于。',
      compatibleVariableTypes: equality,
    },
    {
      type: 'NEQ',
      version: REGISTRY_VERSION,
      description: '不等于。',
      compatibleVariableTypes: equality,
    },
    {
      type: 'GT',
      version: REGISTRY_VERSION,
      description: '大于。',
      compatibleVariableTypes: comparable,
    },
    {
      type: 'LT',
      version: REGISTRY_VERSION,
      description: '小于。',
      compatibleVariableTypes: comparable,
    },
    {
      type: 'GTE',
      version: REGISTRY_VERSION,
      description: '大于等于。',
      compatibleVariableTypes: comparable,
    },
    {
      type: 'LTE',
      version: REGISTRY_VERSION,
      description: '小于等于。',
      compatibleVariableTypes: comparable,
    },
  ];
}

function defaultEffectCapabilities(): EffectCapability[] {
  return [
    {
      type: 'SET',
      version: REGISTRY_VERSION,
      description: '将变量设为指定值，值类型须与变量类型匹配。',
    },
    { type: 'ADD', version: REGISTRY_VERSION, description: '对 NUMBER 变量加法。' },
    { type: 'SUBTRACT', version: REGISTRY_VERSION, description: '对 NUMBER 变量减法。' },
    { type: 'SCORE', version: REGISTRY_VERSION, description: '调整 Assessment 总分。' },
  ];
}

function defaultMediaCapabilities(): MediaCapability[] {
  return [
    { type: 'VIDEO', version: REGISTRY_VERSION, description: '视频资源。' },
    { type: 'IMAGE', version: REGISTRY_VERSION, description: '图片资源。' },
    { type: 'TEXT', version: REGISTRY_VERSION, description: '文本资源。' },
  ];
}

export function createCapabilityRegistry(): CapabilityRegistry {
  const nodes = new Map(defaultNodeCapabilities().map((c) => [c.type, c]));
  const variables = new Map(defaultVariableCapabilities().map((c) => [c.type, c]));
  const operators = new Map(defaultOperatorCapabilities().map((c) => [c.type, c]));
  const effects = new Map(defaultEffectCapabilities().map((c) => [c.type, c]));
  const media = new Map(defaultMediaCapabilities().map((c) => [c.type, c]));

  return {
    getNodeCapability: (type) => nodes.get(type),
    hasNodeCapability: (type) => nodes.has(type as NodeCapability['type']),
    listNodeCapabilities: () => [...nodes.values()],
    registerNodeCapability: (capability) => {
      nodes.set(capability.type, capability);
    },
    getVariableCapability: (type) => variables.get(type),
    hasVariableType: (type) => variables.has(type as VariableCapability['type']),
    listVariableCapabilities: () => [...variables.values()],
    getOperatorCapability: (operator) => operators.get(operator),
    hasOperator: (operator) => operators.has(operator as OperatorCapability['type']),
    listOperatorCapabilities: () => [...operators.values()],
    getEffectCapability: (type) => effects.get(type),
    hasEffect: (type) => effects.has(type as EffectCapability['type']),
    listEffectCapabilities: () => [...effects.values()],
    getMediaCapability: (type) => media.get(type),
    hasMediaType: (type) => media.has(type as MediaCapability['type']),
    listMediaCapabilities: () => [...media.values()],
  };
}

/** v0.1 默认注册表：Iteration 1 全部能力。 */
export const defaultRegistry: CapabilityRegistry = createCapabilityRegistry();
