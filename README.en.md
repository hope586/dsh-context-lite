# Context Lite for DeepSeek Harness

[中文](README.md) · MIT · Unofficial community plugin

A read-only context sidebar organized around **timeline** and **provenance**. See what a round retains, where it came from, and whether earlier rounds survive as original text or a summary. The compact view shows composition, sources, newly retained context and current size/capacity. Hover for labels; click to inspect contents and references.

A round ends on completion or an actual user interruption. Steering without stopping stays in the same round. Raw history and compressed history are separate; model work is grouped while plugin contributions remain distinguishable. Automatic collection requires no changes to other plugins. Existing registry entries are inventoried without evaluating providers; unknown owners stay unknown. The UI currently uses Chinese primarily.

## Install

Requires DeepSeek Harness and pnpm. This project is distributed on GitHub and is not published to npm.

Download `dsh-context-lite-0.2.1.tgz` from [Releases](https://github.com/hope586/dsh-context-lite/releases), check the provided SHA256, then run:

```sh
dsh plugin --profile web add ./dsh-context-lite-0.2.1.tgz
# Or install the prebuilt tag:
dsh plugin --profile web add github:hope586/dsh-context-lite#v0.2.1
```

Reload your managed Web backend using its normal controls; do not start a second Web instance. Open the context icon in the session header or the context entry in the right sidebar. On Desktop, add the extracted local package directory through the official plugin manager and enable it; do not manage the Desktop profile through the CLI. Both distributions include `lib/` and need no install-time build script. See the [official bundle documentation](https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/user/develop/basic/publish.md).

## Scope and data

The plugin observes admission APIs, registration APIs and asynchronous event ownership. It does not rewrite messages, control compression/permissions, call models, or provide a separate context gauge or `/context` skill. Sources are actual plugin packages, script entries and native DSH records. Original identifiers remain auxiliary labels.

It reads session logs on demand and stores bounded **metadata only** through the host `storageDomain`: actors, registration names, methods and event references. It does not copy prompt bodies, tool arguments, attachments, credentials or complete stacks. The `context_lite_origins` domain defaults to 64 sessions and 2000 event records per session. There is no independent cloud service, API key or telemetry. The browser communicates with your authenticated DSH host, which may be remote. Read-only behavior is not process isolation or a security-audit claim.

See [provenance](docs/provenance.md) for evidence and limits, [compatibility](docs/compatibility.md) for tested hosts, and the Chinese README for the full settings table. `collectOrigins=false` disables observation. `persistOrigins=false` keeps new records in memory. Disabling releases wrappers, subscriptions and the audit route, while keeping stored metadata. Removing the plugin does not remove sessions, attachments or other plugins' settings. Web removal: `dsh plugin --profile web remove dsh-context-lite`, then reload. Use the official plugin manager on Desktop. To remove metadata, stop all DSH processes using that storage, back it up, and remove only `storages/context_lite_origins` under your own DSH_HOME.

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
