# Optional CI

The repository includes `ci-example.yml` as an optional GitHub Actions template. It is not enabled on the default branch, and this release does not claim a remote CI pass. The publishing credential cannot create/update workflow files; no additional account permission was requested.

The v0.3.0 release is checked locally from a clean source snapshot with frozen dependencies, all 47 tests, rebuild equality, package verification and a staged-source privacy scan (`pnpm run verify:public`). Run the commands from README to reproduce. A maintainer who can author Actions workflows may copy the example to `.github/workflows/ci.yml`. It uses read-only repository permissions and needs no model/API secrets.
