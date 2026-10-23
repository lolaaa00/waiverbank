# WaiverBank

> A policy can remain unchanged and still be hollowed out by exceptions. WaiverBank makes the exceptions account for scarce, immutable capacity.

Contract-only GenLayer Intelligent Contracts. No frontend, backend, Worker, database, payments or oracle. Two contracts:

- `contracts/WaiverBank.py`: policy charters, independent semantic classification, fixed costs, owner approval, two non-overridable envelopes, exact-once settlement, public queries.
- `contracts/WaiverGate.py`: a small real IC-to-IC consumer pinned to a bank address, a specific policy ID, the actual caller, and an exact action key.

## Core invariant

For each immutable policy, every live waiver occupies `cost(impact)` units, and every waiver ever activated has permanently consumed the same cost from the lifetime envelope.

`active_used <= active_cap` and `lifetime_used <= lifetime_cap`, where fixed costs are NARROW=1, MODERATE=2, BROAD=4. An ambiguous or outside-charter request is denied. Only permissionless expiry settlement releases `active_used`; **lifetime_used never decreases**. The owner cannot amend the limits or upgrade the charter in place.

## Network lock

| Setting | Value |
| --- | --- |
| Network | stable `studionet` |
| Chain ID | **61999** (`0xF22F`) |
| RPC | `https://studio.genlayer.com/api` |
| Explorer | `https://explorer-studio.genlayer.com/` |
| CLI | repository-local `genlayer@0.39.1` only |
| Python | 3.12+ |
| GenVM linter | target `genvm-linter==0.11.0` |

No preview/RC chain, no global GenLayer CLI. `scripts/guarded-deploy.mjs` refuses deployment unless the local binary, CLI version, selected network, configured endpoint, and live chain ID all match.

## Run local checks

```sh
python3 scripts/preflight.py
python3 -m unittest discover -s tests -p test_offline.py -v
python3 scripts/source_hashes.py
```

These are independent-of-GenLayer offline checks. The final 2026-10-23 local audit passed 29/29 behavioural cases and 26 structural/network assertions. They cannot establish SDK or consensus compatibility by themselves.

Once Python 3.12 dependencies are installed in a virtual environment, run the **additional release gates**:

```sh
python3 -m pip install -r requirements-dev.txt
GENVM_VERSION=v0.2.12 genvm-lint check contracts/WaiverBank.py
GENVM_VERSION=v0.2.12 genvm-lint check contracts/WaiverGate.py
GENVM_VERSION=v0.2.12 genvm-lint schema contracts/WaiverBank.py
GENVM_VERSION=v0.2.12 genvm-lint schema contracts/WaiverGate.py
python3 -m pytest -q tests/direct
```

At handoff, the **full GenVM linter checks passed for both ICs** and the **official Direct Mode suite passed 13/13** on the stable GenVM `v0.2.12` line. These results are local tests, *not* live StudioNet validation.

Install the exact repository-local CLI and select the stable network:

```sh
npm ci
npm exec -- genlayer network set studionet
npm exec -- genlayer network info
npm run deploy:bank
```

Only deploy the consumer **after** the bank is finalized. Its constructor requires the finalized WaiverBank address, the specific policy ID, and the action key:

```sh
npm run deploy:gate -- 0xREPLACE_WITH_FINALIZED_BANK_ADDRESS security-v1 HOTFIX_INC42
```

The placeholder must be replaced with a real 40-hex-digit address. The guarded script forwards those exact constructor arguments and rejects any missing or malformed value. Lola must confirm the CLI's actual `--args` encoding using its schema/help before the first live consumer deployment.

See [architecture](docs/ARCHITECTURE.md), [deployment and verification](docs/DEPLOYMENT.md), [security](docs/THREAT_MODEL.md), [reviewer demo](docs/REVIEWER_DEMO.md), and [submission material](docs/SUBMISSION.md).

## Evidence status

This handoff contains source and tests, **not** a deployed contract. `evidence/RELEASE_STATUS.md` must be updated with actual tool results, finality receipts, deployed source matches and exact transaction links. Unverified boxes remain unchecked.

**Proposed future repository:** `https://github.com/lolaaa00/waiverbank`. Do not push through `ometere123`; Lola will create and publish the repository herself.
