# Changelog

## 0.3.0 — 2026-10-29

### 中文

- 新增面向开发者的上下文审计 v1：复用 DSH 原生日志，支持当前、日志位置、轮次和逻辑请求边界的结构化快照。
- 差异接口同时呈现首尾净变化和期间更新，包含中途注入后又被移除的内容；保留来源、原文／摘要／替换关系和上下文占用／窗口估算。
- 新增 JSON／JSONL 流式导出，默认不含正文，支持显式包含内容；附完成计数与 SHA-256，超限先返回 413。所有读取复用宿主鉴权，未新增模型工具、提示词或模型调用。
- 来源证据保留观察时间、采集进程和独立来源版本；明确未知来源、采集／存储失败及限量保留边界。默认最多 64 会话，每会话 2000 条最新归因及 2000 条证据观察。
- 随包提供 JSON Schema 和开发者 API 文档。中英文 README 同步更新；原有侧栏和读取接口保持兼容。
- 47 项自动检查通过；实际 DSH 对照覆盖逻辑输入、原生估算、压缩关系、导出与 BrowserSkill／GenUI 正常流程，读取未改动原日志。请求重建仍不是完整提供方抓包，摘要覆盖不等于事实完整保留。

### English

- Added developer context audit v1 over DSH's canonical log, with structured snapshots at current, log, round and logical-request boundaries.
- Diffs report endpoint changes and interval updates, including injections subsequently removed. Individual source identities, original/summary/replacement relationships and context/window estimates remain inspectable.
- Added streaming JSON/JSONL exports with explicit content opt-in, completion counts and SHA-256; oversize returns 413 before success. Reads reuse host authentication and add no model tools, instructions or model calls.
- Bounded source evidence retains observation times, collector runs and independent actor versions. Results report unknown ownership, collection/storage failures and retention limits. Defaults are 64 sessions, each with 2000 latest attributions and 2000 evidence observations.
- Shipped JSON Schema and developer API documentation; updated both READMEs. The sidebar and its existing API remain compatible.
- Passed 47 automated checks and live DSH comparisons covering logical input, native estimates, compression, exports and normal BrowserSkill/GenUI activation. Reads left original log bytes unchanged. Reconstruction remains distinct from complete provider wire capture; summary coverage does not establish complete semantic retention.

## 0.2.2

Complete English/Chinese UI following the host locale, including sources, audit details, compaction notes, statuses, tooltips, errors, number/time formatting and already-open tab captions. Cached details update without changing original content or stable source identities. API display labels and error keys are additive; collection and measurement behavior are unchanged.

## 0.2.1

First public release. Read-only context timeline, raw/summary history, source details, compression references and interruption markers. Automatic runtime provenance requires no changes to producer plugins. Bounded startup inventory discovers existing registrations without invoking callbacks, distinguishes unknown owners, and respects scoped shadowing. Includes prebuilt entries, synthetic tests, reproducible build inputs and separated MIT notices.
