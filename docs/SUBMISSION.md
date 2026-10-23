# Reviewer-facing submission material

Suggested title: **WaiverBank — Finite Semantic Exception Budgets**

## Description (draft; live evidence is still blocked)

WaiverBank protects a policy from being silently eroded by individually approved exceptions. A creator freezes a natural-language rule, exception charter, active capacity and lifetime budget. Applicants submit bounded waiver requests; GenLayer's independent validators agree on a narrow, moderate, broad, ambiguous or outside-charter impact classification. Only the approved class determines a fixed cost: 1, 2 or 4 units; ambiguity and outside-charter requests are denied. The policy owner must separately approve, and deterministic code checks both budgets atomically. Expired waivers immediately cease authorizing actions, while permissionless, one-time settlement restores active capacity only. Lifetime consumption is permanent. A separate `WaiverGate` Intelligent Contract proves caller-, policy- and action-bound enforcement through an IC-to-IC read. No frontend, central backend or private API key is required.

## Links and current status

- GitHub: `https://github.com/lolaaa00/waiverbank` — published under the verified `lolaaa00` account.
- StudioNet chain: `61999`, RPC `https://studio.genlayer.com/api`.
- Bank contract: not deployed; guarded attempt stopped at the authorized account's keystore password prompt before transaction submission.
- Gate contract: not deployed; requires a finalized Bank address.
- CI: `https://github.com/lolaaa00/waiverbank/actions/runs/40010440911` — all offline, GenVM and CLI-pin jobs passed.
- Source SHA-256 and receipt verification: `evidence/RELEASE_STATUS.md`.

## Reviewer differentiation

**Invariant first:** a policy may only issue waivers while simultaneous active exposure and total lifetime exception cost stay below immutable caps.

This is not a general LLM yes/no compliance check. The model never chooses a price, consent, duration, or settlement. It determines a constrained qualitative impact, verified independently by validators. The deterministic state machine enforces cost conservation, owner separation, temporal invalidation, one-time refunds and consumer authorization.

## Honest caveats

No claim of full production security or proof of an incident's factual truth. Applicant evidence is not automatically verified from external sources. The live multicaller demonstration, full finality and source-byte parity are required release evidence, not hypothetical screenshots or fabricated hashes. Mark any missing one visibly as incomplete.
