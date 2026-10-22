import express, { type Express } from "express";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import path from "node:path";
import { appRouter } from "./routers";
import { createContext } from "./_core/context";

export const app = express();

app.disable("x-powered-by");
app.use(express.json({ limit: "256kb" }));
app.get("/health", (_req, res) => res.json({ status: "ok", server: "s2c" }));
app.use("/api/trpc", createExpressMiddleware({ router: appRouter, createContext }));

let frontendConfigured = false;

/**
 * Attach the production Vite output for long-running Docker hosts and Vercel.
 * Vercel serves files from `public` through its CDN; the Express static layer
 * remains useful for local and Docker deployments and the fallback supports SPA
 * routes that are not physical files.
 */
export function configureProductionFrontend(publicDir: string) {
  if (frontendConfigured) return;
  frontendConfigured = true;
  app.use(express.static(publicDir));
  app.get("*", (_req, res) => res.sendFile(path.join(publicDir, "index.html")));
}

export type S2CApp = Express;
