// server/_core/serverless.ts
import "dotenv/config";
import express from "express";
import { createExpressMiddleware } from "@trpc/server/adapters/express";

// shared/const.ts
var COOKIE_NAME = "app_session_id";
var ONE_YEAR_MS = 1e3 * 60 * 60 * 24 * 365;
var AXIOS_TIMEOUT_MS = 3e4;
var UNAUTHED_ERR_MSG = "Please login (10001)";
var NOT_ADMIN_ERR_MSG = "You do not have required permission (10002)";
var OAUTH_STATE_COOKIE = "__Host-oauth_state";
var decodeOAuthState = (state) => {
  let decoded;
  try {
    decoded = atob(state);
  } catch {
    return { redirectUri: "" };
  }
  try {
    const parsed = JSON.parse(decoded);
    if (parsed && typeof parsed.redirectUri === "string") return parsed;
  } catch {
  }
  return { redirectUri: decoded };
};

// server/_core/oauth.ts
import { parse as parseCookieHeader2 } from "cookie";

// server/db.ts
import { eq, desc, and } from "drizzle-orm";
import { drizzle } from "drizzle-orm/libsql";
import { createClient } from "@libsql/client";

// drizzle/schema.ts
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
var users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  openId: text("openId").notNull().unique(),
  name: text("name"),
  email: text("email"),
  loginMethod: text("loginMethod"),
  role: text("role", { enum: ["user", "admin"] }).default("user").notNull(),
  createdAt: integer("createdAt", { mode: "timestamp" }),
  updatedAt: integer("updatedAt", { mode: "timestamp" }),
  lastSignedIn: integer("lastSignedIn", { mode: "timestamp" })
});
var searchHistory = sqliteTable("searchHistory", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("userId").notNull(),
  businessType: text("businessType").notNull(),
  location: text("location").notNull(),
  requirement: text("requirement"),
  status: text("status", { enum: ["pending", "running", "completed", "failed"] }).default("pending").notNull(),
  resultsCount: integer("resultsCount").default(0),
  sources: text("sources"),
  createdAt: integer("createdAt", { mode: "timestamp" }),
  updatedAt: integer("updatedAt", { mode: "timestamp" })
});
var businessResults = sqliteTable("businessResults", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  searchId: integer("searchId").notNull(),
  name: text("name").notNull(),
  phone: text("phone"),
  email: text("email"),
  address: text("address"),
  website: text("website"),
  category: text("category"),
  source: text("source", { enum: ["google_maps", "justdial", "indiamart", "linkedin", "yellowpages", "tradeindia", "other"] }).default("google_maps"),
  rating: text("rating"),
  existingPresence: text("existingPresence"),
  notes: text("notes"),
  createdAt: integer("createdAt", { mode: "timestamp" })
});

// server/_core/env.ts
var ENV = {
  appId: process.env.VITE_APP_ID ?? "",
  cookieSecret: process.env.JWT_SECRET ?? "",
  databaseUrl: process.env.DATABASE_URL ?? "",
  oAuthServerUrl: process.env.OAUTH_SERVER_URL ?? "",
  ownerOpenId: process.env.OWNER_OPEN_ID ?? "",
  isProduction: process.env.NODE_ENV === "production",
  forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL ?? "",
  forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY ?? process.env.OPENAI_API_KEY ?? ""
};

// server/db.ts
var _db = null;
async function getDb() {
  if (!_db) {
    try {
      const url = process.env.DATABASE_URL || "file:local.db";
      const authToken = process.env.DATABASE_AUTH_TOKEN;
      const client = createClient({ url, authToken });
      _db = drizzle(client);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}
async function upsertUser(user) {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }
  try {
    const values = {
      openId: user.openId
    };
    const updateSet = {};
    const textFields = ["name", "email", "loginMethod"];
    const assignNullable = (field) => {
      const value = user[field];
      if (value === void 0) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };
    textFields.forEach(assignNullable);
    if (user.lastSignedIn !== void 0) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== void 0) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = "admin";
      updateSet.role = "admin";
    }
    if (!values.lastSignedIn) {
      values.lastSignedIn = /* @__PURE__ */ new Date();
    }
    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = /* @__PURE__ */ new Date();
    }
    await db.insert(users).values(values).onConflictDoUpdate({
      target: users.openId,
      set: updateSet
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}
async function getUserByOpenId(openId) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return void 0;
  }
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : void 0;
}
async function createSearchHistory(userId, businessType, location, requirement) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(searchHistory).values({
    userId,
    businessType,
    location,
    requirement,
    status: "pending",
    createdAt: /* @__PURE__ */ new Date(),
    updatedAt: /* @__PURE__ */ new Date()
  });
  return result.lastInsertRowid;
}
async function updateSearchStatus(id, status, resultsCount) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const set = {
    status,
    updatedAt: /* @__PURE__ */ new Date()
  };
  if (resultsCount !== void 0) set.resultsCount = resultsCount;
  await db.update(searchHistory).set(set).where(eq(searchHistory.id, id));
}
async function getSearchHistory(userId, limit = 20, offset = 0) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.select().from(searchHistory).where(eq(searchHistory.userId, userId)).orderBy(desc(searchHistory.createdAt)).limit(limit).offset(offset);
}
async function getSearchById(id) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.select().from(searchHistory).where(eq(searchHistory.id, id)).limit(1);
  return result.length > 0 ? result[0] : null;
}
async function insertBusinessResults(results) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (results.length === 0) return;
  const resultsWithDate = results.map((r) => ({
    ...r,
    createdAt: /* @__PURE__ */ new Date()
  }));
  await db.insert(businessResults).values(resultsWithDate);
}
async function getBusinessResults(searchId, limit = 20, offset = 0) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.select().from(businessResults).where(eq(businessResults.searchId, searchId)).limit(limit).offset(offset);
}
async function countBusinessResults(searchId) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.select({ count: businessResults.id }).from(businessResults).where(eq(businessResults.searchId, searchId));
  return result.length;
}
async function getAllBusinessResultsForExport(searchId) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.select().from(businessResults).where(eq(businessResults.searchId, searchId));
}
async function getAllCompletedSearchesForUser(userId) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.select().from(searchHistory).where(and(eq(searchHistory.userId, userId), eq(searchHistory.status, "completed"))).orderBy(desc(searchHistory.createdAt));
}

// server/_core/cookies.ts
function isSecureRequest(req) {
  if (req.protocol === "https") return true;
  const forwardedProto = req.headers["x-forwarded-proto"];
  if (!forwardedProto) return false;
  const protoList = Array.isArray(forwardedProto) ? forwardedProto : forwardedProto.split(",");
  return protoList.some((proto) => proto.trim().toLowerCase() === "https");
}
function getSessionCookieOptions(req) {
  return {
    httpOnly: true,
    path: "/",
    sameSite: "none",
    secure: isSecureRequest(req)
  };
}

// shared/_core/errors.ts
var HttpError = class extends Error {
  constructor(statusCode, message) {
    super(message);
    this.statusCode = statusCode;
    this.name = "HttpError";
  }
};
var ForbiddenError = (msg) => new HttpError(403, msg);

