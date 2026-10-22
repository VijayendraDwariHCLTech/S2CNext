import type { Request } from "express";
export function getSessionCookieOptions(req: Request) {
  const secure = req.secure || req.protocol === "https";
  return { httpOnly: true as const, path: "/", secure, sameSite: (secure ? "none" : "lax") as "none" | "lax" };
}
