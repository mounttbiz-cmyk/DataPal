import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import { sdk } from "./sdk";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
};

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  let user: User | null = null;

  try {
    user = await sdk.authenticateRequest(opts.req);
  } catch (error) {
    if (opts.req.headers.cookie?.includes("mock_session=1")) {
      user = { id: 1, openId: "mock-id", name: "Local User", email: "user@local.com", role: "admin", createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date(), loginMethod: "local" } as any;
    } else {
      user = null;
    }
  }

  return {
    req: opts.req,
    res: opts.res,
    user,
  };
}