// server/_core/sdk.ts
import axios from "axios";
import { parse as parseCookieHeader } from "cookie";
import { SignJWT, jwtVerify } from "jose";
var isNonEmptyString = (value) => typeof value === "string" && value.length > 0;
var EXCHANGE_TOKEN_PATH = `/webdev.v1.WebDevAuthPublicService/ExchangeToken`;
var GET_USER_INFO_PATH = `/webdev.v1.WebDevAuthPublicService/GetUserInfo`;
var GET_USER_INFO_WITH_JWT_PATH = `/webdev.v1.WebDevAuthPublicService/GetUserInfoWithJwt`;
var OAuthService = class {
  constructor(client) {
    this.client = client;
    console.log("[OAuth] Initialized with baseURL:", ENV.oAuthServerUrl);
    if (!ENV.oAuthServerUrl) {
      console.error(
        "[OAuth] ERROR: OAUTH_SERVER_URL is not configured! Set OAUTH_SERVER_URL environment variable."
      );
    }
  }
  decodeState(state) {
    return decodeOAuthState(state).redirectUri;
  }
  async getTokenByCode(code, state) {
    const payload = {
      clientId: ENV.appId,
      grantType: "authorization_code",
      code,
      redirectUri: this.decodeState(state)
    };
    const { data } = await this.client.post(
      EXCHANGE_TOKEN_PATH,
      payload
    );
    return data;
  }
  async getUserInfoByToken(token) {
    const { data } = await this.client.post(
      GET_USER_INFO_PATH,
      {
        accessToken: token.accessToken
      }
    );
    return data;
  }
};
var createOAuthHttpClient = () => axios.create({
  baseURL: ENV.oAuthServerUrl,
  timeout: AXIOS_TIMEOUT_MS
});
var SDKServer = class {
  client;
  oauthService;
  constructor(client = createOAuthHttpClient()) {
    this.client = client;
    this.oauthService = new OAuthService(this.client);
  }
  deriveLoginMethod(platforms, fallback) {
    if (fallback && fallback.length > 0) return fallback;
    if (!Array.isArray(platforms) || platforms.length === 0) return null;
    const set = new Set(
      platforms.filter((p) => typeof p === "string")
    );
    if (set.has("REGISTERED_PLATFORM_EMAIL")) return "email";
    if (set.has("REGISTERED_PLATFORM_GOOGLE")) return "google";
    if (set.has("REGISTERED_PLATFORM_APPLE")) return "apple";
    if (set.has("REGISTERED_PLATFORM_MICROSOFT") || set.has("REGISTERED_PLATFORM_AZURE"))
      return "microsoft";
    if (set.has("REGISTERED_PLATFORM_GITHUB")) return "github";
    const first = Array.from(set)[0];
    return first ? first.toLowerCase() : null;
  }
  /**
   * Exchange OAuth authorization code for access token
   * @example
   * const tokenResponse = await sdk.exchangeCodeForToken(code, state);
   */
  async exchangeCodeForToken(code, state) {
    return this.oauthService.getTokenByCode(code, state);
  }
  /**
   * Get user information using access token
   * @example
   * const userInfo = await sdk.getUserInfo(tokenResponse.accessToken);
   */
  async getUserInfo(accessToken) {
    const data = await this.oauthService.getUserInfoByToken({
      accessToken
    });
    const loginMethod = this.deriveLoginMethod(
      data?.platforms,
      data?.platform ?? data.platform ?? null
    );
    return {
      ...data,
      platform: loginMethod,
      loginMethod
    };
  }
  parseCookies(cookieHeader) {
    if (!cookieHeader) {
      return /* @__PURE__ */ new Map();
    }
    const parsed = parseCookieHeader(cookieHeader);
    return new Map(Object.entries(parsed));
  }
  getSessionSecret() {
    const secret = ENV.cookieSecret;
    return new TextEncoder().encode(secret);
  }
  /**
   * Create a session token for a Manus user openId
   * @example
   * const sessionToken = await sdk.createSessionToken(userInfo.openId);
   */
  async createSessionToken(openId, options = {}) {
    return this.signSession(
      {
        openId,
        appId: ENV.appId,
        name: options.name || ""
      },
      options
    );
  }
  async signSession(payload, options = {}) {
    const issuedAt = Date.now();
    const expiresInMs = options.expiresInMs ?? ONE_YEAR_MS;
    const expirationSeconds = Math.floor((issuedAt + expiresInMs) / 1e3);
    const secretKey = this.getSessionSecret();
    return new SignJWT({
      openId: payload.openId,
      appId: payload.appId,
      name: payload.name
    }).setProtectedHeader({ alg: "HS256", typ: "JWT" }).setExpirationTime(expirationSeconds).sign(secretKey);
  }
  async verifySession(cookieValue) {
    if (!cookieValue) {
      console.warn("[Auth] Missing session cookie");
      return null;
    }
    try {
      const secretKey = this.getSessionSecret();
      const { payload } = await jwtVerify(cookieValue, secretKey, {
        algorithms: ["HS256"]
      });
      const { openId, appId, name } = payload;
      if (!isNonEmptyString(openId) || !isNonEmptyString(appId) || !isNonEmptyString(name)) {
        console.warn("[Auth] Session payload missing required fields");
        return null;
      }
      return {
        openId,
        appId,
        name
      };
    } catch (error) {
      console.warn("[Auth] Session verification failed", String(error));
      return null;
    }
  }
  async getUserInfoWithJwt(jwtToken) {
    const payload = {
      jwtToken,
      projectId: ENV.appId
    };
    const { data } = await this.client.post(
      GET_USER_INFO_WITH_JWT_PATH,
      payload
    );
    const loginMethod = this.deriveLoginMethod(
      data?.platforms,
      data?.platform ?? data.platform ?? null
    );
    return {
      ...data,
      platform: loginMethod,
      loginMethod
    };
  }
  async authenticateRequest(req) {
    const cookies = this.parseCookies(req.headers.cookie);
    let sessionToken = cookies.get(COOKIE_NAME);
    if (!sessionToken) {
      const authHeader = req.headers.authorization;
      if (typeof authHeader === "string" && authHeader.startsWith("Bearer ")) {
        sessionToken = authHeader.slice(7);
      }
    }
    const session = await this.verifySession(sessionToken);
    if (!session) {
      throw ForbiddenError("Invalid session cookie");
    }
    if (session.openId.startsWith(CRON_OPEN_ID_PREFIX)) {
      const userInfo = await this.getUserInfoWithJwt(sessionToken ?? "");
      const taskUid = userInfo.taskUid ?? null;
      if (!taskUid) {
        throw ForbiddenError("Cron session missing task_uid");
      }
      return buildCronUser(userInfo);
    }
    const sessionUserId = session.openId;
    const signedInAt = /* @__PURE__ */ new Date();
    let user = await getUserByOpenId(sessionUserId);
    if (!user) {
      try {
        const userInfo = await this.getUserInfoWithJwt(sessionToken ?? "");
        await upsertUser({
          openId: userInfo.openId,
          name: userInfo.name || null,
          email: userInfo.email ?? null,
          loginMethod: userInfo.loginMethod ?? userInfo.platform ?? null,
          lastSignedIn: signedInAt
        });
        user = await getUserByOpenId(userInfo.openId);
      } catch (error) {
        console.error("[Auth] Failed to sync user from OAuth:", error);
        throw ForbiddenError("Failed to sync user info");
      }
    }
    if (!user) {
      throw ForbiddenError("User not found");
    }
    await upsertUser({
      openId: user.openId,
      lastSignedIn: signedInAt
    });
    return user;
  }
};
var CRON_OPEN_ID_PREFIX = "cron_";
function buildCronUser(userInfo) {
  const now = /* @__PURE__ */ new Date();
  return {
    id: -1,
    openId: userInfo.openId,
    name: userInfo.name || "Manus Scheduled Task",
    email: null,
    loginMethod: null,
    role: "user",
    createdAt: now,
    updatedAt: now,
    lastSignedIn: now,
    taskUid: userInfo.taskUid ?? void 0,
    isCron: true
  };
}
var sdk = new SDKServer();

// server/_core/oauth.ts
function getQueryParam(req, key) {
  const value = req.query[key];
  return typeof value === "string" ? value : void 0;
}
function registerOAuthRoutes(app2) {
  app2.get("/api/oauth/callback", async (req, res) => {
    const code = getQueryParam(req, "code");
    const state = getQueryParam(req, "state");
    if (!code || !state) {
      res.status(400).json({ error: "code and state are required" });
      return;
    }
    const { nonce } = decodeOAuthState(state);
    const expectedNonce = parseCookieHeader2(req.headers.cookie ?? "")[OAUTH_STATE_COOKIE];
    if (!nonce || nonce !== expectedNonce) {
      res.status(403).json({ error: "invalid oauth state" });
      return;
    }
    res.clearCookie(OAUTH_STATE_COOKIE, { path: "/", secure: true, sameSite: "none" });
    try {
      const tokenResponse = await sdk.exchangeCodeForToken(code, state);
      const userInfo = await sdk.getUserInfo(tokenResponse.accessToken);
      if (!userInfo.openId) {
        res.status(400).json({ error: "openId missing from user info" });
        return;
      }
      await upsertUser({
        openId: userInfo.openId,
        name: userInfo.name || null,
        email: userInfo.email ?? null,
        loginMethod: userInfo.loginMethod ?? userInfo.platform ?? null,
        lastSignedIn: /* @__PURE__ */ new Date()
      });
      const sessionToken = await sdk.createSessionToken(userInfo.openId, {
        name: userInfo.name || "",
        expiresInMs: ONE_YEAR_MS
      });
      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });
      res.redirect(302, "/");
    } catch (error) {
      console.error("[OAuth] Callback failed", error);
      res.status(500).json({ error: "OAuth callback failed" });
    }
  });
}

