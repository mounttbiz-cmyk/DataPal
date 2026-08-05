import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import * as schema from "./drizzle/schema.js";
import dotenv from "dotenv";

dotenv.config();

async function main() {
  const tursoUrl = process.env.DATABASE_URL;
  const tursoAuthToken = process.env.DATABASE_AUTH_TOKEN;

  if (!tursoUrl || !tursoUrl.includes("turso.io")) {
    console.error("❌ Error: DATABASE_URL in .env is missing or doesn't look like a Turso URL.");
    process.exit(1);
  }
  if (!tursoAuthToken) {
    console.error("❌ Error: DATABASE_AUTH_TOKEN in .env is missing.");
    process.exit(1);
  }

  console.log("🔗 Connecting to local database...");
  const localClient = createClient({ url: "file:local.db" });
  const localDb = drizzle(localClient, { schema });

  console.log("🔗 Connecting to remote Turso database...");
  const remoteClient = createClient({ url: tursoUrl, authToken: tursoAuthToken });
  const remoteDb = drizzle(remoteClient, { schema });

  try {
    // Migrate Users
    console.log("📦 Migrating Users...");
    const localUsers = await localDb.select().from(schema.users);
    if (localUsers.length > 0) {
      // @ts-ignore
      await remoteDb.insert(schema.users).values(localUsers).onConflictDoNothing();
      console.log(`✅ Migrated ${localUsers.length} users.`);
    } else {
      console.log("⚠️ No users found in local DB.");
    }

    // Migrate Search History
    console.log("📦 Migrating Search History...");
    const localHistory = await localDb.select().from(schema.searchHistory);
    if (localHistory.length > 0) {
      // @ts-ignore
      await remoteDb.insert(schema.searchHistory).values(localHistory).onConflictDoNothing();
      console.log(`✅ Migrated ${localHistory.length} search history records.`);
    } else {
      console.log("⚠️ No search history found in local DB.");
    }

    // Migrate Business Results (in batches to avoid large payloads)
    console.log("📦 Migrating Business Results...");
    const localResults = await localDb.select().from(schema.businessResults);
    if (localResults.length > 0) {
      const batchSize = 500;
      for (let i = 0; i < localResults.length; i += batchSize) {
        const batch = localResults.slice(i, i + batchSize);
        // @ts-ignore
        await remoteDb.insert(schema.businessResults).values(batch).onConflictDoNothing();
        console.log(`✅ Migrated batch ${i} to ${i + batch.length} of ${localResults.length} business results.`);
      }
    } else {
      console.log("⚠️ No business results found in local DB.");
    }

    console.log("🎉 Migration complete! Your data is now securely on Turso.");
  } catch (error) {
    console.error("❌ Migration failed:", error);
  }
}

main();
