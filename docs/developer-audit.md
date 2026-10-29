# Developer context audit API v1

This read-only layer reuses DSH's canonical session log and `SurfaceManager`. It is intended for debugging context injection, source attribution, compression, context occupancy and window limits. It adds no model tools, instructions, network listener or model calls. The sidebar uses the same audit reconstruction. This is a Context Lite contract, not an upstream DSH standard.

## Endpoints and boundaries

All routes use the existing host Connection authentication. Only GET is registered; responses are `private, no-store`. Every query requires `sessionId`. Use the host's authenticated connection, or a cookie jar from your own authenticated host session:

```sh
curl --fail --cookie "$DSH_COOKIE_JAR" \
  "$DSH_BASE_URL/api/dsh-context-lite/v1/snapshot?sessionId=$SESSION_ID"
curl --fail --cookie "$DSH_COOKIE_JAR" \
  "$DSH_BASE_URL/api/dsh-context-lite/v1/export?sessionId=$SESSION_ID&format=jsonl" \
  > context-audit.jsonl
```

The API does not discover or export authentication credentials. Operator authorization remains the host's responsibility; do not expose the host endpoint to untrusted consumers.

| GET path | Parameters beyond `sessionId` | Result |
| --- | --- | --- |
| `/api/dsh-context-lite/v1/snapshot` | optional **one** of `atSeq`, `roundId`, `requestId`; `offset`, `limit` | Ordered individual context items, measurements, source evidence, relationships and coverage |
| `/api/dsh-context-lite/v1/diff` | required `fromSeq`, `toSeq`; `offset`, `limit` | Added, removed and modified items, token delta and relationships recorded in the interval |
| `/api/dsh-context-lite/v1/export` | optional **one** of `atSeq`, `roundId`, `requestId`; `format=jsonl\|json`; `includeContent=false\|true` | One consistent observation exported as a stream, with a completion record |

No selector means **current** canonical context, including updates between turns. `atSeq` is an inclusive log cut; `-1` is the empty prefix. `roundId` is the sidebar's sequential round id, not necessarily DSH's turn number. A completed round includes its final reply; a running round returns `round-progress`. `requestId` comes from the existing sidebar request list (`request-<settlementSeq>`) and selects the prefix before response/attempt settlement, explicitly `basis: settlement-prefix`. It is **not** proof of exact provider delivery or an inventory of adapter-internal retries. A snapshot never retroactively folds future compaction into an earlier cut.

Snapshot and diff use `{ "ok": true, "value": ... }`. Errors use `{ "ok": false, "error": { "code": "...", "message": "..." } }`; branch on `code`, not message text. Invalid queries/cuts: 400; missing sessions/rounds/requests: 404; observation changed: 409; oversized export: 413; reconstruction unavailable: 422; cancellation: 499. Host authentication can reject before these handlers (401). Unknown parameters are rejected. The existing `/api/dsh-context-lite/audit` sidebar endpoint remains compatible.

Pagination defaults to 200, maximum 1000. In a snapshot it applies independently to `items` and `relationships`; in a diff, to `changes`, `surfaceUpdates` and `relationships`. `pagination` gives the total counts and `more`. Reuse `observation.capturedThroughSeq` and `observation.originRevision` as `expectedCursor` and `expectedOriginRevision` on subsequent pages. A mismatch returns 409 rather than silently mixing observations. Evidence revision is process-local and global to the collector. Also pin `expectedCaptureRunId` from `captureRunId` to reject restarts; when `sourceRevision` is present, pin it as `expectedSourceRevision` to reject replacement/migration of a stored log even if its event count stays equal. Multi-request queries are not a retained transaction: restart pagination after reconnect/reload. Export is one read and needs no pagination.

## Data contract

`contract: dsh-context-audit`, `schemaVersion: 1` identify the wire format; `algorithmVersion` versions reconstruction/measurement semantics. `implementation` records the plugin version/build and estimator/projection basis. Additive fields may appear. Stable identities, entry methods and findings do not change with UI language. The JSON Schema is shipped at `schemas/developer-audit.schema.json` (also exported from the package).

Each item has:

- `id`: an observation-local message or tool-header identity, never a display label.
- `ref`: `{ sessionId, formatVersion, seq }` addressing the observed DSH log. A fork's inherited event keeps its child-log coordinate; `parentSessionId` and `inherited` describe lineage, not an invented exact ancestor coordinate. Migrations/re-imports may change coordinates; retain the exported manifest with references.
- `source`: stable `key`, recorded `kind`, native/observed `evidence`, optional actual `actor`, `entryMethod`, identifiers and contributors. Unobserved actors remain absent. An aggregate system/runtime/tools item lists contributors but does not invent per-contributor token shares. Tool results retain the actual tool call's provenance when available.
- `representation`: `original`, `summary`, `replacement` or `tool-definitions`; `projected` is separate. `originRounds`, source refs and summary refs describe recorded coverage, not semantic preservation.
- `estimatedTokens`: DSH fixed estimate; billing usage is a different quantity. `contentHash` hashes effective logical role/content (or tool schemas), not a wire request or proof of model understanding.

