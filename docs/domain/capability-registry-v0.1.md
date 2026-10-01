# Capability Registry v0.1

## 目标

定义“当前版本的平台到底支持什么”，并同时服务于：

- AI 生成约束
- Teacher Studio 节点库
- Definition Validation
- Runtime Renderer/Handler 选择

## 初始能力

### Variable Types

- NUMBER
- ENUM
- BOOLEAN

### Node Types

- START
- ACTION
- VARIABLE_INPUT
- MEDIA
- OBSERVATION
- QUESTION
- CONDITION
- END

### Operators

- EQ
- NEQ
- GT
- LT
- GTE
- LTE

### Effects

- SET
- ADD
- SUBTRACT
- SCORE

### Media Types

- VIDEO
- IMAGE
- TEXT

## Registry Entry 建议结构

```ts
interface NodeCapability {
  type: NodeType;
  version: string;
  description: string;
  configSchema: unknown;
  runtimeHandler: string;
  renderer: string;
  aiAuthoringHint: string;
}
```

## AI 使用方式

老师说：

> “让学生自己调温度。”

AI 根据 Registry 中 `VARIABLE_INPUT` 的说明选择该能力。

老师要求当前不支持的能力时，例如“实时电子显微镜 3D 仿真”，AI 不应虚构 Node Type，而应：

1. 识别 capability gap；
2. 告知当前不支持；
3. 尽可能使用现有能力降级实现，例如图片/视频 + Variable + Observation；
4. 生成的 Definition 仍必须只包含 Registry 已支持类型。

## Registry 与代码关系

不要只写一个字符串数组。最终 Registry 应成为节点能力插件入口，可关联：

- config schema
- editor metadata
- runtime handler
- renderer
- validator
- AI authoring hint
