# Increment 01 — server wiring and fail-closed API authorization

This is a **development checkpoint**, not a production-ready release.

## Implemented
- Restored `server/_core/index.ts`: Express `/api/trpc`, `/health`, Vite dev middleware, production static app.
- Added missing typed tRPC context, procedure gates, cookie options, health procedure and built-in LLM adapter.
- Routed all S2C table snapshots/metrics and intake chat behind a verified session, and generic mutation/reset/settings behind server-side admin authorization.
- Required JWT HS256 signature, issuer `s2c-platform`, audience `s2c-platform`, minimum 32-byte JWT_SECRET. No user-supplied role headers accepted.

## Deliberately blocked / unresolved
- Original frontend only supports **demo persona login**, not trusted backend identity. Therefore API screens will return UNAUTHORIZED until a legitimate IdP/session-issuance integration is completed. This is intentional: do not enable unauthenticated database writes for convenience.
- `admin` is a temporary coarse permission; object-level and persona/DOA rules MUST be implemented before enabling real approvals.
- All client-supplied `decidedBy`, `approvedBy`, `createdBy` fields remain untrusted and must be replaced with `ctx.user` in the next increment. Current endpoints are admin-only stopgaps.
- The alternate Vite `/api/intake/chat` handler has been removed from the dev plugin. Legacy `server/index.ts` still exists but is not in the active scripts; do not deploy or execute it.
- No migration generation, database reset or seed operation was performed.
- Open risk: demo frontend embeds prototype logic and simulated data; do not treat it as production-ready.

## Run (once dependencies installed)
`npm install` or `pnpm install`, `npm run check`, `npm test`, `npm run dev`.
Use secrets only in environment variables. Do not provide production credentials to an unreviewed prototype.
