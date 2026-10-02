# Delta for student-runtime-ui

## ADDED Requirements

### Requirement: 统一操作栏
每种节点视图 MUST 在面板底部渲染统一操作栏：回退按钮固定最左（无历史时禁用），主按钮固定最右；交互节点的两步操作 MUST 在同一按钮原位切换（节点动词 → 「继续」），位置与尺寸不变；操作栏上方 MUST 显示「第 N 步」进度提示（N 为已进入节点数）。

#### Scenario: 按钮位置跨节点一致
- **WHEN** 学生依次经过 MEDIA、VARIABLE_INPUT、OBSERVATION 节点
- **THEN** 主按钮始终位于面板底部最右，回退按钮始终位于最左

#### Scenario: 两步操作原位切换
- **WHEN** 学生在 QUESTION 节点提交回答成功
- **THEN** 原「提交回答」按钮原位变为「继续」

### Requirement: 回退入口
操作栏 MUST 提供回退按钮，点击向 Runtime 发出 `BACK` 命令；回退成功后界面渲染目标节点；无历史或 Run 已结束时按钮禁用或展示拒绝原因。

#### Scenario: 回退重看视频
- **WHEN** 学生看完结果视频进入下一节点后点击回退
- **THEN** 回到该 MEDIA 节点并可重新播放

### Requirement: 媒体展示规格
MEDIA 节点的视频/图片 MUST 占满面板宽度，视频按 16:9 比例展示且最大高度不小于 60vh；图片 MUST 支持点击查看原图；素材缺失时仍降级为占位卡。

#### Scenario: 视频足够大
- **WHEN** 学生进入含 VIDEO 的 MEDIA 节点
- **THEN** 视频以面板全宽、16:9 比例渲染，可直接播放

## MODIFIED Requirements

### Requirement: 八种节点类型可渲染可交互
学生端 MUST 为 START、ACTION、VARIABLE_INPUT、MEDIA、OBSERVATION、QUESTION、CONDITION、END 八种节点类型提供渲染器；每种渲染器 MUST 消费节点的 config 与关联资源/变量定义，并 MUST 使用统一操作栏呈现操作。

#### Scenario: 未知节点类型的兜底
- **WHEN** Definition 中出现渲染器未覆盖的节点类型
- **THEN** 显示明确的「暂不支持」占位而非崩溃
