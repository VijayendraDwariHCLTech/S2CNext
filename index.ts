import path from "node:path";
import { app, configureProductionFrontend } from "./server/app";

// Vercel serves `public` through its CDN, while this fallback keeps SPA routes
// working when they are handled by the Express function.
configureProductionFrontend(path.resolve(process.cwd(), "public"));

export default app;
