# DocPilot 品牌与界面改造记录

日期：2026-10-25（Asia/Shanghai）。执行者：Codex，按用户明确要求修改代码、文档并进行本地验证。该记录不代表用户个人开发或学习掌握证明。

## 改动范围

- 外部名称统一为 **DocPilot — 团队知识库助手**：浏览器标题、登录／注册、导航、Logo、favicon、欢迎页、助手名称、页脚、邀请文案、订单展示说明和API调试页标题。
- 新增文档／指引图形的SVG标志，沿用现有Vue 3、Naive UI、UnoCSS，统一青绿色、背景、留白与文字层级；兼顾窄屏与暗色主题。
- 文档库区分“上传完成”和“内容处理完成”；显示等待、处理、可检索和失败状态，提供失败重试反馈。文档标识和估算内容量默认收进列设置。
- 上传框补齐拖放提示、空间加载失败／无可用空间、共享范围、文件必选、提交中和失败反馈。可见范围按现有服务端规则表达。
- 检索框补齐初始、加载、无结果、失败重试、命中片段和查看原文；阻止空白检索及关闭弹窗后的旧请求回填。
- 修正弹窗与组件默认样式的优先级，桌面检索／上传框分别使用960px／600px上限，窄屏收缩；将实际观察到的通用英文服务错误改为中文重试提示。
- 问答页提供欢迎卡、示例问题草稿、连接状态及历史加载／错误反馈；引用页增加返回／重试入口，原文预览沿用实际文件与证据映射。
- 邀请链接改为当前部署地址，避免跳到上游站点；移除登录／注册页的推广素材和不可用的条款按钮。
- 重写README，补充[使用说明](USAGE.md)、[配置指南](CONFIGURATION.md)，同步[本地启动](../本地运行说明.md)、[部署](../scripts/DEPLOY.md)及现有重连验证说明。

## 功能与兼容边界

实际文档可见范围由上传者、公开设置、有效组织标签共同决定。没有新增物理租户隔离、自动备份、版本管理或丢失文件恢复；没有宣称团队上线、真实使用规模或性能收益。

Java包／类名、数据库／表、接口路径、配置键、Redis及浏览器缓存前缀、索引、存储位置、现有启停与发布脚本名称保留。后端业务源码仅替换充值订单的两处品牌文字，不改支付逻辑。

根目录[LICENSE](../LICENSE)及前端既有授权元数据保留；页面提供本地许可入口。改造前README全文保存于[历史归档](history/README-PaiSmart.md)，原作者资料、外链与历史报告不冒充DocPilot的新成果。简历目录未修改。

## 本地验证

本机使用已有隔离环境`/mnt/e/dev/PaiSmart`，真实后端监听8081、前端9527。服务按项目启动脚本启动；Vite在E盘文件监听未及时更新，检查实际返回源码后，仅对本次前端进程启用轮询并重启。后端以打包JAR运行，打包期间运行实例出现类加载异常，最终打包后已重启恢复服务，再继续浏览器检查。

| 检查 | 结果与范围 |
| --- | --- |
| 前端`pnpm build` | 生产构建退出0；核对产物包含最终品牌文案、两种弹窗宽度、主题样式和本地许可文件，打包JS未发现“派聪明”展示文案 |
| 后端`mvn -B -o -Dmaven.repo.local=/mnt/e/dev/PaiSmart/cache/maven -DskipTests package` | 最终品牌版本BUILD SUCCESS；203份Java源码及64份测试源码编译，跳过测试执行；随后重启本地后端 |
| `pnpm typecheck` | 返回2；仅有修改前相同的3处错误，均在`playwright-kb-column.spec.ts`：缺`@playwright/test`及两个隐式any |
| 定向ESLint | 修改的Vue／TS文件对照HEAD检查：9条剩余错误全部在修改前存在，无新增错误；新改主要页面／品牌文件检查退出0，未屏蔽规则 |
| 实际浏览器 | 登录、注册展示、菜单／标题、真实服务连接、空文档库、组织列表、上传禁用条件及检索初始状态通过；示例卡只填草稿、不自动发送 |
| 布局与恢复交互 | 桌面弹窗、390px手机问答／文档库／上传／检索、暗色工作台及无效引用返回入口已检查；模拟状态覆盖检索加载／无结果／失败／结果、原文失败重试、引用证据、组织加载失败、选文件校验和处理状态，共12项 |
| 本地链接与脚本 | 启停、构建与发布示例所指文件存在；相关shell脚本语法检查通过；README原文归档核对一致 |

真实后端返回200的路径包括登录、当前用户、对话列表／历史、当前生成状态、可访问文档列表和上传空间列表。没有通过伪造登录替代真实后端。

检查记录（仅保存检查信息及API路径／状态，不含凭据或会话令牌）：[最终检查汇总](verification/docpilot-checks.json)、[基础浏览器检查](verification/docpilot-ui-review.json)、[布局与模拟状态检查](verification/docpilot-ui-states.json)、[ESLint与HEAD对照](verification/docpilot-eslint-review.json)。两组浏览器检查均没有页面脚本异常；图标和许可文件实际返回HTTP 200。

23:31最终复核：生产构建退出0，产物包含`.n-dialog`弹窗规则及中文错误提示；基础浏览器7项、布局／资源9项、模拟状态12项检查完成，保存14张截图。本地文档链接与`git diff --check`通过，简历30个基线文件哈希不变。已有类型／ESLint问题仍按上表保留。

ESLint剩余错误：`file-preview.vue`的函数复杂度1条；`chat-message.vue`的既有转义／continue／参数个数／复杂度6条；`reference-preview-page.vue`的复杂度／void规则2条。原组件的控制台及未使用属性警告保留。本轮没有为通过检查重构整条引用解析逻辑。首次后端打包进程曾返回143且未输出编译错误，随后受控重试和最终品牌版本均成功；不将首次中断说成源码编译失败。

### 截图

真实页面：[登录](screenshots/docpilot-login.png)、[注册](screenshots/docpilot-register.png)、[知识问答](screenshots/docpilot-chat.png)、[空文档库](screenshots/docpilot-documents.png)、[上传](screenshots/docpilot-upload.png)、[检索初始态](screenshots/docpilot-search.png)。截图中的空库是实际本地状态。

浏览器模拟状态截图使用`-simulated`文件名，只用于检查展示、加载／失败反馈和重试交互，不证明真实文档入库、检索相关性或模型回答成功。

- 真实布局：[手机问答](screenshots/docpilot-chat-mobile.png)、[手机暗色问答](screenshots/docpilot-chat-mobile-dark.png)、[手机上传](screenshots/docpilot-upload-mobile.png)。
- 模拟内容：[检索结果](screenshots/docpilot-search-results-simulated.png)、[原文预览](screenshots/docpilot-preview-simulated.png)、[引用证据](screenshots/docpilot-citation-simulated.png)、[暗色引用](screenshots/docpilot-citation-dark-simulated.png)、[处理状态](screenshots/docpilot-processing-simulated.png)。模拟文档仅为“项目交接说明”等虚构文本。

## 未验证范围

- 本轮未导入真实团队资料，未调用LLM、Embedding、rerank或真实支付。未做上传→解析→向量化→真实检索→生成回答的端到端验收，也未运行全量Java测试。
- 本机`.env`中的默认LLM／Embedding密钥为空；数据库内提供方配置未独立审计。没有据此宣称真实模型可用。
- 开发页预览与生产静态构建分别检查；构建成功不证明部署代理、权限隔离全部分支、断点续传、PDF定位或模型质量通过。
- 未执行远程部署、提交、推送，未修改简历或升级学习进度。
