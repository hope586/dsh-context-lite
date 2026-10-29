# Provenance and measurement

The sidebar follows DSH's canonical session surface. It never controls which content enters the model. A round starts at turn/start and closes at turn/end; completion includes the final reply. Actual user aborts are marked separately from steering, recovery and other cancellation causes. Replacements and compaction are replayed at each historical cut rather than retroactively rewriting older rounds.

## Evidence

1. **Native records:** user/model identity, project instruction paths, skills, compaction references and recorded window/page metadata come from structured host events.
2. **Observed runtime:** Loader entries identify loaded modules; registration calls and asynchronous event callbacks connect actors to accepted message events. Inbox admission is linked to the exact committed message id/seq. Tool results follow the exact callId to the winning registered tool.
3. **Registry inventory:** one bounded read-only scan per service instance lists existing system-prompt sections, runtime contexts and tools. A direct lookup resolves effective scope shadowing. Scanning does not invoke text/execute/dispose callbacks or reload providers. Without caller evidence the entry is shown as 来源方未确认 (owner unconfirmed), with 现存注册表补录 (registry inventory) evidence. It does not claim an original registration timestamp.
4. **Legacy optional metadata:** source.contextLite and explicitly configured, session-scoped sourceProviders mappings are fallbacks for old records. They are not required from plugins, are not DSH-standard fields, and do not override observed actors. Public defaults include no mappings.

Installed package names, arbitrary source tags, text similarity and counts of cleanup effects are not enough to prove an owner. Unknown or ambiguous callers remain unknown. Current inventory is not used to retroactively assert ownership of old or removed registrations.

## Bounds and lifecycle

One scan per service instance is capped at 4096 entries; observed registration references are capped at 4096. Pending admission references are capped at 4000. Stored metadata defaults to 64 sessions × 2000 records, with explicit record trimming. Session audit cache defaults to 4 sessions; bodies are paged. Snapshot discovery is not a periodic sweep or a full scan per request. Definitions are held by weak reference; agent wrappers are restored when agents are disposed, and observation wrappers/listeners are released on plugin teardown. Another wrapper installed later is not overwritten during cleanup.

Admission APIs and registry adapters return the original results and errors. The collector only observes accepted events and keeps metadata separate from message bodies. This is implementation behavior in a shared JavaScript process, not tamper-proof attribution or security isolation. The Loader, event hooks and layered registries include version-specific internals. Missing shapes degrade coverage rather than creating owners from guesses.

## Measurement

Composition uses DSH's fixed message/tool estimators and canonical SurfaceManager replay. Summary coverage lists original event references and earlier summaries; it cannot prove every original fact survived summarization. Aggregated system/environment/tool messages stay aggregated with contributors listed in details. No exact per-plugin token split is claimed. Newly retained context excludes base definitions and reused history/summary carriers. Provider usage is separate from retained estimates.

Logical requests use the log prefix before response/attempt settlement. They are not complete post-adapter wire captures and may omit internal retries or full summarization templates. Storage is a host process-local snapshot; cross-process metadata visibility requires reader reload. Metadata trimming never removes host session events, but provenance may then be unavailable.

## Read API

GET /api/dsh-context-lite/audit uses the host Connection authentication and private/no-store responses. sessionId is mandatory. Kinds: overview, detail, event, request and origins (metadata only). Historical details retain event references; source bodies are paged on demand. This is the plugin's versioned implementation endpoint, not a proposed general DSH standard.
