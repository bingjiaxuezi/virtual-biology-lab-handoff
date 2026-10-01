import type { ComponentType } from 'react';
import { ActionNodeView } from './ActionNodeView';
import { ConditionNodeView } from './ConditionNodeView';
import { EndNodeView } from './EndNodeView';
import { MediaNodeView } from './MediaNodeView';
import { ObservationNodeView } from './ObservationNodeView';
import { QuestionNodeView } from './QuestionNodeView';
import { StartNodeView } from './StartNodeView';
import { UnknownNodeView } from './UnknownNodeView';
import { VariableInputNodeView } from './VariableInputNodeView';
import type { NodeRendererProps } from './types';

const RENDERERS: Record<string, ComponentType<NodeRendererProps>> = {
  START: StartNodeView,
  ACTION: ActionNodeView,
  VARIABLE_INPUT: VariableInputNodeView,
  MEDIA: MediaNodeView,
  OBSERVATION: ObservationNodeView,
  QUESTION: QuestionNodeView,
  CONDITION: ConditionNodeView,
  END: EndNodeView,
};

export function getNodeRenderer(nodeType: string): ComponentType<NodeRendererProps> {
  return RENDERERS[nodeType] ?? UnknownNodeView;
}
