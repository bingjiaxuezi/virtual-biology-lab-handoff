# AI Provider 架构

## 目标

支持 OpenAI、DeepSeek 以及未来其他模型供应商，并允许不同 AI Usage 使用不同 Provider/Model。

## 关键抽象

```ts
export interface AIProvider {
  readonly id: string;
  capabilities(): ProviderCapabilities;
  generateStructured<T>(request: StructuredGenerationRequest<T>): Promise<T>;
  chat(request: ChatRequest): Promise<ChatResponse>;
  stream?(request: ChatRequest): AsyncIterable<ChatChunk>;
}
```

建议 Provider：

- `OpenAIProvider`
- `DeepSeekProvider`

未来可扩展：

- QwenProvider
- ClaudeProvider
- LocalModelProvider

## AI Usage 与 Provider 解耦

```text
experiment_generation
experiment_change
student_briefing
student_tutor
observation_assist
experiment_review
```

配置示意：

```yaml
ai:
  routes:
    experiment_generation:
      provider: openai
      model: configured-model
    student_tutor:
      provider: deepseek
      model: configured-model
```

## Provider Capability

```ts
export interface ProviderCapabilities {
  structuredOutput: boolean;
  streaming: boolean;
  toolCalling: boolean;
  vision: boolean;
}
```

Teacher Copilot 的 Experiment Definition 生成应优先路由到支持可靠 Structured Output 的 Provider。

## AI 生成流程

```text
Natural Language
  ↓
AI Context Builder
  ├─ Capability Registry
  ├─ Experiment Schema
  ├─ Current Definition
  └─ Teacher Intent
  ↓
AI Provider
  ↓
Definition Draft / Change Proposal
  ↓
Structural Validation
  ↓
Semantic Validation
  ↓
Capability Validation
  ↓
Invalid → Repair Loop
Valid   → Teacher Review
```

## Teacher AI 权限

可以：

- 生成草稿
- 提出 Patch/Change Proposal
- 解释修改原因
- 根据校验错误修复草稿

不能：

- 绕过 Validator
- 直接 Publish

## Student AI 权限

只读上下文：

- Definition
- State
- Events
- Current Node
- Observation
- AI Policy

不得拥有 Experiment Command API。
