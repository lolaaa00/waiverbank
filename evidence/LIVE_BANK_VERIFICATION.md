# Independently reconciled StudioNet evidence

Verified on 2026-10-24 against `https://studio.genlayer.com/api`, chain 61999.
Bank: `0x65265EF0b9687c55d5dEBc97b2aF02BD58D7A0A6`.

All transactions below are FINALIZED. Execution refers to the receipt with `mode=leader`; cancelled validators after quorum do not replace the leader outcome.

| Operation | Execution / outcome | Transaction |
| --- | --- | --- |
| Create frozen security-v1 policy | SUCCESS | `0x625e0c46d4e15213f441ed2ec231502b80435905a565c63f667825381563d2e7` |
| Request incident waiver | SUCCESS | `0x59e234d15dbadce9b5653e24844f6d15695dd66cddb287eac1a02680100735aa` |
| Assess incident waiver | SUCCESS, NARROW | `0x3f572bed026d7b9c700aa5dcc65d18f3aa47f2d80d52e157bd0dc531109a91ff` |
| Non-owner approval attempt | ERROR, only policy owner can approve | `0xb48b9b6eac6ab4df58a2ba6df9b176da28831510fc2257685e14740349b57471` |
| Owner approval | SUCCESS | `0xcbeffa1261983d750548cd97051d1a7c34a2de5499febbf803a9103891f577ac` |
| Request prohibited PII export | SUCCESS | `0xe0996efb0bddbc41d1dc5364ace97febe89e894ce05c934fbcf9a12895186448` |
| Assess prohibited export | SUCCESS, OUTSIDE; waiver DENIED | `0xc909ce3826e7067033603b48ad58cb5cfff1118f68253c5a869478b1443877a7` |
| Permissionless expiry settlement | SUCCESS | `0x788d362e699938d6f9c1858ed0fabbb6e44571263a9ce9f870974046653e4254` |
| Repeated settlement | ERROR, waiver not ready for expiry settlement | `0x9059582c36b56014849b8fa72b24c3efd545d297ac5edff02df2dbfc0262ffe5` |
| Request consumer waiver | SUCCESS | `0xde05375583be7ed0b433846ada2949c6d0855592ece3d58928d0e8c1e7991c86` |
| Assess consumer waiver | SUCCESS, NARROW | `0x85210c77bbe0e0a553f55b03e533db893724deff99a6f06f7321b3026e1c607c` |
| Approve consumer waiver | SUCCESS | `0x26ff9a372c5a982da42c9ca6c7cf83af372b207e795f777af9b275e3fcdee4d5` |

Post-finalization policy reads returned active_used=1, lifetime_used=2, issued=2 and requests=3. The first waiver is EXPIRED, cost=1; the prohibited waiver is DENIED, OUTSIDE, cost=0. The consumer waiver was previously read as ACTIVE, NARROW, cost=1. Authorization always also checks its expiry time.

The original JSONL log retains a historical parser mistake reporting the first request as ERROR: independent reconciliation above supersedes that entry. Its leader was SUCCESS; an appended validator was cancelled with VALIDATOR_QUORUM_REACHED. The parser now selects receipts by role and has three passing regressions.

Still pending: finalized Gate deployment and real cross-contract calls; live over-budget rejection; separate immutable-policy rewrite attempt; remaining distinct-policy/action adversarial consumer cases. Owner and applicant are the same demo address, while a separate in-memory stranger performed the unauthorized approval and settlement operations. This demonstration does not prove external incident facts.
