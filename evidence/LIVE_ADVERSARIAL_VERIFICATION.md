# Live adversarial verification

StudioNet 61999, 2026-10-24. Tests used a fresh faucet-funded identity whose key existed only in process memory. No existing user credential was required. The Bank and Gate sources were checked for exact parity before signing.

Policy `audit-104c6634` has active_cap=1 and lifetime_cap=1. Two requests independently finalized as NARROW, cost=1. First approval succeeded; second approval failed because active capacity was exhausted. After expiry settlement active usage became 0 and lifetime usage remained 1; approving the second request then failed because lifetime capacity was exhausted permanently.

| Case | FINALIZED result | Transaction |
| --- | --- | --- |
| Replace existing security-v1 policy ID | ERROR, policy id invalid or taken | `0x79dd73ebefd85f89ae1275ee990d2326216a2f6659ef69203d8314712de947a9` |
| First approval at exact budget boundary | SUCCESS | `0x1ea612a8a01da7593c55f21e4807aedc98a39fa844bedb9f5094a0540677da3d` |
| One-unit active-budget overflow | ERROR, active envelope exhausted | `0x9bb41ce528d2b11be36c9174aae8725786211ab5e7f43be7c78b8db1d71b5149` |
| Settle expired first waiver | SUCCESS | `0xee594482457303f6dc40264cb068e160a5ad10eb4ed18afa487542e22ab51b9c` |
| One-unit lifetime-budget overflow after settlement | ERROR, lifetime envelope exhausted permanently | `0xb8143ad430d179229a292bdad7c37e54966c08c0bc3abae631e8fd1f1ea3dfca` |

Full public receipts and counter reads are in `live-adversarial-demo.jsonl`. An additional Gate attempt in that log rejected the attacker-policy waiver, but its transaction timestamp was after the 60-second waiver expiry. That transaction cannot isolate policy binding from expiry. A separate one-hour policy-only test addresses this ambiguity; its evidence is recorded separately in `live-policy-substitution.jsonl`.

## Active attacker-policy bypass

Policy `audit-993634b8` was created and owned by a fresh identity `0x993634b840366E8Ce16BB31C3c58d588EC4F560B`. Its waiver `first-993634b8` assessed NARROW and was approved in FINALIZED SUCCESS transaction `0x66478c0aaffe86e969e105d2d479b143b4d9121e2e6229437f7a29833da6db7b`. Before the Gate call, a correctly typed Bank read confirmed `is_active_for=true` for the real beneficiary, attacker policy and same protected action HOTFIX_INC42.

The actual Gate call FINALIZED with ERROR `no effective waiver for caller/action`: `0xfe78e4333fb98c40835aa611941efbed31c02b8ca309bb929388aaa373c63cc0`. A later Bank read still showed ACTIVE with expiry 1792835538. Thus this rejection isolates the policy mismatch rather than an already expired waiver. Full receipts are in `live-policy-substitution.jsonl`.
