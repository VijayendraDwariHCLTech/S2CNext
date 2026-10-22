# Railway deployment playbook — S2C Increment 02

**State:** Railway packaging prepared, not deployed and not certified production-ready. This project has no SSO callback/session issuance, is not end-to-end verified and exposes broad authenticated snapshots. Use **empty/synthetic data only** in an access-restricted development or staging project. Avoid assigning a publicly accessible domain until controls are reviewed.

## Included deployment files
- `Dockerfile`: Node 22, pnpm 10.4.1, frozen lockfile build, production-only dependencies.
- `railway.json`: Dockerfile build; `/health` startup healthcheck.
- `.dockerignore`: excludes environment secrets, dependencies, build output and logs.
- `.env.example`: placeholders only.
- `scripts/railway-preflight.mjs`: static packaging checks.

## Exact Railway setup
1. Create a **private GitHub repository** and push the contents of this folder, with `Dockerfile` and `railway.json` at repository root. Review files for any organizational secrets/sensitive demo data first. Do not commit `.env` or real user/supplier/bid data.
2. Go to https://railway.com/dashboard > **New Project** > **Deploy from GitHub Repo**. Connect GitHub if prompted. Pick this repo and add the service. Dockerfile auto-detection is reinforced by `railway.json`.
3. In the project canvas, click **+ New** > **Database** > **MySQL**. Keep MySQL private. Wait for provision.
4. Open the S2C application service > **Variables**. Set:
   - `DATABASE_URL=${{MySQL.MYSQL_URL}}` (replace `MySQL` with actual database service name; use variable-reference UI rather than copying credentials).
   - `JWT_SECRET=` a randomly generated secret of at least 32 bytes. Keep it in Railway variables.
   - `NODE_ENV=production` (also set by the Docker image).
   - **Optional** `FOUNDRY_APP_KEY`, `FOUNDRY_APP_SECRET`, and tenant-specific Foundry URLs **only if authorized**. No credentials are packaged.
   - **Do not manually set PORT**; Railway injects it.
5. Deploy the service and open **Deployments > View Logs**. Expect Docker dependency install, frontend build, and Express server start. If build fails, inspect the error and fix before proceeding; build was not executable in the creation environment.
6. Once deployed, check **Healthcheck** at `/health`: JSON with `status: ok`. This tests process liveness, not DB or app readiness.
7. **Database initialization is NOT automatic.** The archive has generated SQL/schema files with conflicting documented table counts; reconcile actual MySQL schema and tenant requirements before applying migrations. **Do not run `db:push` blindly or import `generated/s2c_demo_seed.sql` into an existing/production database.** Use a reviewed migration/seed plan on disposable staging data only.
8. **Authentication is NOT provisioned.** Increment 02 trusts an existing signed S2C JWT cookie and resolves users in `enterprise_user_master`, but does not implement an SSO login endpoint. Expect authenticated screens to be inaccessible until the trusted IdP/session issuance is implemented and tested. Do not mint a shared/demo bypass token.
9. For a public domain: only after SSO, database migrations, authorized row-level visibility, protected state transitions and automated smoke tests are complete. In Railway service **Settings > Networking > Generate Domain** when approved.

## Smoke test / acceptance gate
- Image builds successfully with locked dependencies.
- GET `/health` returns 200 JSON `{"status":"ok","server":"s2c"}`.
- GET `/api/trpc/auth.me` gives null without a valid session.
- Protected tRPC mutations reject anonymous users (`UNAUTHORIZED`); admin mutations reject non-admin users.
- Trusted session resolves only an unlocked employee in `enterprise_user_master`.
- Intake approval tests pass against an isolated schema: exact assignee only; return reason recorded; transaction does not double-approve.
- Test draft RFx creation only after its dedicated server-side endpoint exists.

## Known blockers
- SSO/OIDC login or verified JWT issuance not implemented.
- Database migrations, schema count and reference records unverified.
- Current generic-write restrictions mean intake submit/resubmit and RFx conversion are not yet complete.
- Broad snapshot visibility is not least privilege; **no sensitive live procurement data**.
- Runtime build, DB connectivity, tests and browser workflow remain unverified in this package.
- Health endpoint is a liveness check only.

## If the build fails
- Lockfile install failure: verify `pnpm-lock.yaml`, pnpm version 10.4.1 and any patched dependency files match the archive.
- TypeScript/Vite bundling error: reproduce with `pnpm install --frozen-lockfile && pnpm build` in a networked development machine, then patch and redeploy.
- 502/startup error: check `PORT`, Docker runtime logs and presence of `dist/public/index.html`.
- Login page but no data: this is expected without IdP sign-in and schema provisioning; do not loosen server permissions to conceal it.
