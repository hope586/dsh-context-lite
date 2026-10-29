# Third-party notices

Original Context Lite code is MIT, Copyright (c) 2026 hope586. The following MIT components are bundled unchanged or through ordinary bundling into `lib/index.js`:

| Component | Version | Scope |
|---|---|---|
| @deepseek-ai/dsh-session | 0.2.0-rc.2 | Canonical surface replay helpers |
| @deepseek-ai/dsh-token-meter | 0.2.0-rc.2 | Fixed token estimators |
| @deepseek-ai/dsh-brand | 0.2.0-rc.2 | Transitive helper used by those packages |
| Zod | 4.4.3 | Configuration and query validation |

DeepSeek copyright and full MIT notice: [licenses/DeepSeek-MIT.txt](licenses/DeepSeek-MIT.txt). Zod copyright and full MIT notice: [licenses/Zod-MIT.txt](licenses/Zod-MIT.txt). Both notices also ship in `lib/THIRD-PARTY-LICENSES.txt`. `lib/bundled-dependencies.json` records the actual bundled package names.

Cordis and scope are development/test dependencies; the running plugin resolves the host's scope instance. React, ModuleLoader, Slots and host services are provided by DeepSeek Harness. No code from dsh-context or other third-party context plugins is copied into this project.
