# Changelog

## 0.3.3 — 2026-11-05

0.3.3 将两次此前仅进入源码、未单独创建 Release/tag 的更新——0.3.1（原生接纳观察）与 0.3.2（Desktop 0.2.2-rc.1 启动兼容修复）——与下述 2026-11-05 审查修复一同发布，是 0.3.0 之后的首个发布版本。面向用户的摘要见 [docs/RELEASE-NOTES-v0.3.3.md](docs/RELEASE-NOTES-v0.3.3.md)。

### 中文

- 长会话修复：回合与逻辑请求共享节点视图和 token 估算，不再为每次快照复制全部保留节点；200 轮合成会话重建 109→85 ms、审计图 heap 58.5→14.1 MB，输出与旧实现逐字节一致（差分验证含插件同轮替换/transient 场景）。
- 侧栏概览与请求详情的引用改为有界表示（`{seq}`，超过 48 条改为 `refCount`），悬停日志列表最多显示 12 条；200 轮合成会话单次刷新负载 35.9→3.1 MB、序列化 98→9 ms。客户端、合并逻辑（抽取可测的 `mergeOverview`）与中英文案同步。
- 修复元数据存储读路径创建空会话行、进而把真实归因挤出有界窗口的问题（内存模式下不可恢复）；读取不再占用会话名额。
- 存储热路径优化：actor 清理改为裁剪/覆写触发（4000 条记录约 183→26 ms）。采集侧消息指纹保持每次观察重新计算（曾尝试按对象身份记忆化，因插件消息无深不可变保证、会导致就地修改场景归因丢失而撤回，并新增可变对象回归锁定）。
- 新增可复现基准 `scripts/benchmark-review.mjs`（支持 `--baseline` 对比基线源码树）。62 项基线测试不变通过；新增 16 项回归。0.3.2 的 Cordis 事件注册/注销兼容路径零改动。详见 docs/review-2026-11-05.md。

### English

- Long-session repair: rounds and logical requests now share node views and token estimates instead of copying every retained node per snapshot. On a 200-round synthetic session rebuild drops 109→85 ms and retained audit heap 58.5→14.1 MB, with byte-identical output verified differentially including plugin in-round replacement/transient cases.
- Sidebar overview and request details use bounded references (`{seq}`, or a single `refCount` beyond 48); hover log lists cap at 12 entries. Per-refresh payload on the same session drops 35.9→3.1 MB and serialization 98→9 ms. Client, the merge logic (extracted testable `mergeOverview`) and both locales updated.
- Fixed origin-store read paths creating empty session rows that could evict real evidence from the bounded window (unrecoverable in memory-only mode). Reads no longer occupy session slots.
- Storage hot-path optimization: actor pruning now runs on trim/overwrite (~183→26 ms per 4000 records). Admission fingerprints keep being recomputed per observation (an identity-keyed memoization was attempted and withdrawn because plugin messages carry no deep-immutability guarantee and in-place mutation would silently drop provenance; mutable-object regressions now pin the behavior).
- Added a reproducible benchmark `scripts/benchmark-review.mjs` (supports `--baseline` against a baseline source tree). All 62 baseline tests pass unchanged; 16 regressions added. The 0.3.2 Cordis event registration/removal compatibility paths are untouched. See docs/review-2026-11-05.md.

## 0.3.2 — 2026-11-04 source update, first shipped in release 0.3.3

### 中文

- 修复 DSH Desktop 0.2.2-rc.1 启动时 `window.__ModuleLoader__ bootstrap facade is missing`：新版 Cordis 更改私有事件注册接口，旧来源观察器会把监听器注册到错误的事件键。
- 改为在原生 `on()` 完成后观察新监听器，不再调用私有 `register()`；注销同时兼容旧数组键与新事件名称，保持原生注册钩子只执行一次、返回值、异常及卸载行为。
- 62 项测试、实际 Desktop Cordis 的 5 项专项测试、完整插件组合隔离 Host 启动及用户截图确认的正式 Desktop 恢复通过。本次没有真实模型请求，也不代表所有插件功能均已复测。

### English

- Fix Desktop 0.2.2-rc.1 boot failure (`window.__ModuleLoader__ bootstrap facade is missing`) caused by Cordis changing the private listener-registration key.
- Observe new listeners after native `on()` returns instead of calling private `register()`. Support both array and event-name removal keys while preserving single native registration, result/error identity and teardown.
- Passed 62 tests, 5 checks against the installed Desktop Cordis, isolated full-profile Host startup and user-confirmed Desktop recovery. No live model request or exhaustive plugin-function retest was performed.

## 0.3.1 — source update, first shipped in release 0.3.3

- Observe native pre-step message contributions and live Session.append surface updates, attributing only accepted exact messages. Keep original return values, promises, errors, ordering and lifecycle cleanup.
- Preserve middleware ownership for additional tool contexts across native inbox transport; identify an unobserved native handoff without guessing its author. Later tool-result replacements no longer inherit the old tool's owner.
- Recognize native developer tool-definition updates and align replay/estimation dependencies with DSH 0.2.1-rc.5. Raise the declared minimum host accordingly.
- Add Chinese/English entry-method labels and document native-path coverage, source-evidence limits and inherited history. No new model tools or calls, producer-specific mappings or AutoMemory dependency.
- Isolated official-runtime observer absent/early/late comparison preserved logical inputs and continued after unload; public regression coverage includes the new native admission paths.

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
