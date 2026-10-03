# teacher-studio Specification

## Purpose
为教师提供实验内容工作台：管理草稿生命周期、用 React Flow 可视化编辑 Experiment Definition、浏览器内试玩草稿、查看学生运行轨迹。React Flow 只负责编辑/展示，Definition 是唯一持久化真值源。

## Requirements

### Requirement: 实验管理
教师端 MUST 提供实验列表（标题/草稿更新时间/最新版本号/发布状态）、空白新建、删除草稿、触发发布；所有操作 MUST 携带教师 JWT。

#### Scenario: 新建空白实验
- **WHEN** 教师点击新建
- **THEN** 生成含最小合法骨架（START → END、零变量）的草稿并进入编辑器

#### Scenario: 发布入口透出校验结果
- **WHEN** 教师点击发布但草稿存在 error 级校验问题
- **THEN** 展示问题列表，不产生新版本

### Requirement: 可视化节点图编辑器
教师端 MUST 用 React Flow 把 Definition 渲染为节点图：每种节点类型有区分样式，带条件的 Transition MUST 在连线上展示条件摘要，同一节点的多条出边 SHALL 可区分；坐标 MUST NOT 写入 Definition，加载时 SHALL 自动布局；增删节点、建立/删除连线、编辑节点属性 MUST 转化为对 Definition 的修改。

#### Scenario: 编辑即改 Definition
- **WHEN** 教师在属性表单修改某 QUESTION 节点的题干
- **THEN** 内存中的 Definition 同步更新，图中节点标签随之刷新

#### Scenario: 连线即 Transition
- **WHEN** 教师从节点 A 向节点 B 建立连线
- **THEN** Definition 的 transitions 中新增一条 from=A、to=B 的记录，教师可为其设置条件表达式与优先级

#### Scenario: 坐标不落库
- **WHEN** 教师拖动节点后保存草稿
- **THEN** 保存的 Definition 中不包含任何坐标或视口字段

### Requirement: 实时校验问题面板
编辑器 MUST 在 Definition 变更后运行三层 Validator 并展示问题列表（severity/code/path/message）；点击问题 SHALL 定位到对应节点。

#### Scenario: 引用未定义变量即时提示
- **WHEN** 教师把某条件表达式改为引用不存在的变量
- **THEN** 问题面板出现 VARIABLE_REF_UNDEFINED，定位到该节点或对应元素

### Requirement: 草稿试玩
教师端 MUST 支持在浏览器内加载当前草稿 Definition 运行试玩会话：复用 experiment-runtime 包，不调用 API、不产生持久化 Run 或事件记录；试玩界面 SHALL 与学生端节点渲染保持一致的行为语义。

#### Scenario: 试玩不落库
- **WHEN** 教师在编辑器中试玩草稿并完成一次 dispatch
- **THEN** 状态在本地推进，API 无任何请求，数据库无新记录

### Requirement: 学生轨迹查看
教师端 MUST 支持按实验查看全部学生 Run 列表（学生标识/状态/得分/开始时间）及单个 Run 的完整事件流（sequence 升序）；轨迹 MUST 只读，MUST NOT 提供修改入口。

#### Scenario: 查看事件流
- **WHEN** 教师打开某学生 Run
- **THEN** 按 sequence 升序展示完整事件，包含事件类型与负载

### Requirement: AI Copilot 占位

教师端 MUST 在编辑器中提供真实可用的 AI Copilot 面板（取代占位入口）：输入教学意图生成草案，或输入修改指令生成 Change Proposal；面板 MUST 展示服务端生成的变更摘要与校验问题；教师确认后提案 MUST 仅写入编辑器草稿态（标记未保存），教师也可直接试玩提案内容；MUST NOT 提供「生成即发布」类入口，MUST NOT 再呈现「即将上线」占位。

#### Scenario: 生成并确认应用
#### Scenario: 点击占位入口
- **WHEN** 教师点击 AI Copilot 按钮
- **THEN** 打开真实的 Copilot 面板（意图输入与生成/修改模式），不再显示「即将上线」占位说明

- **WHEN** 教师在 Copilot 面板输入意图、生成草案并点击「应用到草稿」
- **THEN** 编辑器画布与面板刷新为提案内容，顶栏出现未保存标记，数据库在教师点保存前无写入

#### Scenario: 丢弃提案
- **WHEN** 教师生成提案后点击「丢弃」
- **THEN** 编辑器草稿恢复为提案前内容，无任何持久化变更

#### Scenario: 提案先试玩
- **WHEN** 教师在提案审阅时点击试玩
- **THEN** 浏览器内以提案 Definition 启动本地试玩会话，不依赖先保存

### Requirement: 界面遵循设计系统
教师端所有页面（登录、实验列表、编辑器、学生轨迹）MUST 遵循 ui-design-system 的设计令牌与组件规范；表格、表单、操作按钮、空态与加载态 MUST 使用规范定义的统一样式。

#### Scenario: 列表页空态规范
- **WHEN** 教师账号下没有任何实验
- **THEN** 实验列表页展示规范的空态提示与新建入口，而非空白表格

#### Scenario: 编辑器操作区视觉一致
- **WHEN** 教师打开编辑器
- **THEN** 工具栏、属性面板、校验面板的按钮与面板样式与列表页保持同一规范