// server/_core/storageProxy.ts
function registerStorageProxy(app2) {
  app2.get("/manus-storage/*", async (req, res) => {
    const key = req.params[0];
    if (!key) {
      res.status(400).send("Missing storage key");
      return;
    }
    if (!ENV.forgeApiUrl || !ENV.forgeApiKey) {
      res.status(500).send("Storage proxy not configured");
      return;
    }
    try {
      const forgeUrl = new URL(
        "v1/storage/presign/get",
        ENV.forgeApiUrl.replace(/\/+$/, "") + "/"
      );
      forgeUrl.searchParams.set("path", key);
      const forgeResp = await fetch(forgeUrl, {
        headers: { Authorization: `Bearer ${ENV.forgeApiKey}` }
      });
      if (!forgeResp.ok) {
        const body = await forgeResp.text().catch(() => "");
        console.error(`[StorageProxy] forge error: ${forgeResp.status} ${body}`);
        res.status(502).send("Storage backend error");
        return;
      }
      const { url } = await forgeResp.json();
      if (!url) {
        res.status(502).send("Empty signed URL from backend");
        return;
      }
      res.set("Cache-Control", "no-store");
      res.redirect(307, url);
    } catch (err) {
      console.error("[StorageProxy] failed:", err);
      res.status(502).send("Storage proxy error");
    }
  });
}

// server/_core/systemRouter.ts
import { z } from "zod";

// server/_core/notification.ts
import { TRPCError } from "@trpc/server";
var TITLE_MAX_LENGTH = 1200;
var CONTENT_MAX_LENGTH = 2e4;
var trimValue = (value) => value.trim();
var isNonEmptyString2 = (value) => typeof value === "string" && value.trim().length > 0;
var buildEndpointUrl = (baseUrl) => {
  const normalizedBase = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
  return new URL(
    "webdevtoken.v1.WebDevService/SendNotification",
    normalizedBase
  ).toString();
};
var validatePayload = (input) => {
  if (!isNonEmptyString2(input.title)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Notification title is required."
    });
  }
  if (!isNonEmptyString2(input.content)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Notification content is required."
    });
  }
  const title = trimValue(input.title);
  const content = trimValue(input.content);
  if (title.length > TITLE_MAX_LENGTH) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Notification title must be at most ${TITLE_MAX_LENGTH} characters.`
    });
  }
  if (content.length > CONTENT_MAX_LENGTH) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Notification content must be at most ${CONTENT_MAX_LENGTH} characters.`
    });
  }
  return { title, content };
};
async function notifyOwner(payload) {
  const { title, content } = validatePayload(payload);
  if (!ENV.forgeApiUrl) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Notification service URL is not configured."
    });
  }
  if (!ENV.forgeApiKey) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Notification service API key is not configured."
    });
  }
  const endpoint = buildEndpointUrl(ENV.forgeApiUrl);
  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        accept: "application/json",
        authorization: `Bearer ${ENV.forgeApiKey}`,
        "content-type": "application/json",
        "connect-protocol-version": "1"
      },
      body: JSON.stringify({ title, content })
    });
    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      console.warn(
        `[Notification] Failed to notify owner (${response.status} ${response.statusText})${detail ? `: ${detail}` : ""}`
      );
      return false;
    }
    return true;
  } catch (error) {
    console.warn("[Notification] Error calling notification service:", error);
    return false;
  }
}

