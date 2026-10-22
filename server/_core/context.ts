import type { Request, Response } from "express";
import { jwtVerify } from "jose";
import { parse } from "cookie";
import { resolveEmployee, type EmployeeIdentity } from "./identity";
import { COOKIE_NAME } from "../../shared/const";

export type AuthUser = { id: number; openId: string; email: string | null; name: string | null; loginMethod: string; role: "user" | "admin"; createdAt: Date; updatedAt: Date; lastSignedIn: Date };
export type TrpcContext = { req: Request; res: Response; user: (AuthUser & EmployeeIdentity) | null };

// Token issuance is intentionally NOT implemented: a trusted identity integration must provision sessions.
// Only a server-signed token is trusted; never trust role, userId or approver supplied by the browser.
export async function createContext({ req, res }: { req: Request; res: Response }): Promise<TrpcContext> {
  const cookies = parse(req.headers.cookie || "");
  const token = cookies[COOKIE_NAME];
  const secret = process.env.JWT_SECRET;
  let user: (AuthUser & EmployeeIdentity) | null = null;
  if (token && secret && Buffer.byteLength(secret) >= 32) {
    try {
      const verified = await jwtVerify(token, new TextEncoder().encode(secret), { algorithms: ["HS256"], issuer: "s2c-platform", audience: "s2c-platform" });
      const p = verified.payload;
      if (typeof p.sub === "string" && typeof p.email === "string" && (p.role === "user" || p.role === "admin")) {
        const now = new Date();
        const identity = await resolveEmployee(p.email);
        if (identity) user = { id: Number(p.uid) || 0, openId: p.sub, email: identity.email, name: identity.displayName, loginMethod: "trusted-jwt", role: identity.platformRole === "ADMIN" ? "admin" : "user", createdAt: now, updatedAt: now, lastSignedIn: now, ...identity };
      }
    } catch { /* Unknown or invalid token: remain anonymous. */ }
  }
  return { req, res, user };
}
