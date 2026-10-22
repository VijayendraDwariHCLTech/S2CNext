import express from "express";
import { createServer } from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { appRouter } from "../routers";
import { createContext } from "./context";

const app = express();
app.disable("x-powered-by");
app.use(express.json({ limit: "256kb" }));
app.get("/health", (_req, res) => res.json({ status: "ok", server: "s2c" }));
app.use("/api/trpc", createExpressMiddleware({ router: appRouter, createContext }));

const start = async () => {
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({ server: { middlewareMode: true }, appType: "spa" });
    app.use(vite.middlewares);
  } else {
    const here = path.dirname(fileURLToPath(import.meta.url));
    const publicDir = path.resolve(here, "public");
    app.use(express.static(publicDir));
    app.get("*", (_req, res) => res.sendFile(path.join(publicDir, "index.html")));
  }
  const port = Number(process.env.PORT || 3000);
  createServer(app).listen(port, "0.0.0.0", () => console.log(`S2C listening on ${port}`));
};
start().catch((error) => { console.error("S2C startup failed", error); process.exitCode = 1; });
