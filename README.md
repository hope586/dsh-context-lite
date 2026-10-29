# Context Lite for DeepSeek Harness

[English](README.en.md) · MIT · Unofficial community plugin

一个只读的上下文侧栏：用**时间线**与**来源**回答“模型这一轮带了什么、来自哪里、历史以原文还是摘要保留”。默认只呈现组成色带、来源、本轮新增和当前上下文大小。悬停查看含义，点击追溯正文、工具结果与压缩来源。

**v0.3.0** 增加面向开发者的上下文审计薄层：复用 DSH 原生日志，提供结构化快照、差异和 JSON／JSONL 导出，用于排查插件注入、来源归因、压缩、上下文占用与窗口限制。侧栏和原有读取接口保持兼容。

- 一轮从用户请求开始，到最终回复或实际中断结束；不中断的中途引导仍属于同一轮。
- 历史原文、历史压缩信息、用户输入、插件贡献、模型工作和最终汇报分别展示；同源、相邻、同阶段的内容可合并。
- 自动观察来源，不要求其他插件填写特殊字段或修改代码。启动时轻量补查现存注册项；无法确认的调用方明确显示“来源方未确认”。
- 复用 DSH 的会话、主题、侧栏与固定估算器。不控制注入、压缩、权限或模型执行，不额外调用模型，不提供独立统计圆环或 `/context` 技能。

界面跟随 DSH 的中文或英文设置，已打开的标签页、详情与错误提示会随语言即时更新；用户原文、插件名称、路径和标识符保持原样。精确行为与限制见 [来源说明](docs/provenance.md)，实测环境见 [兼容性](docs/compatibility.md)。

## 安装

需要已安装的 DeepSeek Harness 和 pnpm。首发通过 GitHub 分发，尚未发布到 npm。

