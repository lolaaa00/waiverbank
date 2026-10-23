# Reviewer demonstration (contract-only)

Goal: show exception erosion prevention with one frozen policy and a consumer that cannot be fooled by a policy created by an attacker.

## Example charter

Policy ID `security-v1`

> All production deployments require review by two independent engineers. Emergency single-service hotfixes may receive a time-bound exception if the incident evidence is specific. Customer PII export is never exempt.

Create an immutable envelope:

- `active_cap = 4`
- `lifetime_cap = 7`
- `max_duration = 86400` seconds
- action key `HOTFIX_INC42` for consumer

## Three proposed waivers

| Request | Expected consensus label | Deterministic cost | Result |
| --- | --- | ---: | --- |
| One urgent hotfix for incident INC42 | NARROW | 1 | Owner may approve |
| Blanket emergency release bypass for a whole department | BROAD | 4 | Owner approval blocked while NARROW uses 1 of active cap 4 |
| Access to raw customer PII for analytics | OUTSIDE | 0 | Denied as charter hard ban |

These labels are *demo expectations*, not hard-coded classifications. Record what live validators actually return. If a model gives a different answer, investigate instead of manipulating evidence to match the script.

1. Deploy and finalize bank, create policy from owner account.
2. Applicant A requests `waiver-incident42` for exact action key `HOTFIX_INC42`.
3. Another account runs assessment. Capture consensus trace and decision.
4. Owner approves only if assessed and budgets allow. Capture before/after balance read.
5. Deploy and finalize a `WaiverGate` pinned to bank address, `security-v1` and `HOTFIX_INC42`.
6. Applicant A calls consumer; succeeds. Applicant B calls same ID; is denied.
7. Show wrong action key or wrong policy ID rejection directly on the bank.
8. Try to create attacker-controlled policy for same action; the gate still denies it because it pins `security-v1`.
9. Try a broad waiver beyond the remaining active envelope; deterministic approval fails.
10. Advance to actual expiry, show immediate `is_active_for=false`; settle once permissionlessly; second settlement must fail. Lifetime budget must remain consumed.

No screenshots or transaction hashes have been prefilled. `evidence/RELEASE_STATUS.md` is the exact checklist for Lola's agent.
