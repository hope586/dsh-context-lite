# Compatibility and acceptance

Release: 0.2.1. Tested on macOS with Node.js 22.22.2. Declared engines are an installation range, not a claim that every release in the range was tested.

| Surface | Host | Evidence |
|---|---|---|
| Web / headless | 0.2.0-rc.2 | Actual model requests, fixed-estimator equality, original log bytes unchanged by viewing, admission sources and late-registry inventory |
| Desktop | 0.2.1-rc.3 | Actual BrowserSkill and GenUI calls and rendered UI; plugin disable/re-enable lifecycle |
| BrowserSkill | 0.3.3 | Read-only list of its own sessions; no browser page opened/read |
| GenUI | 0.14.0 | Local validate_dsh_ui and rendered fence output |

Automated tests use real Cordis/scope primitives and synthetic Agent/session stand-ins; they are not substitutes for live host acceptance. They cover rounds, compaction replay, read API lifecycle, parallel attribution, message/result/error identity, scope isolation, teardown, metadata bounds, late inventory without invoking callbacks, and unknown scoped shadows overriding known global entries.

Live comparisons check the canonical first-request surface and request header, excluding random message ids. Later model reasoning may differ and is not asserted byte-identical. The metadata inventory cannot retroactively prove missing callers. System/environment/tool inputs remain whole messages with contributor details.

The local synthetic collection benchmark measures callbacks, admission and bounded metadata only; it excludes disk, network and model time. It must not be interpreted as end-to-end latency. CI uses synthetic tests and package checks, without model keys. Linux CI success does not establish Linux/Windows Desktop acceptance. Cross-process metadata freshness, all competing wrappers, arbitrary future hosts and long-running endurance have not been exhaustively tested.

At release preparation, npm latest was 0.2.1-rc.2; next was 0.2.1-rc.4 and alpha was 0.2.2-alpha.2. Those tags are time-sensitive and do not extend the acceptance table. The working hosts were not upgraded as part of this release.
