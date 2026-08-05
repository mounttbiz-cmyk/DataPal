import { eq, desc, and } from "drizzle-orm";
import { drizzle } from "drizzle-orm/libsql";
import { createClient } from "@libsql/client";
import { InsertUser, users, businessResults, searchHistory } from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
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
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// Search History helpers
export async function createSearchHistory(userId: number, businessType: string, location: string, requirement?: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(searchHistory).values({
    userId,
    businessType,
    location,
    requirement,
    status: "pending",
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  return result.lastInsertRowid;
}

export async function updateSearchStatus(id: number, status: string, resultsCount?: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const set: Record<string, unknown> = { 
    status,
    updatedAt: new Date()
  };
  if (resultsCount !== undefined) set.resultsCount = resultsCount;
  await db.update(searchHistory).set(set).where(eq(searchHistory.id, id));
}

export async function getSearchHistory(userId: number, limit = 20, offset = 0) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.select().from(searchHistory)
    .where(eq(searchHistory.userId, userId))
    .orderBy(desc(searchHistory.createdAt))
    .limit(limit)
    .offset(offset);
}

export async function getSearchById(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.select().from(searchHistory).where(eq(searchHistory.id, id)).limit(1);
  return result.length > 0 ? result[0] : null;
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
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (results.length === 0) return;
  
  const resultsWithDate = results.map(r => ({
    ...r,
    createdAt: new Date()
  }));
  
  await db.insert(businessResults).values(resultsWithDate);
}

export async function getBusinessResults(searchId: number, limit = 20, offset = 0) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.select().from(businessResults)
    .where(eq(businessResults.searchId, searchId))
    .limit(limit)
    .offset(offset);
}

export async function countBusinessResults(searchId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db
    .select({ count: businessResults.id })
    .from(businessResults)
    .where(eq(businessResults.searchId, searchId));
  return result.length;
}

export async function getAllBusinessResultsForExport(searchId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.select().from(businessResults)
    .where(eq(businessResults.searchId, searchId));
}

export async function getAllCompletedSearchesForUser(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.select().from(searchHistory)
    .where(and(eq(searchHistory.userId, userId), eq(searchHistory.status, "completed")))
    .orderBy(desc(searchHistory.createdAt));
}

