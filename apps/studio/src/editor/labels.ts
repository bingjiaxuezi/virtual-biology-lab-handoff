import type {
  ConditionOperator,
  NodeType,
  RuleEffect,
} from '@virtual-biology-lab/experiment-schema';

/**
 * 编辑器中文标签字典：底层值保持英文枚举（Definition 契约不变），
 * 仅在 UI 展示层映射为中文。
 */
export const OPERATOR_LABEL: Record<ConditionOperator, string> = {
  EQ: '等于',
  NEQ: '不等于',
  GT: '大于',
  GTE: '大于等于',
  LT: '小于',
  LTE: '小于等于',
};

export const EFFECT_LABEL: Record<RuleEffect['type'], string> = {
  SET: '设为',
  ADD: '增加',
  SUBTRACT: '减少',
  SCORE: '加分',
};

export const NODE_TYPE_LABEL: Record<NodeType, string> = {
  START: '开始',
  ACTION: '操作',
  VARIABLE_INPUT: '变量输入',
  MEDIA: '媒体',
  OBSERVATION: '观察记录',
  QUESTION: '提问',
  CONDITION: '条件判断',
  END: '结束',
};

export const BOOLEAN_LABEL: Record<'true' | 'false', string> = {
  true: '是',
  false: '否',
};

export const MEDIA_TYPE_LABEL: Record<'VIDEO' | 'IMAGE' | 'TEXT', string> = {
  VIDEO: '视频',
  IMAGE: '图片',
  TEXT: '文本',
};
