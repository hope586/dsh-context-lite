# dsh-context-lite v0.3.3 发布说明 / Release Notes

2026-11-05 · [English section](#english) · [中文](#中文)

## 中文

### 版本概要

0.3.3 是一个补丁版本，也是 0.3.0 之后首个创建 Release/tag 的版本，包含三部分：

1. **2026-11-05 审查修复**（本版主体）：长会话重建的 CPU/内存、侧栏每次刷新的负载、两个元数据存储缺陷与热路径开销。
2. **0.3.2 Desktop 启动修复（首次随本版发布）**：0.3.2 仅进入源码、未单独创建 Release/tag；本版将其正式发布。
3. **0.3.1 原生来源观察（首次随本版发布）**：同上，0.3.1 的能力也首次进入发布版本。

从 0.3.0 升级的用户一次获得以上全部内容；此前从源码安装 0.3.1/0.3.2 的用户获得本版新修复。

### 修复与性能改进

- **长会话重建开销**：回合与逻辑请求共享节点视图与 token 估算，不再为每次快照复制全部保留节点。在 200 轮合成会话上，重建耗时 109→85 ms，审计图保留内存 58.5→14.1 MB。新旧实现对回合/请求视图、逐片段详情及开发者 v1 快照/差异/导出的输出经差分验证逐字节一致（覆盖插件同轮替换、链式替换、压缩、中断等场景）。
- **侧栏每次刷新的负载**：概览与请求详情中的片段引用改为有界表示（每条仅 `{seq}`，超过 48 条合并为单一 `refCount`），悬停日志列表最多显示 12 条。200 轮合成会话单次刷新负载 35.9→3.1 MB，序列化耗时 98→9 ms。长会话下侧栏刷新随会话增长而恶化的情况显著缓解。
- **元数据存储缺陷（数据丢失风险）**：读取从未产生过归因记录的会话不再创建空会话行。旧版本中批量查看无记录会话可能把有真实归因的会话挤出默认 64 会话的保留窗口（未启用持久存储时不可恢复）。读取不再占用会话名额。
- **存储热路径**：来源元数据的 actor 清理改为仅在裁剪/覆写等必要时机执行；4000 条记录的清理开销约 183→26 ms。
- **Desktop 0.2.2-rc.1 启动崩溃修复（0.3.2，首次发布）**：新版 Cordis 更改了私有事件注册接口，旧观察器把监听器注册到错误的事件键，导致 Desktop 启动注入列表为空而崩溃。现改为在原生 `on()` 完成后观察新监听器，注销同时兼容新旧两种键。该修复经过正式 Desktop 重启与用户确认（详见兼容说明中的 0.3.2 一节）。
- **原生来源观察（0.3.1，首次发布）**：补齐原生 `agent/pre-step` 返回消息与直接 `Session.append()` 更新的来源归因，识别工具附加上下文与原生工具定义更新。

### 兼容性边界

- 要求 DSH **0.2.1-rc.5 或更高的兼容 0.2.x 版本**（声明范围 `>=0.2.1-rc.5 <0.3.0`）。该范围是安装范围声明，不等于对范围内每个版本都做过实测。本版实测环境为 macOS、Node.js 22.22.2。
- 开发者审计 v1 接口（`/api/dsh-context-lite/v1/snapshot|diff|export`）输出与上一版源码逐字节一致，随包 JSON Schema 无变化。
- **插件私有接口变化**：侧栏内部读取接口中片段 `refs` 由完整节点副本改为 `{seq}`（≤48 条）或 `refCount`。这是插件私有接口，随包客户端已同步适配；若有第三方直接消费该私有接口的 refs 附加字段，需要按 `refCount` 调整（未发现此类消费者）。
- 设置项、默认值与保留上限不变；存储仍只含来源元数据。停用/卸载行为不变，升级无需迁移步骤。
- 逻辑请求仍按结算前日志重建，不是提供方完整线缆抓包；证据限量保留、写入有 100 ms 延迟，崩溃可能丢失未写入尾部。

### 安装与升级

本项目未发布到 npm，通过 GitHub 分发。从 [v0.3.3 Release 页](https://github.com/hope586/dsh-context-lite/releases/tag/v0.3.3) 下载预构建的 `dsh-context-lite-0.3.3.tgz`，对照同页 `SHA256SUMS` 校验后安装：

```sh
dsh plugin --profile web add ./dsh-context-lite-0.3.3.tgz
# 或安装带预构建产物的 Git tag：
dsh plugin --profile web add github:hope586/dsh-context-lite#v0.3.3
```

按你管理 Web 的原有方式重启后端。Desktop 请通过官方插件管理页添加本地解压目录并启用，不要从 CLI 绕过 Desktop 对 profile 的管理。两种分发都包含预构建 `lib/`，安装时无需构建。从旧版本升级按相同方式重新添加即可；既有元数据与插件设置保留。

### 验证情况与已知限制

为帮助判断本版结论的适用范围，如实说明验证口径：

- **自动化验证**：78 项合成测试全部通过（62 项既有测试原样通过，16 项为本次新增回归）；构建产物从源码可复现；打包校验（含发布包私数据扫描）与暂存源码隐私扫描通过。
- **基准数字的口径**：本文所有性能数字来自固定合成 fixture 的纯计算测量（同机、Node v22.22.2、3 次取中位，可用仓库内 `scripts/benchmark-review.mjs` 复现），**不含网络、磁盘或模型时间，不代表端到端延迟或真实会话下的整体速度**。
- **未启用远端 CI**：仓库未启用远端 CI，全部检查为维护者本地执行（见仓库 `docs/CI.md`）。
- **协调方补充验收**：修复集成后 Web 与 Desktop 已正常重载，三个插件组件显示运行中；实际安装的 Desktop Cordis 4.1.0 的 5 项事件兼容测试和两种插件加载顺序的组合测试通过。这些是加载与接口验证，不代表完整交互或长期压力测试。
- **未做完整真实捕获与长时 UI 压力测试**：未对真实提供方做完整请求抓包比对，也未做多日长时或大规模 UI 压力测试；长会话结论基于合成 fixture 与差分验证。
- 其余既有边界（读取仍随会话长度线性重放、重建缓存上限、前端时间线未虚拟化等）见仓库 `docs/compatibility.md` 与 `docs/review-2026-11-05.md`。

## English

### Overview

0.3.3 is a patch release and the first version published as a GitHub Release/tag since 0.3.0. It combines three streams:

1. **2026-11-05 review fixes** (the bulk of this release): long-session rebuild CPU/memory, per-refresh sidebar payload cost, two metadata-storage defects and a storage hot path.
2. **0.3.2 Desktop boot fix (first shipped here)**: 0.3.2 reached source only, without its own Release/tag; this release publishes it.
3. **0.3.1 native admission observation (first shipped here)**: those capabilities also enter a published release for the first time.

Upgrading from 0.3.0 brings all of the above at once; users who installed 0.3.1/0.3.2 from source gain the new fixes below.

### Fixes and performance improvements

- **Long-session rebuild cost**: rounds and logical requests share node views and token estimates instead of copying every retained node per snapshot. On a 200-round synthetic session, rebuild drops 109→85 ms and the retained audit graph 58.5→14.1 MB. Outputs were verified byte-identical between old and new implementations across rounds, request views, per-segment details and developer v1 snapshot/diff/export, including plugin in-round replacement, chained replacement, compaction and interruption fixtures.
- **Per-refresh sidebar payload**: segment references in overview and request details become bounded (`{seq}` per entry, or a single `refCount` beyond 48); hover log lists cap at 12 entries. On the same synthetic session the per-refresh payload drops 35.9→3.1 MB and serialization 98→9 ms, easing the degradation long sessions previously caused.
- **Metadata-storage defect (data-loss risk)**: reads of sessions that never produced attribution records no longer create empty session rows. Previously, batch-viewing unrecorded sessions could evict sessions with real attribution from the default 64-session retention window (unrecoverable without persistent storage). Reads no longer occupy session slots.
- **Storage hot path**: actor pruning in the origin metadata store now runs only on trim/overwrite; pruning 4000 records drops from ~183 ms to ~26 ms.
- **Desktop 0.2.2-rc.1 boot crash fix (0.3.2, first shipped)**: newer Cordis changed the private listener-registration key, so the old observer misregistered listeners and Desktop booted with an empty injection list and crashed. The observer now wraps newly created records after native `on()` registers exactly once, and removal supports both old and new keys. This fix was validated by a production Desktop restart with user confirmation (see the 0.3.2 section of the compatibility notes).
- **Native admission observation (0.3.1, first shipped)**: attributes native `agent/pre-step` returned messages and direct `Session.append()` updates, and recognizes additional tool contexts and native tool-definition updates.

### Compatibility boundaries

- Requires DSH **0.2.1-rc.5 or a compatible later 0.2.x version** (declared range `>=0.2.1-rc.5 <0.3.0`). The declared range is an installation range, not a per-version test claim. This release was tested on macOS with Node.js 22.22.2.
- The developer audit v1 endpoints (`/api/dsh-context-lite/v1/snapshot|diff|export`) produce byte-identical output to the previous source state; the shipped JSON Schema is unchanged.
- **Plugin-private wire change**: segment `refs` in the sidebar's internal read API changed from full node copies to `{seq}` (≤48) or `refCount`. This is a plugin-private API and the bundled client is updated; third parties consuming it directly need to handle `refCount` (no such consumers are known).
- Settings, defaults and retention limits are unchanged; storage still holds provenance metadata only. Disable/uninstall behavior is unchanged and no migration step is required.
- Logical requests still reconstruct settlement-prefix logs; they are not complete provider wire captures. Evidence retention is bounded and writes are debounced by 100 ms; crashes can lose the unflushed tail.

### Install and upgrade

This project is not published to npm; it is distributed via GitHub. Download the prebuilt `dsh-context-lite-0.3.3.tgz` from the [v0.3.3 release page](https://github.com/hope586/dsh-context-lite/releases/tag/v0.3.3), verify it against the attached `SHA256SUMS`, then install:

```sh
dsh plugin --profile web add ./dsh-context-lite-0.3.3.tgz
# Or install the prebuilt tag:
dsh plugin --profile web add github:hope586/dsh-context-lite#v0.3.3
```

Reload your managed Web backend using its normal controls. On Desktop, add the extracted local package directory through the official plugin manager; do not manage the Desktop profile through the CLI. Both distributions include the prebuilt `lib/` and need no install-time build. Upgrading from an older version uses the same add flow; existing metadata and plugin settings are retained.

### Validation and known limits

Stated plainly so the scope of this release's claims is clear:

- **Automated validation**: all 78 synthetic tests pass (the 62 inherited tests unchanged plus 16 new regressions); the bundle rebuilds reproducibly from source; package verification (including a private-data scan of the archive) and a staged-source privacy scan pass.
- **Benchmark caveats**: every performance figure above is a synthetic-fixture computation measurement (same machine, Node v22.22.2, median of 3 trials, reproducible via `scripts/benchmark-review.mjs` in the repository). It **excludes network, disk and model time and is not an end-to-end latency or real-session speed claim**.
- **No remote CI**: the repository has no remote CI enabled; all release checks were run locally by the maintainer (see `docs/CI.md`).
- **Coordinator integration checks**: Web/Desktop reloaded successfully; the installed Desktop Cordis 4.1.0 passed five event-compatibility checks and both plugin load-order checks passed. This is loading/interface validation, not comprehensive GUI or long-duration stress testing.
- **No full real capture or long-duration UI stress testing**: no complete real-provider wire capture comparison and no multi-day/large-scale UI stress test were performed; long-session conclusions rely on synthetic fixtures and differential verification.
- Remaining pre-existing boundaries (reads still replay linearly with session length, the rebuild cache limit, the non-virtualized frontend timeline) are documented in `docs/compatibility.md` and `docs/review-2026-11-05.md` in the repository.