从 [v0.3.0 Release](https://github.com/hope586/dsh-context-lite/releases/tag/v0.3.0) 下载预构建的 `dsh-context-lite-0.3.0.tgz`，对照同页 `SHA256SUMS` 校验后安装：

```sh
dsh plugin --profile web add ./dsh-context-lite-0.3.0.tgz
```

也可以安装带预构建产物的 Git tag：

```sh
dsh plugin --profile web add github:hope586/dsh-context-lite#v0.3.0
```

按你管理 Web 的原有方式重启后端，然后打开会话标题栏的“上下文”图标，或右侧栏开始页的“上下文”。不要为重载再启动第二个 Web 服务。Desktop 请通过官方插件管理页添加本地解压目录并启用；不要从 CLI 绕过 Desktop 对 profile 的管理。

源码修改后需要重新构建；后端改动还需要重载。Git tag 和安装包已包含 `lib/`，不依赖安装脚本构建。安装和作用域遵循 [DSH 官方组合包机制](https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/user/develop/basic/publish.zh.md)。

## 自动来源与数据行为

来源主名是实际插件包或脚本入口，辅助显示进入方法与原标识符。项目指令文件按 DSH 原生日志识别，不根据正文或标签猜身份。运行时采集优先，旧版可选 `source.contextLite` 仅用于历史兼容。

插件观察进入方法、注册项与事件回调，使用异步上下文区分并发调用；原消息正文、source、顺序、返回值与错误交回原路径。额外保存的是来源方、注册名、事件引用、方法、观察时间与采集进程等元数据，正文按需从宿主日志读取，不保存正文副本、附件、工具参数、凭据或完整调用栈。数据位于宿主 `storageDomain` 的 `context_lite_origins`，默认最多 64 个会话，每会话最多 2000 条最新归因及 2000 条证据观察；后续来源版本不会覆盖保留范围内的旧证据。

插件没有独立云服务、API key 或遥测。侧栏向当前 DSH 宿主发送已鉴权的读取请求；远程部署时该通信经过你的网络。插件与其他 DSH 插件同进程运行，“只读”描述实现行为，不代表安全隔离或独立安全审计。

## 开发者上下文审计

所有接口复用宿主鉴权，只注册 GET，不增加模型工具、提示词或额外服务。

| 接口 | 用途 |
|---|---|
| `/api/dsh-context-lite/v1/snapshot` | 查询当前、指定日志位置、轮次或逻辑请求的上下文，逐项保留来源和占用估算 |
| `/api/dsh-context-lite/v1/diff` | 比较首尾净变化，并列出期间的上下文更新，包括中途注入后又被移除的内容 |
| `/api/dsh-context-lite/v1/export` | 导出同一观察切片的 JSON／JSONL，附完成计数和校验值 |

每次查询都需要 `sessionId`；边界、分页、错误代码和示例见 [开发者 API 文档](docs/developer-audit.md)，结构见随包提供的 [JSON Schema](schemas/developer-audit.schema.json)。稳定标识符与界面语言无关；系统、环境和工具等聚合项保留贡献方列表，不虚构逐插件 token 分摊。

默认导出不含正文、工具参数或原始事件数据；显式 `includeContent=true` 才包含原始事件与导出时有效内容。即使不含正文，来源路径和标识符也可能是私有信息，请自行决定导出的保存与分享范围。导出默认上限 32 MiB，超限明确返回 413，不悄悄截断。仓库和发布包仅含代码、文档及合成测试，不包含真实会话或私有验收日志。

采集结果会明确列出未知来源、存储／采集失败及记录裁剪。证据采用限量保留和 100 ms 延迟写入，崩溃可能丢失未写入的尾部；缺少记录不证明未发生注入。逻辑请求按结算前日志重建，投影使用当前实现，不能当作完整的提供方请求抓包；摘要覆盖也不证明每个事实都被保留。

## 设置与卸载

通过 DSH 的插件配置编辑以下选项；没有额外控制面板。

| 设置 | 默认值 | 含义 |
|---|---:|---|
| `collectOrigins` | `true` | 自动来源采集与现存注册补查 |
| `persistOrigins` | `true` | 使用宿主存储保存来源元数据；关闭后新记录仅驻留内存 |
| `maxOriginSessions` | `64` | 元数据会话上限，1–256 |
| `maxOriginRecords` | `2000` | 每会话最新归因与证据观察各自的上限，10–10000 |
| `maxCachedSessions` | `4` | 会话重建缓存上限，1–32 |
| `maxVisibleRounds` | `120` | 每页回合上限，1–1000 |
| `detailPageSize` | `40` | 来源详情分页，1–100 |
| `previewCharacters` | `12000` | 正文分页字符数，1000–100000 |
| `maxExportBytes` | `33554432` | 开发者导出上限，1 KiB–128 MiB；超限明确报错 |

停用会释放观察包装、订阅和读取路由；既有元数据保留。卸载不会删除会话、附件或其他插件设置。Web 使用 `dsh plugin --profile web remove dsh-context-lite` 后重载；Desktop 用官方插件管理页操作。清理元数据应在所有使用该存储的 DSH 进程停止后，备份并移除自己 DSH_HOME 下对应的 `storages/context_lite_origins` 目录。

## 限制

- 启动扫描能发现仍存在的注册项，但不能凭空恢复调用方或原始注册时间；已移除的历史也不能从当前注册表恢复。快照补录与运行时观察在详情中区分。
- 系统提示词、环境快照、工具定义仍整体计量，贡献方在详情列出，不虚构每个插件的 token 分摊。分项是 DSH 固定估算，不是提供方账单。
- 逻辑请求按结算前日志重建，不是提供方适配后的完整线缆抓包；内部重试、摘要模板、外部窗口身份可能没有完整记录。
- Loader、事件监听器和 registry 的窄适配涉及内部结构，其他宿主版本、并存包装器及全部第三方插件未穷举验证；未知来源不补猜。
- 宿主存储在进程内持有快照，另一进程的新元数据需要读取端重载后可见。同进程采集和侧栏读取可直接工作。

## 开发

Node.js 22.19+（22.x）或 24+，pnpm 10.33.0：

```sh
pnpm install --frozen-lockfile --ignore-scripts
pnpm run check
pnpm test
pnpm run build
pnpm run verify:package
```

仓库包含预构建产物、合成单元测试和 lockfile。构建只读取仓库及声明依赖，不依赖相邻 Harness 源码、真实会话或模型密钥。宿主共享的 scope 实例按宿主实际入口解析，纯函数依赖随包构建。客户端使用宿主的 React、ModuleLoader 与 Slots。

贡献方式见 [CONTRIBUTING](CONTRIBUTING.md)，数据与安全问题见 [SECURITY](SECURITY.md)。原创代码采用 [MIT](LICENSE)，实际随包分发的第三方许可见 [THIRD-PARTY-NOTICES](THIRD-PARTY-NOTICES.md)。
