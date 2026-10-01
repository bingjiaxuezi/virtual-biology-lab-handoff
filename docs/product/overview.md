# 产品概览

## 产品定位

面向生物实验教学的“AI 辅助实验创作与仿真运行平台”。

核心价值不是平台方预制大量实验，而是让教师能够自己创建、修改、发布和复用实验。

## 核心用户

### 教师

- 用自然语言描述实验意图
- 让 AI 生成结构化实验草稿
- 通过可视化编辑器修改步骤、变量、规则和素材
- 配置 AI 辅助策略
- 预览、发布、查看学生运行轨迹

### 学生

- 阅读实验目标、原理和 AI Briefing
- 调整参数、选择操作、观察结果
- 填写观察记录
- 在实验中获取 AI Tutor 提示
- 实验后进行 AI Review

## 产品演进层级

```text
L0 视频课程
L1 分支互动实验
L2 状态驱动实验       ← Iteration 1 目标
L3 参数化科学仿真
L4 AI/科研模型增强
```

Iteration 1 不是科研级仿真，而是 Rule-based Simulation。

## 创作方式

三种入口最终统一为 Experiment Definition：

```text
AI 创建 ─┐
模板创建 ├→ Experiment Definition → Runtime
空白创建 ┘
```

## 教师创作原则

老师始终使用教学语言，而不是技术语言。

例如老师说：

> “让学生自己调节温度，温度超过 60℃ 时出现酶失活现象。”

系统内部映射为：

- `VARIABLE_INPUT(temperature)`
- `CONDITION(temperature > 60)`
- `SET(sampleStatus = DENATURED)`
- 对应 `MEDIA/OBSERVATION` 节点

AI 负责把自然语言翻译成受控结构，但不能越过平台能力边界。
