import { eq, desc, and } from "drizzle-orm";
import { drizzle } from "drizzle-orm/libsql";
import { createClient } from "@libsql/client";
import { InsertUser, users, businessResults, searchHistory } from "../drizzle/schema";
import { ENV } from './_core/env';

// Default cloud Turso database credentials (used if process.env.DATABASE_URL is not set on Vercel)
const DEFAULT_TURSO_URL = "libsql://salesleads-aayan.aws-ap-south-1.turso.io";
const DEFAULT_TURSO_AUTH_TOKEN = "eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3ODU5MjM2NDIsImlkIjoiMDE5ZmQxNGUtNDcwMS03MDlkLTllM2UtNGFiMTZkNWE5OGY4Iiwia2lkIjoiMWVqLUxmY08ycXliVXdvVUM2ak5saTB2UTlOaVltZGtaQjljanAzTGFnNCIsInJpZCI6IjI4YTM3MWFmLTVkY2EtNGY4My04YTYyLTM4ZTBjNzk2MTc0YyJ9.ofQPTv0YQm7d9UgvT060oAaZYTzjVdrSqV4_0yrtHfxr4Etw15-o77eg1a2fBqIYm7IKm_kj2dmlPBGal3WVCw";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db) {
    try {
      const url = process.env.DATABASE_URL || DEFAULT_TURSO_URL;
      const authToken = process.env.DATABASE_AUTH_TOKEN || (url === DEFAULT_TURSO_URL ? DEFAULT_TURSO_AUTH_TOKEN : undefined);
      const client = createClient({ url, authToken });
      _db = drizzle(client);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onConflictDoUpdate({
      target: users.openId,
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
  }
}

export async function getUserByOpenId(openId: string) {
  try {
    const db = await getDb();
    if (!db) {
      console.warn("[Database] Cannot get user: database not available");
      return undefined;
    }

    const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
    return result.length > 0 ? result[0] : undefined;
  } catch (err) {
    console.warn("[Database] Failed to getUserByOpenId:", err);
    return undefined;
  }
}

// Search History helpers
export async function createSearchHistory(userId: number, businessType: string, location: string, requirement?: string): Promise<number> {
  try {
    const db = await getDb();
    if (db) {
      const result = await db.insert(searchHistory).values({
        userId,
        businessType,
        location,
        requirement,
        status: "pending",
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      const id = Number(result.lastInsertRowid);
      if (id && !isNaN(id)) return id;
    }
  } catch (err) {
    console.warn("[Database] Failed to insert searchHistory:", err);
  }
  // Return fallback timestamp id so search operations NEVER fail
  return Math.floor(Date.now() / 1000);
}

export async function updateSearchStatus(id: number, status: string, resultsCount?: number) {
  try {
    const db = await getDb();
    if (!db) return;
    const set: Record<string, unknown> = { 
      status,
      updatedAt: new Date()
    };
    if (resultsCount !== undefined) set.resultsCount = resultsCount;
    await db.update(searchHistory).set(set).where(eq(searchHistory.id, id));
  } catch (err) {
    console.warn("[Database] Failed to update search status:", err);
  }
}

export async function getSearchHistory(userId: number, limit = 20, offset = 0) {
  try {
    const db = await getDb();
    if (!db) return [];
    return await db.select().from(searchHistory)
      .where(eq(searchHistory.userId, userId))
      .orderBy(desc(searchHistory.createdAt))
      .limit(limit)
      .offset(offset);
  } catch (err) {
    console.warn("[Database] Failed to get search history:", err);
    return [];
  }
}

export async function getSearchById(id: number) {
  try {
    const db = await getDb();
    if (!db) return null;
    const result = await db.select().from(searchHistory).where(eq(searchHistory.id, id)).limit(1);
    return result.length > 0 ? result[0] : null;
  } catch (err) {
    console.warn("[Database] Failed to get search by id:", err);
    return null;
  }
}

// Business Results helpers
type BusinessResultInput = {
  searchId: number;
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  website?: string;
  category?: string;
  source?: "google_maps" | "justdial" | "indiamart" | "linkedin" | "yellowpages" | "tradeindia" | "other";
  rating?: string;
  existingPresence?: string | null;
  notes?: string | null;
};

export async function insertBusinessResults(results: BusinessResultInput[]) {
  try {
    const db = await getDb();
    if (!db || results.length === 0) return;
    
    const resultsWithDate = results.map(r => ({
      ...r,
      createdAt: new Date()
    }));
    
    await db.insert(businessResults).values(resultsWithDate);
  } catch (err) {
    console.warn("[Database] Failed to insert business results:", err);
  }
}

export async function getBusinessResults(searchId: number, limit = 20, offset = 0) {
  try {
    const db = await getDb();
    if (!db) return [];
    return await db.select().from(businessResults)
      .where(eq(businessResults.searchId, searchId))
      .limit(limit)
      .offset(offset);
  } catch (err) {
    console.warn("[Database] Failed to get business results:", err);
    return [];
  }
}

export async function countBusinessResults(searchId: number) {
  try {
    const db = await getDb();
    if (!db) return 0;
    const result = await db
      .select({ count: businessResults.id })
      .from(businessResults)
      .where(eq(businessResults.searchId, searchId));
    return result.length;
  } catch (err) {
    console.warn("[Database] Failed to count business results:", err);
    return 0;
  }
}

export async function getAllBusinessResultsForExport(searchId: number) {
  try {
    const db = await getDb();
    if (!db) return [];
    return await db.select().from(businessResults)
      .where(eq(businessResults.searchId, searchId));
  } catch (err) {
    console.warn("[Database] Failed to get export results:", err);
    return [];
  }
}

export async function getAllCompletedSearchesForUser(userId: number) {
  try {
    const db = await getDb();
    if (!db) return [];
    return await db.select().from(searchHistory)
      .where(and(eq(searchHistory.userId, userId), eq(searchHistory.status, "completed")))
      .orderBy(desc(searchHistory.createdAt));
  } catch (err) {
    console.warn("[Database] Failed to get completed searches:", err);
    return [];
  }
}
