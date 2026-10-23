# WaiverBank release evidence (unverified fields must stay unverified)

Date: 2026-10-23 (Africa/Lagos)

GitHub repository: `https://github.com/lolaaa00/waiverbank` — verified and published under `lolaaa00`

Audited source commit: `d8647fb914447091efe1983903a87a552276c9c9` on `main`

Network: stable StudioNet / chain **61999** / RPC `https://studio.genlayer.com/api`

| Verification gate | Status | Evidence |
| --- | --- | --- |
| Dependency-free offline state-machine tests | PASS | 29/29 after hardening |
| Static/network preflight | PASS | 26 assertions passed |
| Python AST syntax / source SHA-256 | PASS | `WaiverBank.py` `0f5d38165dec01c40901194404babafada5ece189b23e60123ef1e1c33ee4e0e`; `WaiverGate.py` `ff6d3d021a475bd6651b16157758ffe451c0921a6e5678a71a75dbd532e2577f` |
| Exact local CLI `genlayer@0.39.1` | PASS | `npm ci --ignore-scripts`; local CLI reports `0.39.1` |
| Non-target-network deploy protection | PASS | Guard rejected a conflicting `GENLAYER_RPC_URL` before any signing attempt |
| GenVM linter `0.11.0`, both ICs | PASS | Both `check` commands passed with mandatory `GENVM_VERSION=v0.2.12` |
| SDK schema / semantic validation, both ICs | PASS | Bank 11 methods; Gate 2 methods |
| GenLayer Direct Mode | PASS | 13/13 true Direct Mode tests on GenVM `v0.2.12` |
| Adversarial leader/validator mismatch in Direct Mode | PASS | Validator rejected forged NARROW where independent mock returned BROAD |
| Stable 61999 RPC identity | PASS | Independent `eth_chainId` returned `0xf22f`; CLI info showed `studionet`, 61999, exact RPC |
| WaiverBank deployed + FINALIZED success | BLOCKED / NOT DEPLOYED | Guard passed, but active account `probe2` is locked and requires local interactive unlock; no transaction or address produced |
| Exact source-byte parity to deployed contract | NOT VERIFIED | No deployed contract exists from this run |
| WaiverGate deployed + FINALIZED success | BLOCKED / NOT DEPLOYED | Requires a finalized Bank address |
| Owner, applicant, stranger real-wallet lifecycle | BLOCKED | Requires finalized deployments and separately controlled identities |
| Live active + lifetime cap exhaustion | BLOCKED | Requires finalized Bank deployment |
| Live expiry and exactly-once settlement | BLOCKED | Requires finalized Bank deployment and elapsed chain time |
| Live consumer unauthorized-policy rejection | BLOCKED | Requires finalized Bank and Gate deployments |
| GitHub Actions green after publishing | PASS | Run `40010440911`: offline, GenVM and CLI-pin jobs all passed — `https://github.com/lolaaa00/waiverbank/actions/runs/40010440911` |
| Reviewer-ready README and honest proofs | CONDITIONALLY COMPLETE | Local documentation updated; live evidence remains blocked |
| npm dependency audit | OPEN RISK | 6 advisories in mandated CLI dev tree (2 critical, 4 moderate); remediation would change required CLI pin |

Do not substitute an `ACCEPTED` hash, a static mock, guessed contract address or screenshot for a finalized execution receipt.