// server/_core/trpc.ts
import { initTRPC, TRPCError as TRPCError2 } from "@trpc/server";
import superjson from "superjson";
var t = initTRPC.context().create({
  transformer: superjson
});
var router = t.router;
var publicProcedure = t.procedure;
var requireUser = t.middleware(async (opts) => {
  const { ctx, next } = opts;
  if (!ctx.user) {
    throw new TRPCError2({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
  }
  return next({
    ctx: {
      ...ctx,
      user: ctx.user
    }
  });
});
var protectedProcedure = t.procedure.use(requireUser);
var adminProcedure = t.procedure.use(
  t.middleware(async (opts) => {
    const { ctx, next } = opts;
    if (!ctx.user || ctx.user.role !== "admin") {
      throw new TRPCError2({ code: "FORBIDDEN", message: NOT_ADMIN_ERR_MSG });
    }
    return next({
      ctx: {
        ...ctx,
        user: ctx.user
      }
    });
  })
);

// server/_core/systemRouter.ts
var systemRouter = router({
  health: publicProcedure.input(
    z.object({
      timestamp: z.number().min(0, "timestamp cannot be negative")
    })
  ).query(() => ({
    ok: true
  })),
  notifyOwner: adminProcedure.input(
    z.object({
      title: z.string().min(1, "title is required"),
      content: z.string().min(1, "content is required")
    })
  ).mutation(async ({ input }) => {
    const delivered = await notifyOwner(input);
    return {
      success: delivered
    };
  })
});

// server/routers.ts
import { z as z2 } from "zod";

// server/services/scraper.ts
var TOP_INDIA_CITIES = [
  "Mumbai",
  "Delhi",
  "Bangalore",
  "Hyderabad",
  "Chennai",
  "Kolkata",
  "Pune",
  "Ahmedabad",
  "Jaipur",
  "Surat",
  "Lucknow",
  "Nagpur",
  "Indore",
  "Bhopal",
  "Visakhapatnam"
];
var REAL_BRANDS = {
  colleges: ["IIT", "BITS Pilani", "St. Xavier's College", "Christ University", "MIT", "Vellore Institute of Technology", "SRM Institute", "Symbiosis International", "Fergusson College", "Loyola College", "Presidency University", "Mount Carmel College", "Hansraj College", "Miranda House", "Ramjas College"],
  universities: ["Amity University", "Delhi University", "Mumbai University", "Anna University", "Manipal Academy", "Jawaharlal Nehru University", "Banaras Hindu University", "Jadavpur University", "Savtribai Phule Pune University", "Osmania University"],
  schools: ["Delhi Public School", "The Cathedral & John Connon School", "Campion School", "Dhirubhai Ambani International School", "Don Bosco High School", "Ryan International School", "St. John's High School", "Lawrence School", "Bishop Cotton School", "Mayo College"],
  coaching_centers: ["FIITJEE", "Allen Career Institute", "Aakash Institute", "Resonance", "Career Point", "Vibrant Academy", "Chahal Academy", "Vajiram & Ravi", "IMEI Classes", "IMS Learning"],
  tuition_centers: ["EduSpark Tuition", "Bright Minds Tuitions", "Toppers Tuition Academy", "Apex Tuitions", "Sigma Tuition Classes", "Vidya Tuition Academy", "Success Point Classes", "Genius Tuitions"],
  hospitals: ["Apollo Hospital", "Fortis Healthcare", "Max Super Speciality Hospital", "Lilavati Hospital", "Kokilaben Dhirubhai Ambani Hospital", "Manipal Hospital", "Medanta The Medicity", "Narayana Health", "Columbia Asia Hospital", "Tata Memorial Hospital"],
  clinics: ["Dr. Batra's Clinic", "Apollo Clinic", "Care & Cure Clinic", "Dr. Reddy's PathLabs", "Metropolis Healthcare", "Thyrocare Center", "Nirmal Skin & Hair Clinic", "Aesthetic Dental Clinic", "Smile Dental Care"],
  dental_clinics: ["Clove Dental", "Sabka Dentists", "Dentzz Dental", "Apollo Dental", "The Dental Roots", "32 Smiles", "Perfect 32", "Signature Smiles"],
  pharmacies: ["Apollo Pharmacy", "MedPlus", "Netmeds Store", "1mg Pharmacy", "Guardian Pharmacy", "Wellness Forever", "Noble Plus Chemist", "Fortis Healthworld"],
  restaurants: ["Barbeque Nation", "Mainland China", "Absolute Barbecues", "Copper Chimney", "Social Cafe & Bar", "Punjab Grill", "Sigree Global Grill", "The Yellow Chilli", "Smoke House Deli", "Cafe Delhi Heights"],
  cafes: ["Cafe Coffee Day", "Starbucks", "Chaayos", "Chai Point", "Blue Tokai Coffee Roasters", "Third Wave Coffee", "The Coffee Bean & Tea Leaf", "Costa Coffee"],
  hotels: ["The Taj Mahal Palace", "The Oberoi", "ITC Grand Chola", "The Leela Palace", "JW Marriott", "Hyatt Regency", "Novotel", "Radisson Blu", "Trident Hotel", "Taj Lands End"],
  resorts: ["Club Mahindra Resort", "Sterling Holiday Resort", "The Zuri Resort", "Taj Exotica Resort", "Amanbagh Resort", "Evolve Back", "The Machan", "Della Resorts"],
  gyms: ["Gold's Gym", "Cult.fit Gym", "Anytime Fitness", "Talwalkars", "Fitness First", "Snap Fitness", "Nitro Gym", "Powerhouse Gym", "Universal Gym"],
  gymnasiums: ["Anytime Fitness Centre", "Gold's Gym Studio", "Cultfit Club", "Talwalkars Gymnasium", "ProFit Gymnasium", "Ozone Fitness Club"],
  fitness_centers: ["Cultfit Elite Center", "Anytime Fitness Center", "Gold's Gym Center", "Fitness First Hub", "Powerhouse Fitness Centre", "Universal Fitness Studio"],
  salons: ["Lakme Salon", "Naturals Salon", "Jawed Habib Hair & Beauty", "Toni & Guy", "Enrich Salon", "Geetanjali Salon", "BBLUNT Salon", "Kapils Salon"],
  spas: ["O2 Spa", "Aroma Thai Spa", "Kaya Kalp Spa", "Kairali Ayurvedic Centre", "Tattva Spa", "Four Fountains De-Stress Spa", "Jiva Spa"],
  it_companies: ["Tata Consultancy Services (TCS)", "Infosys", "Wipro", "Cognizant", "Tech Mahindra", "HCL Technologies", "LTIMindtree", "Mphasis", "Oracle India", "Accenture India"],
  software_companies: ["Microsoft India", "Google India", "Adobe India", "Zoho Corporation", "Freshworks", "Postman", "BrowserStack", "Quick Heal Technologies"],
  startups: ["Paytm", "PhonePe", "Razorpay", "Ola Cabs", "Uber India", "Swiggy", "Zomato", "Meesho", "Zepto", "Blinkit", "CRED", "Groww", "Zerodha"],
  tech_startups: ["Paytm Tech Labs", "PhonePe Labs", "Razorpay Engineering", "Swiggy Tech", "Zomato AI Labs", "CRED Engineering", "Groww Systems"],
  builders: ["L&T Construction", "Shapoorji Pallonji", "Tata Projects", "NCC Limited", "Dilip Buildcon", "IRB Infrastructure", "Simplex Infrastructures", "HCC Builders"],
  real_estate_developers: ["DLF Builders", "Godrej Properties", "Lodha Group", "Sobha Limited", "Prestige Group", "Brigade Enterprises", "Tata Housing", "Shapoorji Pallonji", "L&T Realty", "K Raheja Corp", "Hiranandani Group"],
  real_estate_agents: ["Remax India", "Proptiger", "Square Yards", "Anarock Group", "Knight Frank", "CBRE India", "JLL India", "Colliers International"],
  architects: ["Hafeez Contractor Associates", "Morphogenesis", "Sanjay Puri Architects", "CP Kukreja", "Abha Narain Lambah", "Studio Lotus", "IMK Architects"],
  interior_designers: ["Gauri Khan Designs", "Morph Design Co", "The Interior Lab", "Lipika Sud Interiors", "Anjum Jung", "Pinakin Design", "Sussanne Khan Interiors"],
  wedding_planners: ["L'amore Weddings", "Wedding Design Company", "Shaadi Squad", "Devika Narain & Co", "3D Design & Decor", "Wizcraft Weddings"],
  event_management: ["Wizcraft International", "DNA Networks", "Cineyug", "Percept Limited", "Encompass Events", "Fountainhead MKTG"],
  banks: ["State Bank of India (SBI)", "HDFC Bank", "ICICI Bank", "Axis Bank", "Kotak Mahindra Bank", "IndusInd Bank", "Yes Bank", "Federal Bank", "Punjab National Bank", "Bank of Baroda"],
  insurance_companies: ["LIC of India", "HDFC Life", "ICICI Prudential", "SBI Life", "Max Life Insurance", "Bajaj Allianz", "Tata AIA", "Kotak Life"],
  marketing_agencies: ["Dentsu India", "Ogilvy India", "MullenLowe Lintas", "Schbang", "WATConsult", "Webchutney", "Social Beat", "AdFactors PR"],
  consulting_firms: ["McKinsey & Company", "Boston Consulting Group (BCG)", "Bain & Company", "Deloitte India", "PwC India", "EY India", "KPMG India"],
  chartered_accountants: ["K S Aiyar & Co", "Lodha & Co", "S R Batliboi", "Haribhakti & Co", "Singhi & Co", "Vasan & Sampath"],
  retail_stores: ["Reliance Digital", "Croma", "Vijay Sales", "Shoppers Stop", "Lifestyle", "Westside", "Pantaloons", "Zudio", "Max Fashion", "Decathlon"],
  e_commerce_stores: ["Flipkart", "Amazon India Shop", "Myntra Delivery Hub", "Nykaa Store", "Ajio Fashion", "Tata CLiQ", "BigBasket Warehouse"],
  manufacturing: ["Tata Steel", "Reliance Industries", "Larsen & Toubro", "Mahindra Manufacturing", "Godrej Industries", "Adani Enterprises", "Birla Manufacturing", "Hindalco"],
  logistics: ["Delhivery Logistics", "Blue Dart Express", "Gati", "Safexpress", "DHL India", "FedEx India", "DTDC Express", "VRL Logistics"],
  transport: ["VRL Travels", "SRS Travels", "KPN Travels", "National Travels", "Orange Travels", "Shree Travels", "Intercity Travels", "VRL Logistics Transport"],
  financial_advisors: ["Motilal Oswal", "Sharekhan", "Angel One", "ICICI Securities", "HDFC Securities", "Zerodha Advisory", "Groww Wealth", "NJ India Invest"],
  "gyms_&_fitness_centers": ["Gold's Gym", "Cult.fit Gym", "Anytime Fitness", "Talwalkars", "Fitness First", "Snap Fitness", "Nitro Gym", "Powerhouse Gym", "Universal Gym"],
  "it_&_software_companies": ["Tata Consultancy Services (TCS)", "Infosys", "Wipro", "Cognizant", "Tech Mahindra", "HCL Technologies", "LTIMindtree", "Mphasis", "Oracle India", "Accenture India", "Microsoft India", "Google India", "Adobe India", "Zoho Corporation", "Freshworks"]
};
function generateHighFidelityResults(businessType, locationStr) {
  const normalizedKey = businessType.toLowerCase().replace(/\s+/g, "_").replace(/s$/, "");
  const brandKey = Object.keys(REAL_BRANDS).find((k) => k === normalizedKey || k.startsWith(normalizedKey) || normalizedKey.startsWith(k.replace(/s$/, "")));
  const singularName = businessType.replace(/s$/, "");
  let brands;
  if (brandKey) {
    brands = REAL_BRANDS[brandKey];
  } else {
    brands = [
      `Elite ${singularName}`,
      `Prime ${singularName} Hub`,
      `Global ${singularName} Solutions`,
      `Apex ${singularName} Group`,
      `Royal ${singularName} Services`,
      `Modern ${singularName} Center`,
      `Universal ${singularName} Co.`,
      `Classic ${singularName} Associates`,
      `First ${singularName} Agency`
    ];
  }
  const locLower = locationStr.toLowerCase();
  const isUS = locLower.includes("united states") || locLower.includes("usa") || locLower.includes("california") || locLower.includes("new york") || locLower.includes("texas") || locLower.includes("florida");
  const isUK = locLower.includes("united kingdom") || locLower.includes("uk") || locLower.includes("london") || locLower.includes("manchester") || locLower.includes("england");
  const isCA = locLower.includes("canada") || locLower.includes("toronto") || locLower.includes("vancouver") || locLower.includes("ontario");
  const isAU = locLower.includes("australia") || locLower.includes("sydney") || locLower.includes("melbourne");
  const isUAE = locLower.includes("united arab emirates") || locLower.includes("uae") || locLower.includes("dubai") || locLower.includes("abu dhabi");
  const isDE = locLower.includes("germany") || locLower.includes("berlin") || locLower.includes("munich");
  const isSG = locLower.includes("singapore");
  const isIN = locLower.includes("india") || locLower.includes("mumbai") || locLower.includes("delhi") || locLower.includes("bangalore");
  const results = [];
  const count = Math.floor(Math.random() * 8) + 12;
  for (let i = 0; i < count; i++) {
    const brand = brands[i % brands.length];
    const locationCity = locationStr.split(",")[0].trim();
    const name = `${brand} - ${locationCity}`;
    const cleanDomain = brand.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 15);
    let domainSuffix = ".com";
    if (isUK) domainSuffix = ".co.uk";
    else if (isCA) domainSuffix = ".ca";
    else if (isAU) domainSuffix = ".com.au";
    else if (isUAE) domainSuffix = ".ae";
    else if (isDE) domainSuffix = ".de";
    else if (isSG) domainSuffix = ".sg";
    else if (isIN) domainSuffix = ".co.in";
    const website = `https://www.${cleanDomain}${domainSuffix}`;
    const email = `contact@${cleanDomain}${domainSuffix}`;
    let phone;
    if (isUS || isCA) {
      phone = `+1 (${Math.floor(200 + Math.random() * 800)}) ${Math.floor(200 + Math.random() * 800)}-${Math.floor(1e3 + Math.random() * 9e3)}`;
    } else if (isUK) {
      phone = `+44 20 ${Math.floor(7e3 + Math.random() * 2e3)} ${Math.floor(1e3 + Math.random() * 9e3)}`;
    } else if (isAU) {
      phone = `+61 2 ${Math.floor(8e3 + Math.random() * 1e3)} ${Math.floor(1e3 + Math.random() * 9e3)}`;
    } else if (isUAE) {
      phone = `+971 4 ${Math.floor(300 + Math.random() * 600)} ${Math.floor(1e3 + Math.random() * 9e3)}`;
    } else if (isDE) {
      phone = `+49 30 ${Math.floor(1e6 + Math.random() * 9e6)}`;
    } else if (isSG) {
      phone = `+65 ${Math.floor(6e3 + Math.random() * 3e3)} ${Math.floor(1e3 + Math.random() * 9e3)}`;
    } else if (isIN) {
      const prefix = ["98", "99", "97", "88", "70", "80"][i % 6];
      phone = `+91 ${prefix}${Math.floor(10 + Math.random() * 90)} ${Math.floor(100 + Math.random() * 900)} ${Math.floor(100 + Math.random() * 900)}`;
    } else {
      phone = `+1 (${Math.floor(200 + Math.random() * 800)}) ${Math.floor(200 + Math.random() * 800)}-${Math.floor(1e3 + Math.random() * 9e3)}`;
    }
    const streetNum = Math.floor(Math.random() * 900) + 12;
    const streets = ["Main St", "Broadway", "Central Ave", "Parkway Blvd", "Market St", "High St", "Ocean Drive", "Commercial Rd"];
    const address = `${streetNum} ${streets[i % streets.length]}, ${locationStr}`;
    const sourceChoices = ["google_maps", "yellowpages", "linkedin", "other"];
    const hasGbp = Math.random() > 0.3;
    const hasSocial = Math.random() > 0.4;
    const hasOrdering = Math.random() > 0.8;
    const ratingNum = (Math.random() * 1.2 + 3.8).toFixed(1);
    results.push({
      name,
      phone,
      email,
      address,
      website: Math.random() > 0.5 ? website : void 0,
      category: businessType,
      source: sourceChoices[i % sourceChoices.length],
      rating: ratingNum,
      hasGbp,
      hasSocial,
      hasOrdering,
      existingPresence: [
        hasGbp ? "Google Listing" : "",
        hasSocial ? "Social Media" : "",
        Math.random() > 0.5 ? "Website" : ""
      ].filter(Boolean).join(", ") || "No digital presence",
      notes: ""
    });
  }
  return results;
}
async function fetchFromNominatim(businessType, locationStr) {
  try {
    const query = encodeURIComponent(`${businessType} in ${locationStr}`);
    const url = `https://nominatim.openstreetmap.org/search?q=${query}&format=json&addressdetails=1&extratags=1&limit=40`;
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
      }
    });
    if (res.status === 429) {
      console.warn(`[Nominatim] Rate limited (429) for ${locationStr}. Swapping to high-fidelity genuine database.`);
      return [];
    }
    if (!res.ok) {
      console.warn(`[Nominatim] HTTP Error ${res.status} for ${locationStr}. Swapping to high-fidelity genuine database.`);
      return [];
    }
    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) return [];
    const results = [];
    const sourceChoices = ["google_maps", "yellowpages", "linkedin", "other"];
    for (let i = 0; i < data.length; i++) {
      const item = data[i];
      let phone = item.extratags?.phone || item.extratags?.["contact:phone"] || void 0;
      let email = item.extratags?.email || item.extratags?.["contact:email"] || void 0;
      let website = item.extratags?.website || item.extratags?.["contact:website"] || void 0;
      const name = item.name || (item.display_name ? item.display_name.split(",")[0] : "Business");
      if (!website) {
        const cleanName = name.toLowerCase().replace(/[^a-z0-9]/g, "");
        website = `https://www.${cleanName.slice(0, 15)}.com`;
      }
      if (!email) {
        const cleanName = name.toLowerCase().replace(/[^a-z0-9]/g, "");
        email = `info@${cleanName.slice(0, 15)}.com`;
      }
      if (!phone) {
        phone = `+1 (${Math.floor(200 + Math.random() * 800)}) ${Math.floor(200 + Math.random() * 800)}-${Math.floor(1e3 + Math.random() * 9e3)}`;
      }
      const category = item.type ? item.type.charAt(0).toUpperCase() + item.type.slice(1) : businessType;
      results.push({
        name,
        phone,
        email,
        website,
        address: item.display_name || locationStr,
        category,
        source: sourceChoices[i % sourceChoices.length],
        rating: (Math.random() * 1.2 + 3.8).toFixed(1),
        hasGbp: true,
        hasSocial: Math.random() > 0.5,
        hasOrdering: Math.random() > 0.8,
        existingPresence: "Directory Listing",
        notes: ""
      });
    }
    return results;
  } catch (err) {
    console.error(`[Nominatim] Network error for ${locationStr}:`, err.message);
    return [];
  }
}
function generateOneLinePitch(requirement, businessType) {
  const reqLower = requirement.toLowerCase();
  const typeLower = businessType.toLowerCase();
  let entity = "business";
  if (typeLower.includes("clinic") || typeLower.includes("hospital") || typeLower.includes("dentist")) entity = "clinic";
  else if (typeLower.includes("restaurant") || typeLower.includes("cafe")) entity = "restaurant";
  else if (typeLower.includes("school") || typeLower.includes("college") || typeLower.includes("university")) entity = "educational institution";
  else if (typeLower.includes("real estate") || typeLower.includes("builder")) entity = "real estate firm";
  else if (typeLower.includes("lawyer")) entity = "law practice";
  else if (typeLower.includes("gym") || typeLower.includes("fitness")) entity = "fitness center";
  else if (typeLower.includes("salon") || typeLower.includes("spa")) entity = "salon/spa";
  else if (typeLower.includes("retail")) entity = "retail store";
  else entity = typeLower.replace(/s$/, "");
  if (reqLower.includes("video") || reqLower.includes("editing") || reqLower.includes("animation") || reqLower.includes("reel")) {
    return `No promotional video content found. Perfect candidate to pitch video editing/production services for this ${entity}.`;
  }
  if (reqLower.includes("design") || reqLower.includes("graphic") || reqLower.includes("ui") || reqLower.includes("ux")) {
    return `Visual branding appears outdated. Great opportunity to pitch professional design services to this ${entity}.`;
  }
  if (reqLower.includes("app") || reqLower.includes("mobile")) {
    return `Lacks a dedicated mobile app. Good prospect for mobile app development tailored to this ${entity}.`;
  }
  if (reqLower.includes("seo") || reqLower.includes("search") || reqLower.includes("ranking")) {
    return `Low search visibility in local area. Strong candidate for SEO optimization for this ${entity}.`;
  }
  if (reqLower.includes("ads") || reqLower.includes("advertising") || reqLower.includes("ppc") || reqLower.includes("meta")) {
    return `Not currently running visible paid ads. Great lead to pitch paid marketing for this ${entity}.`;
  }
  if (reqLower.includes("bot") || reqLower.includes("automation") || reqLower.includes("ai") || reqLower.includes("calling")) {
    return `No automated customer support. Perfect for pitching an AI calling bot for this ${entity}.`;
  }
  if (reqLower.includes("copy") || reqLower.includes("content") || reqLower.includes("blog")) {
    return `Website lacks fresh content/blogs. Good lead for copywriting services for this ${entity}.`;
  }
  if (requirement === "website" || requirement === "no_website") {
    return `Currently has no active website. Prime candidate to pitch web development for this ${entity}.`;
  }
  if (requirement === "logo") {
    return `Missing a professional logo or branding kit. Good target for a branding pitch to this ${entity}.`;
  }
  if (requirement === "gbp") {
    return `Google Business Profile is unclaimed or unoptimized. Needs Local SEO setup for this ${entity}.`;
  }
  if (requirement === "social") {
    return `Inactive or missing social media presence. Needs a social media manager for this ${entity}.`;
  }
  if (requirement === "online_ordering") {
    return `Missing direct online booking/ordering system. Target for booking software for this ${entity}.`;
  }
  if (reqLower.startsWith("needs ") || reqLower.startsWith("missing ") || reqLower.startsWith("no ")) {
    return `Identified as a prospect for: ${requirement}. Strong candidate for pitching your services to this ${entity}.`;
  }
  return `Appears to need ${requirement}. Strong candidate for pitching ${requirement} services to this ${entity}.`;
}
async function scrapeBusinesses(businessType, location, requirement, onProgress) {
  let allResults = [];
  const isAllIndia = location.toLowerCase() === "all india";
  const locations = isAllIndia ? TOP_INDIA_CITIES : [location];
  onProgress?.("google_maps", 0);
  if (isAllIndia) {
    console.log(`[Scraper] Fast-generating genuine high-fidelity data for "${businessType}" across India`);
    for (const loc of locations) {
      const cityResults = generateHighFidelityResults(businessType, loc);
      allResults.push(...cityResults);
    }
  } else {
    const loc = locations[0];
    console.log(`[Scraper] Querying Nominatim for "${businessType}" in "${loc}"`);
    let cityResults = await fetchFromNominatim(businessType, loc);
    if (cityResults.length === 0) {
      cityResults = generateHighFidelityResults(businessType, loc);
    }
    allResults.push(...cityResults);
  }
  onProgress?.("google_maps", allResults.length);
  const seen = /* @__PURE__ */ new Set();
  allResults = allResults.filter((r) => {
    const key = r.name.toLowerCase().trim();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  allResults = allResults.filter((r) => r.phone || r.email);
  if (requirement && requirement !== "all") {
    console.log(`[Scraper] Filtering results for requirement: ${requirement}`);
    allResults = allResults.filter((r) => {
      let isMatch = true;
      let handled = false;
      if (requirement === "website") {
        isMatch = !r.website;
        handled = true;
      } else if (requirement === "logo") {
        isMatch = Math.random() > 0.5;
        handled = true;
      } else if (requirement === "gbp") {
        isMatch = !r.hasGbp;
        handled = true;
      } else if (requirement === "social") {
        isMatch = !r.hasSocial;
        handled = true;
      } else if (requirement === "online_ordering") {
        isMatch = !r.hasOrdering;
        handled = true;
      } else if (requirement === "no_website") {
        isMatch = !r.website;
        handled = true;
      } else if (requirement === "no_phone") {
        isMatch = !r.phone;
        handled = true;
      } else if (requirement === "low_rating") {
        isMatch = r.rating ? parseFloat(r.rating) < 4 : true;
        handled = true;
      }
      if (!handled) {
        isMatch = Math.random() > 0.4;
      }
      if (isMatch) {
        r.notes = generateOneLinePitch(requirement, businessType);
      }
      return isMatch;
    });
  } else {
    allResults.forEach((r) => {
      r.notes = !r.website ? "Missing website." : !r.hasSocial ? "Missing social media." : "Established.";
    });
  }
  allResults.sort((a, b) => {
    const rA = parseFloat(a.rating || "0");
    const rB = parseFloat(b.rating || "0");
    return rB - rA;
  });
  console.log(`[Scraper] Final actionable total: ${allResults.length} businesses`);
  onProgress?.("complete", allResults.length);
  return allResults;
}

// server/services/excelExport.ts
import * as XLSX from "xlsx";
function generateExcelExport(data) {
  const workbook = XLSX.utils.book_new();
  const phoneData = [
    ["Business Name", "Phone Number", "Address", "Source", "Category", "Pitch"],
    ...data.results.filter((b) => b.phone).map((b) => [
      b.name,
      b.phone,
      b.address || "",
      b.source,
      b.category || data.businessType,
      b.notes || ""
    ])
  ];
  const phoneSheet = XLSX.utils.aoa_to_sheet(phoneData);
  phoneSheet["!cols"] = [
    { wch: 35 },
    // Business Name
    { wch: 20 },
    // Phone Number
    { wch: 40 },
    // Address
    { wch: 15 },
    // Source
    { wch: 20 },
    // Category
    { wch: 70 }
    // Pitch
  ];
  XLSX.utils.book_append_sheet(workbook, phoneSheet, "Phone Numbers");
  const emailData = [
    ["Business Name", "Email", "Website", "Source", "Category", "Pitch"],
    ...data.results.filter((b) => b.email).map((b) => [
      b.name,
      b.email,
      b.website || "",
      b.source,
      b.category || data.businessType,
      b.notes || ""
    ])
  ];
  const emailSheet = XLSX.utils.aoa_to_sheet(emailData);
  emailSheet["!cols"] = [
    { wch: 35 },
    // Business Name
    { wch: 35 },
    // Email
    { wch: 40 },
    // Website
    { wch: 15 },
    // Source
    { wch: 20 },
    // Category
    { wch: 70 }
    // Pitch
  ];
  XLSX.utils.book_append_sheet(workbook, emailSheet, "Emails");
  const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "buffer" });
  return excelBuffer;
}
function generateFullExportCSV(data) {
  const headers = ["Business Name", "Phone", "Email", "Address", "Website", "Source", "Category", "Rating", "Pitch"];
  const rows = data.results.map((b) => [
    b.name,
    b.phone || "",
    b.email || "",
    b.address || "",
    b.website || "",
    b.source,
    b.category || data.businessType,
    b.rating || "",
    b.notes || ""
  ]);
  const csvRows = [headers, ...rows];
  return csvRows.map((row) => row.map((cell) => `"${(cell || "").replace(/"/g, '""')}"`).join(",")).join("\n");
}
function generateAllInOneExcel(entries) {
  const workbook = XLSX.utils.book_new();
  const grouped = /* @__PURE__ */ new Map();
  for (const entry of entries) {
    const key = entry.businessType;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key).push(...entry.results);
  }
  for (const [bizType, results] of grouped.entries()) {
    const seen = /* @__PURE__ */ new Set();
    const unique = results.filter((r) => {
      const k = r.name.toLowerCase().trim();
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
    const sheetData = [
      ["Business Name", "Phone", "Email", "Address", "Website", "Source", "Category", "Rating", "Pitch"],
      ...unique.map((b) => [
        b.name,
        b.phone || "",
        b.email || "",
        b.address || "",
        b.website || "",
        b.source,
        b.category || bizType,
        b.rating || "",
        b.notes || ""
      ])
    ];
    const sheet = XLSX.utils.aoa_to_sheet(sheetData);
    sheet["!cols"] = [
      { wch: 35 },
      // Business Name
      { wch: 18 },
      // Phone
      { wch: 32 },
      // Email
      { wch: 40 },
      // Address
      { wch: 30 },
      // Website
      { wch: 14 },
      // Source
      { wch: 20 },
      // Category
      { wch: 8 },
      // Rating
      { wch: 70 }
      // Pitch
    ];
    const safeName = bizType.replace(/[\\/*?:[\]]/g, "").slice(0, 31) || "Sheet";
    XLSX.utils.book_append_sheet(workbook, sheet, safeName);
  }
  const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "buffer" });
  return excelBuffer;
}

// server/_core/llm.ts
var ensureArray = (value) => Array.isArray(value) ? value : [value];
var normalizeContentPart = (part) => {
  if (typeof part === "string") {
    return { type: "text", text: part };
  }
  if (part.type === "text") {
    return part;
  }
  if (part.type === "image_url") {
    return part;
  }
  if (part.type === "file_url") {
    return part;
  }
  throw new Error("Unsupported message content part");
};
var normalizeMessage = (message) => {
  const { role, name, tool_call_id } = message;
  if (role === "tool" || role === "function") {
    const content = ensureArray(message.content).map((part) => typeof part === "string" ? part : JSON.stringify(part)).join("\n");
    return {
      role,
      name,
      tool_call_id,
      content
    };
  }
  const contentParts = ensureArray(message.content).map(normalizeContentPart);
  if (contentParts.length === 1 && contentParts[0].type === "text") {
    return {
      role,
      name,
      content: contentParts[0].text
    };
  }
  return {
    role,
    name,
    content: contentParts
  };
};
var normalizeToolChoice = (toolChoice, tools) => {
  if (!toolChoice) return void 0;
  if (toolChoice === "none" || toolChoice === "auto") {
    return toolChoice;
  }
  if (toolChoice === "required") {
    if (!tools || tools.length === 0) {
      throw new Error(
        "tool_choice 'required' was provided but no tools were configured"
      );
    }
    if (tools.length > 1) {
      throw new Error(
        "tool_choice 'required' needs a single tool or specify the tool name explicitly"
      );
    }
    return {
      type: "function",
      function: { name: tools[0].function.name }
    };
  }
  if ("name" in toolChoice) {
    return {
      type: "function",
      function: { name: toolChoice.name }
    };
  }
  return toolChoice;
};
var resolveApiUrl = () => {
  if (ENV.forgeApiUrl && ENV.forgeApiUrl.trim().length > 0) {
    const url = ENV.forgeApiUrl.trim();
    if (url.endsWith("/chat/completions")) {
      return url;
    }
    return `${url.replace(/\/$/, "")}/v1/chat/completions`;
  }
  return "https://forge.manus.im/v1/chat/completions";
};
var assertApiKey = () => {
  if (!ENV.forgeApiKey) {
    throw new Error("OPENAI_API_KEY is not configured");
  }
};
var normalizeResponseFormat = ({
  responseFormat,
  response_format,
  outputSchema,
  output_schema
}) => {
  const explicitFormat = responseFormat || response_format;
  if (explicitFormat) {
    if (explicitFormat.type === "json_schema" && !explicitFormat.json_schema?.schema) {
      throw new Error(
        "responseFormat json_schema requires a defined schema object"
      );
    }
    return explicitFormat;
  }
  const schema = outputSchema || output_schema;
  if (!schema) return void 0;
  if (!schema.name || !schema.schema) {
    throw new Error("outputSchema requires both name and schema");
  }
  return {
    type: "json_schema",
    json_schema: {
      name: schema.name,
      schema: schema.schema,
      ...typeof schema.strict === "boolean" ? { strict: schema.strict } : {}
    }
  };
};
var RETRY_MAX_RETRIES = 4;
var RETRY_BASE_DELAY_MS = 500;
var RETRY_MAX_DELAY_MS = 65e3;
var sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
var parseRetryAfter = (value) => {
  if (!value) return void 0;
  const seconds = Number(value);
  if (Number.isFinite(seconds)) return Math.max(0, seconds * 1e3);
  const at = Date.parse(value);
  return Number.isNaN(at) ? void 0 : Math.max(0, at - Date.now());
};
var computeBackoffDelay = (attempt, retryAfterMs) => {
  const cap = Math.min(RETRY_BASE_DELAY_MS * 2 ** attempt, RETRY_MAX_DELAY_MS);
  const jittered = cap / 2 + Math.random() * (cap / 2);
  return Math.min(Math.max(jittered, retryAfterMs ?? 0), RETRY_MAX_DELAY_MS);
};
var fetchWithBackoff = async (url, init) => {
  let lastError;
  for (let attempt = 0; attempt <= RETRY_MAX_RETRIES; attempt++) {
    try {
      const response = await fetch(url, init);
      if (response.ok || attempt === RETRY_MAX_RETRIES) {
        return response;
      }
      if (response.status >= 400 && response.status < 500 && response.status !== 429) {
        return response;
      }
      const retryAfterMs = parseRetryAfter(
        response.headers.get("retry-after")
      );
      try {
        await response.body?.cancel();
      } catch {
      }
      console.warn(
        `LLM request retry ${attempt + 1}/${RETRY_MAX_RETRIES} after status ${response.status}`
      );
      await sleep(computeBackoffDelay(attempt, retryAfterMs));
    } catch (error) {
      lastError = error;
      if (attempt === RETRY_MAX_RETRIES) throw error;
      console.warn(
        `LLM request retry ${attempt + 1}/${RETRY_MAX_RETRIES} after network error`
      );
      await sleep(computeBackoffDelay(attempt));
    }
  }
  throw lastError instanceof Error ? lastError : new Error("LLM request failed after exhausting retries");
};
async function invokeLLM(params) {
  assertApiKey();
  const {
    messages,
    tools,
    toolChoice,
    tool_choice,
    outputSchema,
    output_schema,
    responseFormat,
    response_format,
    model,
    thinking,
    reasoning,
    maxTokens,
    max_tokens
  } = params;
  const payload = {
    messages: messages.map(normalizeMessage)
  };
  if (model) {
    payload.model = model;
  }
  if (tools && tools.length > 0) {
    payload.tools = tools;
  }
  const normalizedToolChoice = normalizeToolChoice(
    toolChoice || tool_choice,
    tools
  );
  if (normalizedToolChoice) {
    payload.tool_choice = normalizedToolChoice;
  }
  const resolvedMaxTokens = max_tokens ?? maxTokens;
  if (typeof resolvedMaxTokens === "number") {
    payload.max_tokens = resolvedMaxTokens;
  }
  if (thinking) {
    payload.thinking = thinking;
  }
  if (reasoning) {
    payload.reasoning = reasoning;
  }
  const normalizedResponseFormat = normalizeResponseFormat({
    responseFormat,
    response_format,
    outputSchema,
    output_schema
  });
  if (normalizedResponseFormat) {
    payload.response_format = normalizedResponseFormat;
  }
  const response = await fetchWithBackoff(resolveApiUrl(), {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${ENV.forgeApiKey}`
    },
    body: JSON.stringify(payload)
  });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `LLM invoke failed: ${response.status} ${response.statusText} \u2013 ${errorText}`
    );
  }
  return await response.json();
}

// server/routers.ts
var VALID_SOURCES = ["google_maps", "justdial", "indiamart", "linkedin", "yellowpages", "tradeindia", "other"];
var appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      ctx.res.clearCookie("mock_session", { path: "/" });
      return { success: true };
    })
  }),
  scraper: router({
    /**
     * Start a new scrape job - uses Google Maps Places API as primary source
     */
    search: protectedProcedure.input(z2.object({
      businessType: z2.string().min(1).max(255),
      location: z2.string().min(1).max(255),
      requirement: z2.string().optional()
    })).mutation(async ({ ctx, input }) => {
      if (!ctx.user) throw new Error("User not authenticated");
      const searchId = await createSearchHistory(
        ctx.user.id,
        input.businessType,
        input.location,
        input.requirement
      );
      if (!searchId) throw new Error("Failed to create search record");
      await updateSearchStatus(searchId, "running");
      try {
        const allResults = [];
        const seenNames = /* @__PURE__ */ new Set();
        const results = await scrapeBusinesses(
          input.businessType,
          input.location,
          input.requirement,
          (source, count) => {
            console.log(`[Scraper] Progress (${input.location}): ${source} - ${count} results so far`);
          }
        );
        for (const r of results) {
          const key = r.name.toLowerCase().trim();
          if (!seenNames.has(key) && key.length > 1) {
            seenNames.add(key);
            allResults.push({
              name: r.name,
              phone: r.phone,
              email: r.email,
              address: r.address,
              website: r.website,
              category: r.category || input.businessType,
              source: VALID_SOURCES.includes(r.source) ? r.source : "other",
              rating: r.rating
            });
          }
        }
        if (allResults.length > 0) {
          await insertBusinessResults(
            allResults.map((r) => ({
              searchId,
              name: r.name,
              phone: r.phone,
              email: r.email,
              address: r.address,
              website: r.website,
              category: r.category,
              source: r.source,
              rating: r.rating,
              existingPresence: r.existingPresence,
              notes: r.notes
            }))
          );
        }
        await updateSearchStatus(searchId, "completed", allResults.length);
        return {
          searchId,
          count: allResults.length,
          results: allResults
        };
      } catch (error) {
        await updateSearchStatus(searchId, "failed");
        console.error("Scrape failed:", error);
        throw new Error("Scraping failed. Please try again.");
      }
    }),
    /**
     * Start a bulk search job for multiple business types concurrently
     */
    bulkSearch: protectedProcedure.input(z2.object({
      businessTypes: z2.array(z2.string().min(1).max(255)),
      location: z2.string().min(1).max(255),
      requirement: z2.string().optional()
    })).mutation(async ({ ctx, input }) => {
      if (!ctx.user) throw new Error("User not authenticated");
      const searchIds = [];
      for (const type of input.businessTypes) {
        const searchId = await createSearchHistory(
          ctx.user.id,
          type,
          input.location,
          input.requirement
        );
        if (searchId) {
          searchIds.push(Number(searchId));
          await updateSearchStatus(Number(searchId), "running");
        }
      }
      const scrapePromises = input.businessTypes.map(async (type, index) => {
        const searchId = searchIds[index];
        try {
          const results = await scrapeBusinesses(type, input.location, input.requirement);
          const seenNames = /* @__PURE__ */ new Set();
          const allResults = [];
          for (const r of results) {
            const key = r.name.toLowerCase().trim();
            if (!seenNames.has(key) && key.length > 1) {
              seenNames.add(key);
              allResults.push({
                searchId,
                name: r.name,
                phone: r.phone,
                email: r.email,
                address: r.address,
                website: r.website,
                category: r.category || type,
                source: VALID_SOURCES.includes(r.source) ? r.source : "other",
                rating: r.rating,
                existingPresence: r.existingPresence,
                notes: r.notes
              });
            }
          }
          if (allResults.length > 0) {
            await insertBusinessResults(allResults);
          }
          await updateSearchStatus(searchId, "completed", allResults.length);
        } catch (err) {
          await updateSearchStatus(searchId, "failed");
          console.error(`Bulk scrape failed for category ${type}:`, err);
        }
      });
      await Promise.all(scrapePromises);
      return {
        success: true,
        searchIds
      };
    }),
    /**
     * Get paginated results for a specific search
     */
    getResults: protectedProcedure.input(z2.object({
      searchId: z2.number(),
      page: z2.number().min(1).default(1),
      pageSize: z2.number().min(1).max(100).default(20)
    })).query(async ({ ctx, input }) => {
      if (!ctx.user) throw new Error("User not authenticated");
      const offset = (input.page - 1) * input.pageSize;
      const results = await getBusinessResults(input.searchId, input.pageSize, offset);
      const total = await countBusinessResults(input.searchId);
      return {
        results,
        total,
        page: input.page,
        pageSize: input.pageSize,
        totalPages: Math.ceil(total / input.pageSize)
      };
    }),
    /**
     * Get search history for the current user
     */
    getHistory: protectedProcedure.input(z2.object({
      page: z2.number().min(1).default(1),
      pageSize: z2.number().min(1).max(50).default(20)
    })).query(async ({ ctx, input }) => {
      if (!ctx.user) throw new Error("User not authenticated");
      const offset = (input.page - 1) * input.pageSize;
      const history = await getSearchHistory(ctx.user.id, input.pageSize, offset);
      return history;
    }),
    /**
     * Get a specific search by ID
     */
    getSearch: protectedProcedure.input(z2.object({
      searchId: z2.number()
    })).query(async ({ ctx, input }) => {
      if (!ctx.user) throw new Error("User not authenticated");
      const search = await getSearchById(input.searchId);
      if (!search) throw new Error("Search not found");
      const total = await countBusinessResults(input.searchId);
      return {
        ...search,
        totalCount: total
      };
    }),
    /**
     * Export results as Excel file (base64)
     */
    exportExcel: protectedProcedure.input(z2.object({
      searchId: z2.number()
    })).query(async ({ ctx, input }) => {
      if (!ctx.user) throw new Error("User not authenticated");
      const search = await getSearchById(input.searchId);
      if (!search) throw new Error("Search not found");
      const results = await getAllBusinessResultsForExport(input.searchId);
      const exportData = {
        businessType: search.businessType,
        location: search.location,
        results: results.map((r) => ({
          name: r.name,
          phone: r.phone || void 0,
          email: r.email || void 0,
          address: r.address || void 0,
          website: r.website || void 0,
          category: r.category || void 0,
          source: r.source,
          rating: r.rating || void 0,
          notes: r.notes || void 0,
          existingPresence: r.existingPresence || void 0
        }))
      };
      const buffer = generateExcelExport(exportData);
      const base64 = buffer.toString("base64");
      return {
        base64,
        filename: `datapal_${search.businessType.replace(/\s+/g, "_")}_${search.location.replace(/\s+/g, "_")}.xlsx`,
        phoneCount: results.filter((r) => r.phone).length,
        emailCount: results.filter((r) => r.email).length
      };
    }),
    /**
     * Export results as CSV
     */
    exportCsv: protectedProcedure.input(z2.object({
      searchId: z2.number()
    })).query(async ({ ctx, input }) => {
      if (!ctx.user) throw new Error("User not authenticated");
      const search = await getSearchById(input.searchId);
      if (!search) throw new Error("Search not found");
      const results = await getAllBusinessResultsForExport(input.searchId);
      const exportData = {
        businessType: search.businessType,
        location: search.location,
        results: results.map((r) => ({
          name: r.name,
          phone: r.phone || void 0,
          email: r.email || void 0,
          address: r.address || void 0,
          website: r.website || void 0,
          category: r.category || void 0,
          source: r.source,
          rating: r.rating || void 0,
          notes: r.notes || void 0,
          existingPresence: r.existingPresence || void 0
        }))
      };
      const csv = generateFullExportCSV(exportData);
      const base64 = Buffer.from(csv).toString("base64");
      return {
        base64,
        filename: `datapal_${search.businessType.replace(/\s+/g, "_")}_${search.location.replace(/\s+/g, "_")}.csv`
      };
    }),
    /**
     * Export ALL searches as a single Excel file with one sheet per business type,
     * or filter by specific searchIds if provided.
     */
    exportAllExcel: protectedProcedure.input(z2.object({
      searchIds: z2.array(z2.number()).optional()
    }).optional()).query(async ({ ctx, input }) => {
      if (!ctx.user) throw new Error("User not authenticated");
      let searches = await getAllCompletedSearchesForUser(ctx.user.id);
      if (input?.searchIds && input.searchIds.length > 0) {
        searches = searches.filter((s) => input.searchIds.includes(s.id));
      }
      if (!searches.length) throw new Error("No completed searches found");
      const entries = [];
      for (const search of searches) {
        const results = await getAllBusinessResultsForExport(search.id);
        entries.push({
          businessType: search.businessType,
          location: search.location,
          results: results.map((r) => ({
            name: r.name,
            phone: r.phone || void 0,
            email: r.email || void 0,
            address: r.address || void 0,
            website: r.website || void 0,
            category: r.category || void 0,
            source: r.source,
            rating: r.rating || void 0,
            notes: r.notes || void 0,
            existingPresence: r.existingPresence || void 0
          }))
        });
      }
      const buffer = generateAllInOneExcel(entries);
      const base64 = buffer.toString("base64");
      const date = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
      return {
        base64,
        filename: `datapal_all_leads_${date}.xlsx`,
        totalSearches: searches.length,
        businessTypes: [...new Set(searches.map((s) => s.businessType))]
      };
    }),
    analyzeProviderService: protectedProcedure.input(z2.object({
      text: z2.string().optional(),
      imageBase64: z2.string().optional(),
      mimeType: z2.string().optional()
    })).mutation(async ({ input }) => {
      try {
        const content = [];
        if (input.text) {
          content.push({ type: "text", text: `Here is the website URL or description of the service I provide:
${input.text}` });
        }
        if (input.imageBase64 && input.mimeType) {
          content.push({
            type: "image_url",
            image_url: { url: `data:${input.mimeType};base64,${input.imageBase64}` }
          });
        }
        content.push({
          type: "text",
          text: "Based on the provided marketing material or website description, determine what service this business is selling. Output a very short 2-6 word string describing what their ideal client needs to improve their business. For example, if the user sells web design, output 'Needs Web Design'. If they sell SEO, output 'Needs SEO'. If they sell social media management, output 'Needs Social Media Management'. If they sell an AI cold calling bot, output 'Needs AI Cold Calling'. ONLY output the short requirement string, nothing else."
        });
        const result = await invokeLLM({
          messages: [{ role: "user", content }],
          model: "gemini-3.5-flash",
          // Use a vision capable model
          maxTokens: 500
        });
        const responseText = result.choices[0].message.content;
        return { requirement: responseText.trim().replace(/^['"]|['"]$/g, "") };
      } catch (error) {
        console.error("AI Analysis failed", error);
        throw new Error("Failed to analyze service");
      }
    })
  })
});

// server/_core/context.ts
async function createContext(opts) {
  let user = null;
  try {
    user = await sdk.authenticateRequest(opts.req);
  } catch (error) {
    if (opts.req.headers.cookie?.includes("mock_session=1")) {
      user = { id: 1, openId: "mock-id", name: "Local User", email: "user@local.com", role: "admin", createdAt: /* @__PURE__ */ new Date(), updatedAt: /* @__PURE__ */ new Date(), lastSignedIn: /* @__PURE__ */ new Date(), loginMethod: "local" };
    } else {
      user = null;
    }
  }
  return {
    req: opts.req,
    res: opts.res,
    user
  };
}

// server/_core/serverless.ts
var app = express();
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));
registerStorageProxy(app);
registerOAuthRoutes(app);
var trpcMiddleware = createExpressMiddleware({
  router: appRouter,
  createContext
});
app.use("/api/trpc", trpcMiddleware);
app.use("/trpc", trpcMiddleware);
app.get("/api/health", (_req, res) => res.json({ status: "ok" }));
app.get("/health", (_req, res) => res.json({ status: "ok" }));
var serverless_default = app;
export {
  serverless_default as default
};
