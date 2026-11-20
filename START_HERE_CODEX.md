# CODEX MASTER HANDOFF — Chamberbalet production rebuild

**ACTIVE_STAGE = 00 (AUDIT AND SOURCE RECOVERY ONLY)**
**PROJECT_STATUS = PRE-IMPLEMENTATION**
**PRODUCTION_DEPLOYMENT_AUTHORIZED = NO**

Read `AGENTS.md`, `PROJECT_CONTRACT.md`, `REFERENCE/REFERENCE_MANIFEST.md`, and `TASKS/STAGE_00_AUDIT_AND_RECOVERY.md` before any work.

## Objective

Deliver a real, reliable, full-fidelity theatrical website at chamberbalet.ru based on the *approved live Sites prototype* (https://chamberbalet-prototype-v01.cuppedhornbill2.chatgpt.site/) using the existing GitHub repository and a manually uploaded ZIP for REG.RU. This archive contains every future stage, but **you are NOT authorized to execute them sequentially**.

## Your next actions, in order

1. Verify GitHub repository, default branch, full HEAD SHA, actual build contract, and current working tree.
2. Verify whether you can obtain the original live prototype source and its media/assets from an authorized export or project workspace. Do not treat the standalone v0.19 HTML as a complete source.
3. Execute `TASKS/STAGE_00_AUDIT_AND_RECOVERY.md` only. Produce docs-only branch/commit and a source-backed report, or return BLOCKED precisely if source cannot be recovered.
4. Record findings in the linked Notion task. Show exact evidence, failures, and Stage 01 entry criteria.
5. STOP. Await explicit approval. Do not write frontend runtime code, merge, release ZIP or deploy the server.

## Full work sequence (context, NOT automatic authorization)

```text
00 Audit, source recovery, baseline and hosting assessment -> G0: actual source/export + gap map verified, or BLOCKED with precise request.
01 Site architecture and foundation -> G1: approved technical approach, all routes and asset plumbing, preview build + tests.
02 Full UI/content/interaction implementation -> G2: complete reference parity register with no missing approved components.
03 Independent QA, accessibility, privacy and editorial clearance -> G3: critical defects zero and publication approvals documented.
04 Reproducible ZIP release preparation -> G4: validated archive, checksums, backup and rollback documentation, owner approval.
05 REG.RU launch and smoke verification -> G5: explicitly authorized owner deployment, live tests and rollback plan confirmed.
06 Maintenance and subsequent releases -> each release uses its own scoped task and approval.
```

## Final response

In Russian: what was verified, what is missing, branch and full commit SHA, Notion link, exact user-side source/export action if any, next gate. Explicitly confirm: 'Production unchanged; Stage 01 not started.'