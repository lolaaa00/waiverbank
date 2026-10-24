# Reviewer-facing submission material

Suggested title: **WaiverBank — Finite Semantic Exception Budgets**

## Description

WaiverBank protects a policy from being silently eroded by individually approved exceptions. A creator freezes a natural-language rule, exception charter, active capacity and lifetime budget. Applicants submit bounded waiver requests; GenLayer's independent validators agree on a narrow, moderate, broad, ambiguous or outside-charter impact classification. Only the approved class determines a fixed cost: 1, 2 or 4 units; ambiguity and outside-charter requests are denied. The policy owner must separately approve, and deterministic code checks both budgets atomically. Expired waivers immediately cease authorizing actions, while permissionless, one-time settlement restores active capacity only. Lifetime consumption is permanent. A separate `WaiverGate` Intelligent Contract proves caller-, policy- and action-bound enforcement through an IC-to-IC read. No frontend, central backend or private API key is required.

## Links and current status

- GitHub: `https://github.com/lolaaa00/waiverbank` — published under the verified `lolaaa00` account.
- StudioNet chain: `61999`, RPC `https://studio.genlayer.com/api`.
- Bank: https://explorer-studio.genlayer.com/address/0x65265EF0b9687c55d5dEBc97b2aF02BD58D7A0A6 — FINALIZED SUCCESS, exact source parity.
- Gate: https://explorer-studio.genlayer.com/address/0xd46816C640cc8389326Da03Da6b592f7717DAF69 — FINALIZED SUCCESS, exact source parity and real cross-contract execution.
- CI: `https://github.com/lolaaa00/waiverbank/actions/runs/40010440911` — all offline, GenVM and CLI-pin jobs passed.
- Source SHA-256 and receipt verification: `evidence/RELEASE_STATUS.md`.
- Finalized lifecycle and consumer receipts: `evidence/LIVE_BANK_VERIFICATION.md`, `evidence/LIVE_GATE_VERIFICATION.md`.

## Reviewer differentiation

**Invariant first:** a policy may only issue waivers while simultaneous active exposure and total lifetime exception cost stay below immutable caps.

This is not a general LLM yes/no compliance check. The model never chooses a price, consent, duration, or settlement. It determines a constrained qualitative impact, verified independently by validators. The deterministic state machine enforces cost conservation, owner separation, temporal invalidation, one-time refunds and consumer authorization.

## Honest caveats

No claim of full production security or proof of an incident's factual truth. Applicant evidence is not automatically verified from external sources. The live multicaller demonstration, full finality and source-byte parity are required release evidence, not hypothetical screenshots or fabricated hashes. Mark any missing one visibly as incomplete.

The demonstrated security-v1 owner is also its applicant; independent stranger calls prove non-owner rejection and permissionless settlement. Isolated fresh identities additionally proved active/lifetime budget exhaustion, duplicate-policy rejection and rejection of an ACTIVE attacker-policy waiver at the real Gate. The final wrong-action case also finalized: an approved HOTFIX_INC43 waiver under security-v1 was rejected by the Gate pinned to HOTFIX_INC42, leaving its usage counter unchanged. See `evidence/live-action-demo.jsonl` and `evidence/LIVE_GATE_VERIFICATION.md`.
