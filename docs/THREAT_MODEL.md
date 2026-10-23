# Threat model and adversarial controls

| Attack / failure | Control | Residual risk |
| --- | --- | --- |
| Malicious leader returns `NARROW` for a `BROAD` waiver | Validator independently reclassifies the frozen request and compares exact enum; `run_validator` regression | Common-mode LLM mistake possible |
| Leader adds a fabricated cost or authorization | Output schema rejects extra fields; cost mapping is deterministic | Unreliable semantic class still possible |
| Request contains prompt injection | Delimited untrusted data, explicit classifier instruction, independent validator comparison, ambiguity fails closed | Cannot guarantee immunity to sophisticated prompt injection |
| Request forges classifier delimiter tags | Deterministic XML escaping preserves the trusted/untrusted prompt structure; regression covers closing-tag injection | Escaping cannot eliminate semantic prompt injection or model common-mode error |
| Applicant exaggerates incident evidence | Only classification is automated; owner must approve | Owner can still approve based on false evidence |
| Non-owner tries to approve | `sender_address == owner` check | Compromised owner account |
| Owner repeatedly issues/withdraws exceptions to refill capacity | Active waivers cannot be withdrawn, only expire; lifetime budget never refunds | Owner may create a separate policy, which is why every consumer must pin the policy ID |
| Concurrent approvals exceed budget | Atomic deterministic approval rechecks live counters | Very stale pending approvals can fail until expiries settled |
| Replay of approval or expiry | Transition status guard and globally unique waiver ID | External integrator must handle repeated user operations separately |
| Expired grant used before manual cleanup | Time is checked in view even before settlement | Timestamp is transaction-pinned, not an external real-time clock |
| User passes somebody else's beneficiary address | Demo consumer uses `gl.message.sender_address` itself | Third-party consumers must use authenticated origin correctly |
| Self-authorized cheap policy used at protected gate | Consumer pins bank, policy ID and action key; bank checks all three | A consumer that fails to pin the right policy is insecure |
| Proposal changes rule after classification | No `update_policy()` or `update_request()` exists; all text frozen | Different policy IDs can coexist |
| Premature cross-contract action before finality | Live caller must await finality and verify state before reliance | Read-only view is not itself a finalized transaction receipt |
| Unlimited large prompts / storage | Tight length caps for policy, charter, scope and evidence | LLM classification still has runtime and fee cost |

## Honest security boundary

The bank makes a waiver **accountable**; it does not make a bad waiver morally justified or technically safe. In particular, natural-language evidence is unverified applicant input. An administrator can still issue waivers up to the immutable cap. The entire external system needs to actually consult the bank or a suitably pinned consumer for the cap to matter.

## Release blockers

1. GenVM linter and SDK schema validation on both contracts.
2. Actual Direct Mode tests against the pinned runtime, including validator forgery.
3. Confirm source/header compatibility with stable StudioNet, not preview tooling.
4. Finalized, successful deployment receipts and retrieved exact source byte comparisons for both contracts.
5. On-chain lifecycle and separate-wallet denial proof using both ICs.
6. Inspect pending/finality status and do not claim deployed or submitted before actual evidence exists.

## Audit findings and regression mapping (2026-10-23)

| Severity | Attack scenario / root cause | Minimal fix | Regression and verified result |
| --- | --- | --- | --- |
| Medium | Applicant closes `<requested_scope>` or `<evidence>` and forges trusted-looking tags because prompt fields were interpolated raw in `assess_waiver` | Deterministically escape `&`, `<` and `>` in every dynamic prompt field before constructing the tagged prompt | `test_prompt_tags_cannot_be_forged_by_request_data`; malicious closing tags are escaped and the mocked uncertain result is denied. Offline suite passes 29/29. |
| Medium (reproducibility) | Linter 0.11.0 chooses the newest cached preview GenVM and cannot resolve the stable SDK artifact, making validation depend on cache order | Pin `GENVM_VERSION=v0.2.12` in CI and release commands | Both contracts pass `check` and `schema` with the pin; Direct Mode passes 13/13 on the same runtime line. |

The existing malicious-leader regressions remain: the offline shim rejects a forged `NARROW` leader result when independent classification is `BROAD`, and Direct Mode's validator returns `False` for the same mismatch. Direct Mode does not implement a deployed-contract registry for `gl.get_contract_at`, so the consumer's real cross-contract path is not claimed as Direct Mode evidence; it still requires StudioNet execution.

`npm audit` reports six advisories (two critical, four moderate) in the mandated `genlayer@0.39.1` CLI's development-only dependency tree, principally Vitest/Tinypool plus Dockerode/UUID. They are not imported by either deployed Python contract. The suggested audit remediation changes the mandated CLI version and was therefore not applied; run the CLI only against trusted repository input and revisit when the required GenLayer pin changes.
