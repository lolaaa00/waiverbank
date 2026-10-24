# Deployment and final verification guide

## Verified Bank deployment

Stable StudioNet Bank: `0x65265EF0b9687c55d5dEBc97b2aF02BD58D7A0A6`.
Deployment transaction: `0x57e9fc435634b201daf161c0383bf18c61f3292b46c5e6905868999deeeadb72`.
The explorer confirmed FINALIZED, GenVM SUCCESS and consensus Accepted. Exact RPC source bytes match local `contracts/WaiverBank.py` (12,489 bytes), SHA-256 `0f5d38165dec01c40901194404babafada5ece189b23e60123ef1e1c33ee4e0e`.

The owner is `0x577065eDBEEba97D811F0135838Aa641F24D13bF`, account `waiverbank-deployer`.
The CLI's OS keychain is unavailable on this machine. `npm run demo:bank` prompts locally once and retains credentials only in process memory. Public evidence is written to `evidence/live-bank-demo.jsonl`. The runner explicitly waits for FINALIZED and verifies leader execution; on resume it reconciles matching recorded transactions rather than rebroadcasting them. Preserve the log. The recorded Bank lifecycle, budget exhaustion, policy substitution and wrong-action consumer calls have now been independently reconciled; see the LIVE verification documents. Gate deployment must use the supplied guarded deployment command.

Only the policy owner or Lola's authorized deploying account should publish this. Never add a private key or seed phrase to the repository, prompt, screenshot or ZIP.

## Step 1: verify the source

```sh
python3 --version
python3 scripts/preflight.py
python3 -m unittest discover -s tests -p test_offline.py -v
python3 -m pip install -r requirements-dev.txt
GENVM_VERSION=v0.2.12 genvm-lint check contracts/WaiverBank.py
GENVM_VERSION=v0.2.12 genvm-lint check contracts/WaiverGate.py
GENVM_VERSION=v0.2.12 genvm-lint schema contracts/WaiverBank.py
GENVM_VERSION=v0.2.12 genvm-lint schema contracts/WaiverGate.py
python3 -m pytest -q tests/direct
python3 scripts/source_hashes.py
```

`GENVM_VERSION=v0.2.12` is mandatory for these release gates. Without it, linter 0.11.0 may choose a newer cached preview runtime whose artifact index cannot resolve the stable header even though the contract is valid. If any validation still fails, fix source or the pinned tool installation and rerun **before** deployment.

## Step 2: verify only the intended network

```sh
npm ci
npm exec -- genlayer network set studionet
npm exec -- genlayer network info
```

The network info must show stable alias `studionet`, chain `61999`, and endpoint `https://studio.genlayer.com/api`. The deploy guard additionally invokes live RPC `eth_chainId` and refuses anything other than 61999. Never disable or bypass this guard because of a network/config failure.

## Step 3: deploy and finalize bank

```sh
npm run deploy:bank
```

Save the deployment transaction hash/address from real output. Use local CLI `receipt`, `trace`, `schema`, `code`, `finalize` as needed. Wait for **FINALIZED SUCCESS** (not only `ACCEPTED`, not only a guessed explorer page). Fetch exact deployed source bytes and compare with SHA-256 of `contracts/WaiverBank.py`. A mismatch requires investigation and a new deployment.

## Step 4: demonstrate lifecycle on 61999

Call `create_policy`, `request_waiver`, `assess_waiver`, `approve_waiver`, `is_active_for` and `get_policy`. Use distinct owner/applicant/stranger addresses where possible. Collect actual finalized transaction links, source hash, before/after budget reads, denied attempts, independent validator evidence and expiry settlement. Follow `REVIEWER_DEMO.md` for the sequence.

## Step 5: consumer deployment

Bank constructor takes **zero arguments**. Consumer constructor takes **exactly three**: finalized bank `Address`, the protected policy ID (`str`), and exact action key (`str`).

Use `npm run deploy:gate -- 0xFINALIZEDBANKADDRESS security-v1 HOTFIX_INC42` (with the actual 40-hex-digit bank address). The guarded script validates three constructor arguments, exact local CLI version, active network, RPC and chain ID, then forwards `--args`. Confirm the pinned CLI's actual `--args` encoding with its local help/schema before the first live consumer deployment. Deploy/finalize and verify source/hash. Do not reuse the bank's address for the consumer.

Consumer transaction `execute_with_waiver` must succeed for the applicant while a valid waiver is active, and fail for stranger/expired/wrong-policy cases. Record real outcome and state rereads.

## Step 6: publish to Lola's repository

Lola creates `https://github.com/lolaaa00/waiverbank`. Configure git remote under her authenticated account **only then**. Inspect branch/status/identity and do not force-push. Push the finished source, test suite, honest evidence files, successful CI output and docs. Keep screenshots/keys out of version control. Mark incomplete checks as blockers, not successes.
