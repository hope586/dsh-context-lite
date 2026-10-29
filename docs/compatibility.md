# Compatibility and acceptance

Current release: 0.3.0; initial provenance acceptance: 0.2.1. Tested on macOS with Node.js 22.22.2. Declared engines are an installation range, not a claim that every release in the range was tested.

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

## BrowserSkill lazy activation

BrowserSkill 0.3.3 defaults to lazy tool registration. Invoke its browser-skill skill normally before calling bsk_* tools. A test that directly called bsk_session while it was absent from the offered request header returned UNKNOWN_TOOL; it is retained as a failed test attempt, not a passing compatibility result. With the normal skill entry, actual collector-off and collector-on requests both succeeded through skill → bsk_session(list) → validate_dsh_ui. Both headers omitted browser tools before activation and exposed them afterwards; first canonical request inputs matched. No BrowserSkill code/configuration was changed or lazy loading disabled.

The prebuilt tarball and a Git source with committed lib files were installed in dedicated profiles. Actual read-only requests completed from each. A clean clone passed all 30 tests, rebuild with byte-identical lib, and package checks without credentials or adjacent source trees. A pnpm profile may warn that the shared dsh-scope peer is missing locally; the plugin resolves the running host's scope instance. Do not install an unrelated scope copy merely to silence that warning.

## 0.2.2 localization

English and Chinese follow the host locale. Web acceptance covered a language switch with open source details, the existing tab caption, source/audit/request/coverage labels and restoration to Chinese. User text stayed unchanged. Automated coverage now includes dictionary/placeholder parity, locale-independent source identity and measurements, cached presentation/error switching, attachment truncation, additive API error keys and the built client title registration (38 tests total). The API retains legacy Chinese fallback text plus semantic label metadata; it does not translate stored conversations. No additional model requests are needed for a language change.

## 0.3.0 developer audit

The developer snapshot/diff/export routes were tested through the actual authenticated Web host (0.2.0-rc.2), including 401/400/409 responses, paged observations, JSON Schema validation, native surface references and fixed-estimate equality, historical native compression, logical request versus round-final boundaries, and JSON/JSONL exports both with and without content. Completion counts/checksums verified. Reading/exporting left the tested original compressed session files byte-identical. One aggregate system item's inventoried contributors remained unconfirmed and were reported as such.

A new real headless source-injection comparison with the observer absent versus present produced identical first logical inputs/tool headers and the same read-only file-tool arguments/results. Another collector-off/on comparison used the unchanged BrowserSkill 0.3.3 and GenUI 0.14.0 code through normal lazy skill activation: skill → bsk_session(list) → validate_dsh_ui succeeded in both runs, and the first logical inputs matched. Later model output is not assumed deterministic. Direct file-loaded third-party entries are correctly classified as scripts in this isolated fixture.

Desktop 0.2.1-rc.3 loaded the final 0.3.0 build through the official plugin switches. Its live sidebar reported the matching backend build and kept the existing timeline/GenUI rendering. New developer HTTP routes were exercised on Web; a new Desktop model run was not needed or claimed.

47 synthetic tests cover the previous functionality plus developer boundaries, transient surface updates, content opt-in, export completeness/size refusal, source revision/restart pins, evidence history/version preservation, retention and storage-failure containment. The local five-trial, 1000-admission benchmark measured about 38 microseconds added per admission; 1000 existing registry entries were inventoried in about 0.4 ms. These exclude disk/network/model time and are not an end-to-end latency guarantee. Evidence history adds bounded metadata storage; no periodic full-log scan or per-request full-body persistence was introduced.
