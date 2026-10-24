# WaiverGate deployment verification

Verified 2026-10-24 on stable StudioNet 61999.

- Gate: `0xd46816C640cc8389326Da03Da6b592f7717DAF69`
- Transaction: `0x723fbb50c1eb7675bbeeb898770c64d4b690bb41c92a6751261f18c430eb95c3`
- Status: FINALIZED; leader execution SUCCESS.
- Exact deployed/local source-byte match: confirmed by `gen_getContractCode`.
- Source SHA-256: `ff6d3d021a475bd6651b16157758ffe451c0921a6e5678a71a75dbd532e2577f`.
- Decoded deployment calldata pins Bank `0x65265EF0b9687c55d5dEBc97b2aF02BD58D7A0A6`, policy `security-v1`, action `HOTFIX_INC42`.

## Finalized cross-contract execution

Independently reconciled on 2026-10-24:

| Case | Execution | Transaction |
| --- | --- | --- |
| Authorized beneficiary with active waiver | SUCCESS | `0x77e3ebe1c4dfe0f1d33092529740442dd706ad2cecd7c558e536a6dfbc88c333` |
| Wrong beneficiary | ERROR, no effective waiver | `0xafa2a841cc39f075519e6decfdd766605f33e892f1cf7be382901db2e1b9e2b1` |
| Expired waiver | ERROR, no effective waiver | `0x2bc948e15487e038e8c7554dde770a681e54217232fa4de459417d3f54cda333` |
| Denied waiver | ERROR, no effective waiver | `0xff0203f2191b3eb56f3c2ef312aaec08bf8da72088b2de8b10e0e0137c0ad66d` |
| Unknown waiver | ERROR, no effective waiver | `0xf83bd223b581d72862a7784ce7b48ec4a0bd469885567d468f066f6460234bcd` |

Every transaction above is FINALIZED. A correctly typed `uses(Address)` read returned **1**. Bank `is_active_for` reads returned true for the approved owner/policy/action and false for another beneficiary, another action, another policy, and the expired incident waiver.

The runner initially failed its final `uses` read because it supplied a string where GenVM expects an Address. This was a client encoding error: no consumer source correction or redeployment was required. Both demo scripts now encode address arguments with SDK `CalldataAddress`. The original JSONL log is preserved, and independent typed reads confirmed the final state.

The later isolated test also proved rejection of an ACTIVE, approved attacker-owned policy waiver for the same action and actual beneficiary. See `LIVE_ADVERSARIAL_VERIFICATION.md` and transaction `0xfe78e4333fb98c40835aa611941efbed31c02b8ca309bb929388aaa373c63cc0`.

## Approved wrong-action waiver under the pinned policy

Independently verified on 2026-10-24. All four transactions below are FINALIZED:

- Request HOTFIX_INC43 under security-v1: `0x4065b49079feba2769ce62d4c6140cf1f315e277cc11251a117d2f94f810d154` — SUCCESS.
- Assessment: `0x8507d237a9eb7972bd6c14d2a98753e114da55ff00009686a6b6c23d8a0e5e72` — SUCCESS, NARROW.
- Owner approval: `0xa9ec5a70c9f7e6800ee6dee4374f418ba4efc1418f535043b19396e78fb3175f` — SUCCESS.
- Gate call: `0x26d51d2549001983344807ba9af06d7b2f094b73d6b16b66eef19bb7640b03b7` — ERROR, rollback `no effective waiver for caller/action`.

Before the Gate call, the Bank returned true for HOTFIX_INC43 and false for the pinned HOTFIX_INC42, with the correct beneficiary and policy. Waiver status was ACTIVE; Gate uses read 1 before and after. Full public evidence is in `live-action-demo.jsonl`.
