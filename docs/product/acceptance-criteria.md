# Iteration 1 验收标准

## 业务闭环

最终 Iteration 1 必须演示：

### 教师

1. 登录
2. 点击 AI 创建实验
3. 输入“温度对酶活性的影响”描述
4. AI 返回符合 Capability Registry 的 Definition Draft
5. Definition 通过 Validation；失败时 AI Repair
6. 画布自动显示流程
7. 教师修改变量/步骤
8. 绑定视频/图片
9. 设置 Observation
10. 配置 AI Policy
11. 预览
12. 发布 Version

### 学生

1. 打开实验
2. 查看 AI Briefing
3. 开始 Run
4. 设置 temperature = 80℃
5. Runtime 进入高温分支
6. 展示对应媒体/实验现象
7. 学生填写观察
8. 学生请求 AI Tutor 提示
9. AI 根据当前 State/Event 给提示，但不直接替学生操作
10. 学生调整为 37℃ 并继续
11. 完成实验
12. AI 生成个性化 Review

### 教师复盘

能够查看该 Run 的关键事件轨迹，例如：

```text
RUN_STARTED
VARIABLE_CHANGED 25 → 80
TRANSITION_TAKEN high_temperature
OBSERVATION_SUBMITTED
AI_HINT_REQUESTED
AI_HINT_SHOWN
VARIABLE_CHANGED 80 → 37
RUN_COMPLETED
```

## 技术验收

- 实验页面不是按实验类型写死
- Definition 与 React Flow/XState 解耦
- AI Provider 可配置
- Storage Provider 可配置
- Definition 不存供应商 URL
- Event append-only
- Run 固定绑定 ExperimentVersion
