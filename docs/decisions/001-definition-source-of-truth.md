# ADR-001：Experiment Definition 是唯一领域真值源

## 决策

持久化实验定义使用我们自己的 Experiment Definition，不使用 React Flow JSON、XState Machine JSON 或任何 AI Provider 私有格式作为领域模型。

## 原因

- 编辑器可替换
- Runtime 可替换
- AI Provider 可替换
- 有利于版本、导入/导出、验证和未来实验生态