`measurement` includes total estimates, recorded context capacity, utilization, estimates grouped by source and newly retained content in the active/latest round. New retained content excludes base definitions and summaries; it is not total injections, cost, or net growth. Diff reports the net estimated delta separately. Between-round surface updates have no active/latest measuring round: `roundId` is null and newly retained this-round tokens are zero. An unknown capacity is `null`. Context over capacity remains visible as utilization greater than 1.

`relationships` include native derived-from links, positional replacement ranges and recorded summary/prune coverage. They include log-only events, not only retained context. An item disappearing does not by itself prove compression: inspect its relationship record. Diff also lists `surfaceUpdates` throughout the interval with `retainedAtEnd`; this exposes injections that were added and then removed between the two endpoints, which a net item diff alone would miss. Snapshot `contentHash` covers the ordered item identities/hashes, not source evidence, capacity or model configuration; compare those fields separately.

## Evidence, completeness and retention

The original DSH log stays the authority for message/event contents. A separate host storage table stores only normalized actor metadata and accepted source evidence. New evidence observations carry a unique observation id, collector run id and observation time. Updating a latest-value attribution appends a bounded evidence observation; actor versions are retained independently. Existing pre-v1 metadata is exported with `captureTimeKnown: false`; loading an old record never invents its original capture time. This is an engineering audit trail inside a shared process, not tamper-proof attribution.

Defaults: 64 sessions, 2000 latest event attributions and 2000 evidence observations per session, 100 ms debounced writes, four reconstructed sessions cached. Set `maxOriginSessions`, `maxOriginRecords`, `persistOrigins` and `collectOrigins` in plugin config. Writes are best-effort and do not block the agent loop; a crash can lose the unflushed tail. There is no full-body mirror, periodic log scan or complete prompt snapshot written on every request. Evidence hashing/export/reconstruction happen on read. Current evidence-storage overhead is bounded but includes both latest attribution and evidence history.

`coverage` accompanies every snapshot/diff/export. It exposes unknown/unconfirmed owners, record/evidence trimming, persistence mode, storage errors and collection failures. Collector health describes the **currently observed process**, not a guaranteed history at the selected cut. Evidence observation time is different from source-event time. Session eviction is not tracked by an unbounded tombstone list: absent metadata may mean never observed, not persisted or evicted. Retention is independent of DSH's own log retention. A second process sees persisted provenance after reload, not live cross-process synchronization.

Stable `coverage.findings` codes:

| Code | Meaning |
| --- | --- |
| `WIRE_REQUESTS_NOT_CAPTURED` | Logical replay does not establish exact provider requests/retries |
| `REPLAY_USES_CURRENT_PROJECTIONS` | Message projections run using currently installed implementations |
| `SUMMARY_COVERAGE_IS_NOT_SEMANTIC_RETENTION` | A summary covering an event may omit its facts |
| `UNOBSERVED_CALLERS_NOT_RECOVERABLE` | Historical/bypassed calls cannot be attributed without evidence |
| `COLLECTOR_DISABLED` / `COLLECTOR_FAILURES` | Current collector is disabled / has encountered errors |
| `ORIGIN_STORAGE_ERROR` / `ORIGINS_MEMORY_ONLY` | Current storage failed / is not persistent |
| `ORIGIN_RECORDS_TRIMMED` / `EVIDENCE_HISTORY_TRIMMED` | Bounded attribution / evidence history was trimmed |
| `LEGACY_CAPTURE_TIME_UNKNOWN` | Older retained metadata has no observation timestamp |
| `SOURCE_OWNER_UNKNOWN` / `REGISTERED_OWNER_UNCONFIRMED` | Missing ownership / inventoried registration without caller proof |

An installed projection may change over time or disappear. The API cannot prove the old projected text from raw events alone. `includeContent=true` captures the effective content **at export time**, with original event data for comparison; it does not manufacture a historical wire capture. Unavailable interpreters fail reconstruction explicitly. Preserve an export when you need a fixed inspection artifact.

## Export format

JSONL has one record per line. JSON has an array of the same records. Order: `manifest`, individual `item` records, `relationship` records, bounded `origin-evidence` records, source `event` records, then `complete`.

The default omits message bodies, tool arguments, tool schemas and raw event data. Source paths, actor names and identifiers are still metadata and may be sensitive. `includeContent=true` explicitly includes effective retained content and original event data through the selected cut. No body truncation is applied. `maxExportBytes` defaults to 32 MiB (configurable 1 KiB–128 MiB); oversize returns 413 before a successful response. Choose an earlier cut or omit content if needed.

The `complete` record gives the preceding record count and SHA-256 over each preceding record's compact JSON serialization plus LF, encoded as UTF-8. Reject an export without its final record or with a mismatched count/digest. The checksum detects truncation/corruption; it is not a signature or authenticity guarantee. Export uses one captured log/evidence observation; normal model execution may continue while the detached export streams.
