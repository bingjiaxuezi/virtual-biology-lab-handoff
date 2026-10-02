import type { CapabilityRegistry } from '@virtual-biology-lab/capability-registry';
import type { ValidationIssue } from '@virtual-biology-lab/experiment-validator';
import type { StructuredGenerationRequest } from './provider.js';

const SYSTEM_PROMPT = `你是生物仿真实验平台的实验设计助手。你的输出会被严格的校验器检查：
1. 只能使用下方白名单中的节点类型、变量类型、操作符、效果类型与媒体类型；
2. 输出必须是且仅是一个 JSON 对象（Experiment Definition），不要输出任何其他文字；
3. 资源只引用 assetId 逻辑标识，禁止出现任何 http(s) URL。`;

const SCHEMA_HINT = `Experiment Definition 顶层字段：
schemaVersion: "0.1"（固定）, id, version: 1,
metadata: { title, description?, subject?, gradeLevel?, author?, tags? },
teaching: { objectives: string[]（至少 1 条）, durationMinutes?, prerequisites? },
variables: 变量数组（NUMBER: {id,name,type,defaultValue,min,max,unit?}; ENUM: {id,name,type,options,defaultValue}; BOOLEAN: {id,name,type,defaultValue}）,
assets: { id, assetId, type, name? } 数组,
nodes: 节点数组（每个节点 { id, type, label?, config? }，必须恰好一个 START，至少一个 END）,
transitions: { id, from, to, condition?, priority? } 数组（流程跳转只在这里表达）,
rules: { id, when: 条件, effects: 效果数组 } 数组,
assessment: { initialScore, completion: { type: "REACH_END" | "ALL_REQUIRED_NODES" }, summary: { showScore, showKeyEvents } },
aiPolicy: { briefing: { enabled }, tutor: { enabled, hintLevel: "LIGHT"|"STANDARD"|"STRONG", allowExplainTheory, allowPointOutWrongDirection, revealAnswer: false }, observationAssist: { enabled }, review: { enabled } }。`;

/** Capability Registry → 生成约束白名单（单一事实来源）。 */
function capabilityWhitelist(registry: CapabilityRegistry): string {
  const nodes = registry
    .listNodeCapabilities()
    .map((c) => `- ${c.type}: ${c.description}。生成提示：${c.aiAuthoringHint}`)
    .join('\n');
  const variables = registry
    .listVariableCapabilities()
    .map((c) => `- ${c.type}: ${c.description}`)
    .join('\n');
  const operators = registry
    .listOperatorCapabilities()
    .map((c) => `- ${c.type}（适用变量类型: ${c.compatibleVariableTypes.join('/')}）`)
    .join('\n');
  const effects = registry
    .listEffectCapabilities()
    .map((c) => `- ${c.type}: ${c.description}`)
    .join('\n');
  const media = registry
    .listMediaCapabilities()
    .map((c) => `- ${c.type}`)
    .join('\n');
  return `节点类型：\n${nodes}\n\n变量类型：\n${variables}\n\n条件操作符：\n${operators}\n\n规则效果：\n${effects}\n\n媒体类型：\n${media}`;
}

function repairSection(issues: ValidationIssue[]): string {
  if (issues.length === 0) return '';
  const list = issues.map((i) => `- [${i.code}] ${i.path}: ${i.message}`).join('\n');
  return `\n\n你上一次的输出未通过校验，请修复以下问题后重新输出完整 JSON：\n${list}`;
}

/** 生成场景：教师意图 → 完整草案。 */
export function buildGenerationPrompt(
  registry: CapabilityRegistry,
  intent: string,
  repairIssues: ValidationIssue[] = [],
): StructuredGenerationRequest {
  return {
    systemPrompt: SYSTEM_PROMPT,
    jsonSchemaHint: SCHEMA_HINT,
    userPrompt: `请根据以下教学意图生成一个完整的 Experiment Definition：\n\n${intent}\n\n能力白名单（只能使用这些类型）：\n${capabilityWhitelist(registry)}${repairSection(repairIssues)}`,
  };
}

/** 修改场景：当前草稿 + 指令 → 新 Definition。 */
export function buildChangePrompt(
  registry: CapabilityRegistry,
  current: unknown,
  instruction: string,
  repairIssues: ValidationIssue[] = [],
): StructuredGenerationRequest {
  return {
    systemPrompt: SYSTEM_PROMPT,
    jsonSchemaHint: SCHEMA_HINT,
    context: { currentDefinition: current, instruction },
    userPrompt: `这是当前的 Experiment Definition：\n${JSON.stringify(current)}\n\n请按以下指令修改，并输出修改后的完整 JSON（保持未提及的部分不变）：\n${instruction}\n\n能力白名单（只能使用这些类型）：\n${capabilityWhitelist(registry)}${repairSection(repairIssues)}`,
  };
}
