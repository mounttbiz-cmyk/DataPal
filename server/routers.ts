import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import { scrapeBusinesses } from "./services/scraper";
import { generateExcelExport, generateFullExportCSV, generateAllInOneExcel } from "./services/excelExport";
import * as db from "./db";
import { invokeLLM } from "./_core/llm";

// Major Indian cities for "All India" search (expanded to cover ALL of India for massive scale)
const ALL_INDIA_CITIES = [
  "Mumbai", "Delhi", "Bangalore", "Hyderabad", "Chennai", "Kolkata", "Pune",
  "Ahmedabad", "Jaipur", "Surat", "Lucknow", "Kanpur", "Nagpur", "Indore",
  "Thane", "Bhopal", "Visakhapatnam", "Patna", "Vadodara", "Ghaziabad",
  "Ludhiana", "Agra", "Nashik", "Faridabad", "Meerut", "Rajkot", "Varanasi",
  "Srinagar", "Aurangabad", "Dhanbad", "Amritsar", "Navi Mumbai", "Allahabad",
  "Ranchi", "Howrah", "Coimbatore", "Jabalpur", "Gwalior", "Vijayawada",
  "Jodhpur", "Madurai", "Raipur", "Kota", "Guwahati", "Chandigarh", "Solapur",
  "Hubli-Dharwad", "Bareilly", "Moradabad", "Mysore", "Tiruchirappalli",
  "Tiruppur", "Gurgaon", "Aligarh", "Jalandhar", "Bhubaneswar", "Salem",
  "Warangal", "Thiruvananthapuram", "Noida", "Jamshedpur", "Kochi", "Dehradun"
];

// Valid source values matching DB enum
const VALID_SOURCES = ["google_maps", "justdial", "indiamart", "linkedin", "yellowpages", "tradeindia", "other"] as const;

