# Increment 02 — Verified identity and intake decision boundary

This is an **incomplete engineering checkpoint**. It is not a production-ready pilot.

## Changes
- Resolve every signed JWT session email against `enterprise_user_master` on the backend. Locked or missing employees are rejected; admin rights are read from the database rather than from user-supplied JWT role claims.
- Disable client-only demo persona sign-in for the API-driven experience. UI now requires an existing trusted session and matches its BNAME and platform role against the snapshot. No anonymous data snapshot is requested.
- Introduce `intake.decideApproval` with a transaction, record locks, designated approver check, reason, and server-derived actor identity.
- Route both V4 and V5 intake approval buttons through the dedicated endpoint; refuse generic writes to key approval, role, identity and intake/RFx workflow tables.
- Ignore browser-supplied actor names on other privileged decision APIs.
- Add isolated policy tests.

## Blocked work / explicit gaps
- No SSO/OIDC callback or trusted-session issuance is included. A valid JWT signed with JWT_SECRET and matched to an unlocked employee record must already be provisioned. Production needs a verified organization identity provider. DO NOT restore one-click impersonation or a shared demo password.
- Existing generic `applyChanges` writes for intake submission, resubmission, editing, RFx conversion, and some other workflow screens are now forbidden. They REQUIRE dedicated APIs before the complete intake-to-RFx journey will work. The application may show a restricted or partly read-only experience in the interim.
- At the last approval, `intake_status` becomes `APPROVED`, but RFx creation is deliberately **not** attempted in this increment. That needs a dedicated idempotent server transaction.
- The snapshot includes sensitive and multi-persona data; read-only endpoint access is authenticated but not yet least-privilege row-level filtered. Do not deploy with live confidential data.
- Database setup, frontend build, end-to-end browser tests, and external SSO were not validated. No migrations or destructive actions were performed.
- The server currently uses same-site cookies; external IdP integration needs an explicit CSRF/session threat review.

## Verification
Run `npm install`, `npm run check`, `npm test`, `npm run build` in an environment with dependency access. Smoke-test user mismatches, locked identities, wrong role, wrong designated approver, concurrent requests, return and next-step transitions against isolated test data. Do not run demo seed against live data.
