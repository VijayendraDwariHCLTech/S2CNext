# Vercel deployment playbook — S2CNext

This repository now supports Vercel without removing the existing Railway deployment path. Railway continues to use `Dockerfile`, `railway.json`, `server/_core/index.ts`, and `dist/public`. Vercel uses the root `index.ts` Express export, `vercel.json`, and emits the Vite frontend to the root `public/` directory during a Vercel build.

## Deploy from GitHub

1. Open the Vercel dashboard and choose **Add New > Project**.
2. Import `VijayendraDwariHCLTech/S2CNext` from GitHub.
3. Keep the framework detection or choose **Other**. The committed `vercel.json` supplies the build command, while Vercel's standard root `public/` directory serves the generated frontend.
4. Add the environment variables before deploying:

   - `NODE_ENV=production`
   - `JWT_SECRET`: a random secret of at least 32 bytes
   - `DATABASE_URL`: a MySQL/TiDB-compatible connection URL
   - `FOUNDRY_APP_KEY` and `FOUNDRY_APP_SECRET` only when authorized and required

5. Deploy the project. Vercel should run `pnpm build`, create the Express Function from `index.ts`, and serve the Vite output from `public/`.
6. Verify `/health` on the Vercel deployment. Expected JSON:

```json
{"status":"ok","server":"s2c"}
```

## Database and runtime notes

Vercel does not provide the MySQL service required by this application. Use an approved external MySQL/TiDB provider and keep the connection URL in Vercel Environment Variables. Do not commit `.env` files or credentials.

The database is not initialized automatically. Do not run `db:push` blindly and do not import `generated/s2c_demo_seed.sql` into an existing database. Reconcile the schema first and apply a reviewed migration and synthetic seed plan to an isolated staging database.

Vercel Functions are request-driven and can scale down between requests. The MySQL pool is created lazily, so use a provider that supports serverless connections and review connection limits before loading data.

## Railway remains available

Do not remove or rename `Dockerfile`, `railway.json`, `server/_core/index.ts`, `dist/public`, or the Railway deployment scripts. A Railway deployment continues to use the original long-running Express/Docker path independently of the Vercel adapter.

## Current application limitations

This checkpoint is not production-certified. It does not include an SSO/OIDC callback or trusted session issuance. Protected screens expect an existing signed S2C JWT session resolved against `enterprise_user_master`. Database migrations, end-to-end browser flows, and least-privilege row-level filtering remain unfinished. Use synthetic data and an access-restricted deployment until those controls are implemented.