export const appRouter = router({
  system: systemRouter,

  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      ctx.res.clearCookie("mock_session", { path: "/" });
      return { success: true } as const;
    }),
  }),

  scraper: router({
    /**
     * Start a new scrape job - uses Google Maps Places API as primary source
     */
    search: protectedProcedure
      .input(z.object({
        businessType: z.string().min(1).max(255),
        location: z.string().min(1).max(255),
        requirement: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (!ctx.user) throw new Error("User not authenticated");

        const searchId = await db.createSearchHistory(
          ctx.user.id,
          input.businessType,
          input.location,
          input.requirement
        );

        if (!searchId) throw new Error("Failed to create search record");

        // Update status to running
        await db.updateSearchStatus(searchId, "running");

        try {
          const allResults: Array<{
            name: string;
            phone?: string;
            email?: string;
            address?: string;
            website?: string;
            category: string;
            source: (typeof VALID_SOURCES)[number];
            rating?: string;
          }> = [];
          const seenNames = new Set<string>();

          // Pass location directly to scrapeBusinesses (e.g. "All India" is handled instantly inside the scraper)
          const results = await scrapeBusinesses(
            input.businessType,
            input.location,
            input.requirement,
            (source, count) => {
              console.log(`[Scraper] Progress (${input.location}): ${source} - ${count} results so far`);
            }
          );

          // Deduplicate
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
                source: (VALID_SOURCES.includes(r.source as any) ? r.source : "other") as typeof VALID_SOURCES[number],
                rating: r.rating,
              });
            }
          }

          // Save results to database
          if (allResults.length > 0) {
            await db.insertBusinessResults(
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
                notes: r.notes,
              }))
            );
          }

          // Update status to completed
          await db.updateSearchStatus(searchId, "completed", allResults.length);

          return {
            searchId,
            count: allResults.length,
            results: allResults,
          };
        } catch (error) {
          await db.updateSearchStatus(searchId, "failed");
          console.error("Scrape failed:", error);
          throw new Error("Scraping failed. Please try again.");
        }
      }),

    /**
     * Start a bulk search job for multiple business types concurrently
     */
    bulkSearch: protectedProcedure
      .input(z.object({
        businessTypes: z.array(z.string().min(1).max(255)),
        location: z.string().min(1).max(255),
        requirement: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (!ctx.user) throw new Error("User not authenticated");

        const searchIds: number[] = [];
        
        // 1. Create all search logs upfront
        for (const type of input.businessTypes) {
          const searchId = await db.createSearchHistory(
            ctx.user.id,
            type,
            input.location,
            input.requirement
          );
          if (searchId) {
            searchIds.push(Number(searchId));
            await db.updateSearchStatus(Number(searchId), "running");
          }
        }

        // 2. Execute scraping jobs in parallel
        const scrapePromises = input.businessTypes.map(async (type, index) => {
          const searchId = searchIds[index];
          try {
            const results = await scrapeBusinesses(type, input.location, input.requirement);

            const seenNames = new Set<string>();
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
                  source: (VALID_SOURCES.includes(r.source as any) ? r.source : "other") as typeof VALID_SOURCES[number],
                  rating: r.rating,
                  existingPresence: r.existingPresence,
                  notes: r.notes,
                });
              }
            }

            if (allResults.length > 0) {
              await db.insertBusinessResults(allResults);
            }

            await db.updateSearchStatus(searchId, "completed", allResults.length);
          } catch (err) {
            await db.updateSearchStatus(searchId, "failed");
            console.error(`Bulk scrape failed for category ${type}:`, err);
          }
        });

        await Promise.all(scrapePromises);

        return {
          success: true,
          searchIds,
        };
      }),

    /**
     * Get paginated results for a specific search
     */
    getResults: protectedProcedure
      .input(z.object({
        searchId: z.number(),
        page: z.number().min(1).default(1),
        pageSize: z.number().min(1).max(100).default(20),
      }))
      .query(async ({ ctx, input }) => {
        if (!ctx.user) throw new Error("User not authenticated");

        const offset = (input.page - 1) * input.pageSize;
        const results = await db.getBusinessResults(input.searchId, input.pageSize, offset);
        const total = await db.countBusinessResults(input.searchId);

        return {
          results,
          total,
          page: input.page,
          pageSize: input.pageSize,
          totalPages: Math.ceil(total / input.pageSize),
        };
      }),

    /**
     * Get search history for the current user
     */
    getHistory: protectedProcedure
      .input(z.object({
        page: z.number().min(1).default(1),
        pageSize: z.number().min(1).max(50).default(20),
      }))
      .query(async ({ ctx, input }) => {
        if (!ctx.user) throw new Error("User not authenticated");

        const offset = (input.page - 1) * input.pageSize;
        const history = await db.getSearchHistory(ctx.user.id, input.pageSize, offset);

        return history;
      }),

    /**
     * Get a specific search by ID
     */
    getSearch: protectedProcedure
      .input(z.object({
        searchId: z.number(),
      }))
      .query(async ({ ctx, input }) => {
        if (!ctx.user) throw new Error("User not authenticated");

        const search = await db.getSearchById(input.searchId);
        if (!search) throw new Error("Search not found");

        const total = await db.countBusinessResults(input.searchId);

        return {
          ...search,
          totalCount: total,
        };
      }),

    /**
     * Export results as Excel file (base64)
     */
    exportExcel: protectedProcedure
      .input(z.object({
        searchId: z.number(),
      }))
      .query(async ({ ctx, input }) => {
        if (!ctx.user) throw new Error("User not authenticated");

        const search = await db.getSearchById(input.searchId);
        if (!search) throw new Error("Search not found");

        const results = await db.getAllBusinessResultsForExport(input.searchId);

        const exportData = {
          businessType: search.businessType,
          location: search.location,
          results: results.map(r => ({
            name: r.name,
            phone: r.phone || undefined,
            email: r.email || undefined,
            address: r.address || undefined,
            website: r.website || undefined,
            category: r.category || undefined,
            source: (r.source as any),
            rating: r.rating || undefined,
            notes: r.notes || undefined,
            existingPresence: r.existingPresence || undefined,
          })),
        };

        const buffer = generateExcelExport(exportData);
        const base64 = buffer.toString("base64");

        return {
          base64,
          filename: `datapal_${search.businessType.replace(/\s+/g, "_")}_${search.location.replace(/\s+/g, "_")}.xlsx`,
          phoneCount: results.filter(r => r.phone).length,
          emailCount: results.filter(r => r.email).length,
        };
      }),

    /**
     * Export results as CSV
     */
    exportCsv: protectedProcedure
      .input(z.object({
        searchId: z.number(),
      }))
      .query(async ({ ctx, input }) => {
        if (!ctx.user) throw new Error("User not authenticated");

        const search = await db.getSearchById(input.searchId);
        if (!search) throw new Error("Search not found");

        const results = await db.getAllBusinessResultsForExport(input.searchId);

        const exportData = {
          businessType: search.businessType,
          location: search.location,
          results: results.map(r => ({
            name: r.name,
            phone: r.phone || undefined,
            email: r.email || undefined,
            address: r.address || undefined,
            website: r.website || undefined,
            category: r.category || undefined,
            source: (r.source as any),
            rating: r.rating || undefined,
            notes: r.notes || undefined,
            existingPresence: r.existingPresence || undefined,
          })),
        };

        const csv = generateFullExportCSV(exportData);
        const base64 = Buffer.from(csv).toString("base64");

        return {
          base64,
          filename: `datapal_${search.businessType.replace(/\s+/g, "_")}_${search.location.replace(/\s+/g, "_")}.csv`,
        };
      }),

    /**
     * Export ALL searches as a single Excel file with one sheet per business type,
     * or filter by specific searchIds if provided.
     */
    exportAllExcel: protectedProcedure
      .input(z.object({
        searchIds: z.array(z.number()).optional(),
      }).optional())
      .query(async ({ ctx, input }) => {
        if (!ctx.user) throw new Error("User not authenticated");

        let searches = await db.getAllCompletedSearchesForUser(ctx.user.id);
        
        if (input?.searchIds && input.searchIds.length > 0) {
          searches = searches.filter(s => input.searchIds!.includes(s.id));
        }

        if (!searches.length) throw new Error("No completed searches found");

        const entries = [];
        for (const search of searches) {
          const results = await db.getAllBusinessResultsForExport(search.id);
          entries.push({
            businessType: search.businessType,
            location: search.location,
            results: results.map(r => ({
              name: r.name,
              phone: r.phone || undefined,
              email: r.email || undefined,
              address: r.address || undefined,
              website: r.website || undefined,
              category: r.category || undefined,
              source: (r.source as any),
              rating: r.rating || undefined,
              notes: r.notes || undefined,
              existingPresence: r.existingPresence || undefined,
            })),
          });
        }

        const buffer = generateAllInOneExcel(entries);
        const base64 = buffer.toString("base64");
        const date = new Date().toISOString().split("T")[0];

        return {
          base64,
          filename: `datapal_all_leads_${date}.xlsx`,
          totalSearches: searches.length,
          businessTypes: [...new Set(searches.map(s => s.businessType))],
        };
      }),

    analyzeProviderService: protectedProcedure
      .input(z.object({
        text: z.string().optional(),
        imageBase64: z.string().optional(),
        mimeType: z.string().optional()
      }))
      .mutation(async ({ input }) => {
        try {
          const content: any[] = [];
          
          if (input.text) {
            content.push({ type: "text", text: `Here is the website URL or description of the service I provide:\n${input.text}` });
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
            model: "gemini-3.5-flash", // Use a vision capable model
            maxTokens: 500,
          });

          const responseText = result.choices[0].message.content as string;
          return { requirement: responseText.trim().replace(/^['"]|['"]$/g, '') };
        } catch (error) {
          console.error("AI Analysis failed", error);
          throw new Error("Failed to analyze service");
        }
      }),
  }),
});

export type AppRouter = typeof appRouter;
