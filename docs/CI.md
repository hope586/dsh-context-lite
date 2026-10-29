# Optional CI

The repository includes `ci-example.yml` as an optional GitHub Actions template. It is not enabled on the default branch, and this release does not claim a remote CI pass. The publishing credential cannot create/update workflow files; no additional account permission was requested.

The release was checked locally in a clean clone with frozen dependencies, all 38 tests, rebuild equality and package verification. Run the commands from README to reproduce. A maintainer who can author Actions workflows may copy the example to `.github/workflows/ci.yml`. It uses read-only repository permissions and needs no model/API secrets.
