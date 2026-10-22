import { createServer } from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { app, configureProductionFrontend } from "../app";

const start = async () => {
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({ server: { middlewareMode: true }, appType: "spa" });
    app.use(vite.middlewares);
  } else {
    const here = path.dirname(fileURLToPath(import.meta.url));
    const publicDir = path.resolve(here, "public");
    configureProductionFrontend(publicDir);
  }
  const port = Number(process.env.PORT || 3000);
  createServer(app).listen(port, "0.0.0.0", () => console.log(`S2C listening on ${port}`));
};
start().catch((error) => { console.error("S2C startup failed", error); process.exitCode = 1; });
