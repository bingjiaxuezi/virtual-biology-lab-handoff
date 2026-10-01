# Experiment Definition v0.1

## 目标

用一个与 UI/Runtime/AI Provider 无关的 JSON 结构描述一个教学实验。

## 顶层结构

```ts
interface ExperimentDefinition {
  schemaVersion: '0.1';
  id: string;
  version: number;
  metadata: ExperimentMetadata;
  teaching: TeachingDesign;
  variables: ExperimentVariable[];
  assets: AssetReference[];
  nodes: ExperimentNode[];
  transitions: Transition[];
  rules: Rule[];
  assessment: AssessmentConfig;
  aiPolicy: AIPolicy;
}
```

## Variables

Iteration 1：

- NUMBER
- ENUM
- BOOLEAN

NUMBER：

- defaultValue
- min
- max
- unit

ENUM：

- options
- defaultValue

BOOLEAN：

- defaultValue

自由文本 Observation 不作为实验状态变量。

## Nodes

### START

实验入口；必须唯一。

### ACTION

学生执行一个离散操作，例如“加入试剂”。

### VARIABLE_INPUT

允许学生输入/调整一个已定义变量。

配置示例：

```json
{
  "variableId": "temperature",
  "inputMode": "SLIDER"
}
```

### MEDIA

展示实验结果或过程：VIDEO / IMAGE / TEXT。

只引用 `assetId`。

### OBSERVATION

学生填写实验观察记录。

### QUESTION

结构化教学问题。

### CONDITION

用于显示/表达条件判断节点；真正流程跳转由 Transition condition 控制。

### END

实验终点；至少一个。

## Transitions

职责：决定流程“接下来去哪”。

```ts
interface Transition {
  id: string;
  from: string;
  to: string;
  condition?: Condition;
  priority?: number;
}
```

## Rules

职责：决定实验“世界状态发生什么变化”。

```ts
interface Rule {
  id: string;
  when: Condition;
  effects: RuleEffect[];
}
```

Iteration 1 Effect：

- SET
- ADD
- SUBTRACT
- SCORE

Rule 不提供 GOTO；流程变化归 Transition 管。

## Conditions

比较操作：

- EQ
- NEQ
- GT
- LT
- GTE
- LTE

所有条件必须类型安全，例如 BOOLEAN 不允许 GT。

## Assets

Definition 中只记录逻辑引用：

```json
{
  "id": "video_denatured",
  "assetId": "asset_123",
  "type": "VIDEO"
}
```

真实存储位置不进入领域模型。

## Assessment

Iteration 1 支持：

- 初始分
- Rule Effect SCORE
- 完成条件
- 基础结果汇总

不做开放式报告的 AI 最终评分。

## AI Policy

```ts
interface AIPolicy {
  briefing: { enabled: boolean };
  tutor: {
    enabled: boolean;
    hintLevel: 'LIGHT' | 'STANDARD' | 'STRONG';
    allowExplainTheory: boolean;
    allowPointOutWrongDirection: boolean;
    revealAnswer: false;
  };
  observationAssist: { enabled: boolean };
  review: { enabled: boolean };
}
```

`revealAnswer` 在 Iteration 1 默认且建议固定为 false。
