# DocPilot 配置与开发启动

## 配置来源

- 后端：仓库根目录`.env`与`src/main/resources/application*.yml`。`DotenvEnvironmentPostProcessor`负责加载`.env`；从仓库根目录启动，避免加载其他目录的配置。
- 前端：`frontend/.env`存放共享展示设置；`.env.test`为开发默认服务地址，`.env.prod`为构建配置；私有覆盖写入被忽略的`*.local`文件。
- 当前机器：已有`/mnt/e/dev/PaiSmart`隔离工具链，详见[本地运行说明](../本地运行说明.md)。该路径为兼容已有环境保留，不随品牌更名。

首次从`.env.example`复制配置，请勿覆盖已存在的`.env`。示例中的服务地址、账号、存储路径应按实际环境填写；不要把凭据写入文档或提交到仓库。

| 设置 | 用途 |
| --- | --- |
| `SERVER_PORT` | 后端端口，声明默认8081 |
| `SPRING_PROFILES_ACTIVE` | Spring配置环境；以实际启动参数和环境为准 |
| `SPRING_DATASOURCE_*` | MySQL连接；当前隔离环境3307与普通模板3306不同 |
| `SPRING_DATA_REDIS_*` | Redis连接 |
| `SPRING_KAFKA_BOOTSTRAP_SERVERS` | Kafka连接 |
| `MINIO_*` | 对象存储连接与访问凭据 |
| `ELASTICSEARCH_*` | 检索服务连接 |
| `JWT_SECRET_KEY` | JWT签名密钥，使用足够长度的Base64随机值 |
| `ADMIN_BOOTSTRAP_*` | 首次管理员初始化，完成后关闭初始化开关 |
| `APP_AUTH_REGISTRATION_MODE` | 注册／邀请策略 |
| `DEEPSEEK_API_KEY` / `EMBEDDING_API_KEY` | 既有默认模型配置；也可在模型管理中配置受支持的提供方 |
| `KNOWLEDGE_BOOTSTRAP_ENABLED` | 是否初始化示例语料；已有本地环境关闭，避免启动时自动入库 |
| `VITE_APP_TITLE` / `VITE_APP_DESC` | 浏览器标题和页面介绍 |
| `VITE_SERVICE_BASE_URL` | HTTP API服务地址；开发默认8081，生产默认`/api/v1` |
| `VITE_STORAGE_PREFIX` | 兼容原浏览器缓存，继续保留`PaiSmart_` |

## 启动与停止

当前机器在仓库根目录使用：

```bash
bash status-local.sh
bash start-local.sh
# 使用结束后按需停止该项目服务，保留数据
bash stop-local.sh
```

通用开发环境先准备全部基础依赖、安装LiteParse并使其命令可用，然后在仓库根目录执行`mvn spring-boot:run`；另开终端进入`frontend`，执行`pnpm install --frozen-lockfile`和`pnpm dev`。后端也可从IDE运行`SmartPaiApplication`。

前端开发页为`http://localhost:9527`，构建预览默认9725。开发代理由`frontend/build/config/proxy.ts`与`VITE_HTTP_PROXY`控制。WebSocket地址另由既有服务配置生成，部署时需要同时转发HTTP与WebSocket。

## 内容处理与检索

PDF解析依赖LiteParse，其他支持格式走Tika。当前索引需要与Embedding模型的维度一致；具体维度以配置和已有索引为准，当前隔离环境声明为2048维。

`search.parent-context.*`控制命中后的相邻内容扩展；`knowledge.contextual-retrieval.*`控制可选的入库上下文说明，后者会增加模型调用。配置键及默认值以Java配置类与`application*.yml`为准，既有高级配置说明可参考[调整前README](history/README-PaiSmart.md)，不要把历史默认值当作本机已启用值。

## 构建与发布

前端执行`pnpm typecheck`、定向`pnpm exec eslint <文件>`及`pnpm build`。后端执行`mvn -q -DskipTests compile`、适用的`mvn test`和`mvn -DskipTests package`。测试如依赖数据库、搜索或模型，需要对应条件；构建产物本身不证明业务成功。

正式发布流程见[发布说明](../scripts/DEPLOY.md)。`launch.sh.example`、`deploy-front.sh`和发布器均保留原名称／存储位置；部分脚本会拉取代码、替换远程资源，使用前阅读脚本和发布计划。本轮不执行远程部署。
