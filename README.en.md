# Context Lite for DeepSeek Harness

[中文](README.md) · MIT · Unofficial community plugin

A read-only context sidebar organized around **timeline** and **provenance**. See what a round retains, where it came from, and whether earlier rounds survive as original text or a summary. The compact view shows composition, sources, newly retained context and current size/capacity. Hover for labels; click to inspect contents and references.

**v0.3.0** adds a thin developer context audit layer over DSH's native log: structured snapshots, diffs and JSON/JSONL exports for debugging plugin injection, attribution, compression, context occupancy and window limits. The sidebar and its existing read API remain compatible.

A round ends on completion or an actual user interruption. Steering without stopping stays in the same round. Raw history and compressed history are separate; model work is grouped while plugin contributions remain distinguishable. Automatic collection requires no changes to other plugins. Existing registry entries are inventoried without evaluating providers; unknown owners stay unknown. The sidebar follows the DSH interface language (English or Chinese). Open tabs, details and errors update when the language changes; original content, plugin names, paths and identifiers stay verbatim.

## Install

Requires DeepSeek Harness and pnpm. This project is distributed on GitHub and is not published to npm.

Download `dsh-context-lite-0.3.0.tgz` from the [v0.3.0 release](https://github.com/hope586/dsh-context-lite/releases/tag/v0.3.0), verify it against the attached `SHA256SUMS`, then run:

```sh
dsh plugin --profile web add ./dsh-context-lite-0.3.0.tgz
# Or install the prebuilt tag:
dsh plugin --profile web add github:hope586/dsh-context-lite#v0.3.0
```

Reload your managed Web backend using its normal controls; do not start a second Web instance. Open the context icon in the session header or the context entry in the right sidebar. On Desktop, add the extracted local package directory through the official plugin manager and enable it; do not manage the Desktop profile through the CLI. Both distributions include `lib/` and need no install-time build script. See the [official bundle documentation](https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/user/develop/basic/publish.md).

## Scope and data

The plugin observes admission APIs, registration APIs and asynchronous event ownership. It does not rewrite messages, control compression/permissions, call models, or provide a separate context gauge or `/context` skill. Sources are actual plugin packages, script entries and native DSH records. Original identifiers remain auxiliary labels.

It reads session logs on demand and stores bounded **metadata only** through the host `storageDomain`: actors, registration names, methods, event references, observation times and collector runs. It does not copy prompt bodies, tool arguments, attachments, credentials or complete stacks. The `context_lite_origins` domain defaults to 64 sessions, with at most 2000 latest event attributions and 2000 evidence observations per session. Later actor versions do not overwrite older evidence within retention. There is no independent cloud service, API key or telemetry. The browser communicates with your authenticated DSH host, which may be remote. Read-only behavior is not process isolation or a security-audit claim.

See [provenance](docs/provenance.md) for evidence and limits and [compatibility](docs/compatibility.md) for tested hosts.

## Developer context audit

All routes reuse host authentication and register GET only. They add no model tools, instructions or separate service.

| Endpoint | Purpose |
|---|---|
| `/api/dsh-context-lite/v1/snapshot` | Inspect current context or a log, round or logical-request boundary, retaining individual sources and occupancy estimates |
| `/api/dsh-context-lite/v1/diff` | Compare endpoint changes and list updates throughout the interval, including injections subsequently removed |
| `/api/dsh-context-lite/v1/export` | Export one consistent observation as JSON/JSONL, with completion counts and a checksum |

Every query requires `sessionId`. See the [developer API documentation](docs/developer-audit.md) for boundaries, pagination, error codes and examples, and the shipped [JSON Schema](schemas/developer-audit.schema.json) for structure. Stable identities do not depend on UI language. Aggregate system, environment and tool items list contributors without inventing per-plugin token shares.

Exports omit bodies, tool arguments and raw event data by default. Explicit `includeContent=true` includes original event data and effective content at export time. Paths and identifiers can still be private without bodies; decide where to save and share exports. The default export limit is 32 MiB; oversize returns 413 without silent truncation. The repository and release package contain code, documentation and synthetic tests, with no real sessions or private acceptance logs.

Results explicitly report unknown owners, storage/collection failures and trimming. Evidence is bounded and writes are debounced by 100 ms; crashes can lose the unflushed tail. Missing metadata does not prove no injection occurred. Logical requests reconstruct settlement prefixes using current projection implementations; they are not complete provider wire captures. Summary coverage does not establish retention of every fact.

## Settings and removal

Edit these through DSH's plugin configuration; there is no additional control panel.

| Setting | Default | Meaning |
|---|---:|---|
| `collectOrigins` | `true` | Observe sources and inventory existing registrations |
| `persistOrigins` | `true` | Save source metadata in host storage; new records stay in memory when disabled |
| `maxOriginSessions` | `64` | Metadata session limit, 1–256 |
| `maxOriginRecords` | `2000` | Separate per-session limits for latest attributions and evidence observations, 10–10000 |
| `maxCachedSessions` | `4` | Reconstructed session cache limit, 1–32 |
| `maxVisibleRounds` | `120` | Rounds per sidebar page, 1–1000 |
| `detailPageSize` | `40` | Items per source detail page, 1–100 |
| `previewCharacters` | `12000` | Body preview characters per page, 1000–100000 |
| `maxExportBytes` | `33554432` | Developer export limit, 1 KiB–128 MiB; oversize is an explicit error |

Disabling releases wrappers, subscriptions and read routes, while keeping stored metadata. Removing the plugin does not remove sessions, attachments or other plugins' settings. Web removal: `dsh plugin --profile web remove dsh-context-lite`, then reload. Use the official plugin manager on Desktop. To remove metadata, stop all DSH processes using that storage, back it up, and remove only `storages/context_lite_origins` under your own DSH_HOME.

## Limits

Existing entries can be discovered, but missing historical caller identities and registration times cannot be invented. Removed history, bypassed entry points and ambiguous producers may remain unknown. Inventory evidence is distinguished from observed calls. Aggregate system/environment/tool messages are measured as wholes; no per-plugin token split is invented. Estimates use DSH's fixed estimator rather than provider billing. Request views reconstruct log prefixes, not complete provider wire payloads. Registry/loader/listener adapters depend partly on host internals; untested versions and other wrappers may differ. Host storage uses process-local snapshots, so new metadata from another process becomes visible after reloading the reader.

## Development

Use Node.js 22.19+ (22.x) or 24+ and pnpm 10.33.0:

```sh
pnpm install --frozen-lockfile --ignore-scripts
pnpm run check
pnpm test
pnpm run build
pnpm run verify:package
```

Build inputs stay within this repository and declared dependencies. Tests use synthetic fixtures and need no model key or real sessions. Host scope identity is resolved from the actual host; pure helpers are bundled. React, ModuleLoader and Slots come from the DSH client. See [CONTRIBUTING](CONTRIBUTING.md), [SECURITY](SECURITY.md), [MIT license](LICENSE) and [third-party notices](THIRD-PARTY-NOTICES.md).
