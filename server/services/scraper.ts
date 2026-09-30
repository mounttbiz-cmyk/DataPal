export type ScrapedBusiness = {
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  website?: string;
  category: string;
  source: "google_maps" | "justdial" | "indiamart" | "linkedin" | "yellowpages" | "tradeindia" | "other";
  rating?: string;
  existingPresence?: string;
  notes?: string;
  hasGbp?: boolean;
  hasSocial?: boolean;
  hasOrdering?: boolean;
};

// ─────────────────────────────────────────────────────────────────────
// GEOCODING: Convert location name → lat/lng using Nominatim (free)
// ─────────────────────────────────────────────────────────────────────
async function geocodeLocation(location: string): Promise<{ lat: number; lon: number } | null> {
  try {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(location)}&format=json&limit=1`;
    const res = await fetch(url, {
      headers: { "User-Agent": "DataPal/1.0 (business-lead-scraper)" }
    });
    if (!res.ok) return null;
    const data = await res.json() as any[];
    if (data.length === 0) return null;
    return { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon) };
  } catch {
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────
// SOURCE 1: Foursquare Places API (Free — 100K calls/month)
// Docs: https://docs.foursquare.com/developer/reference/place-search
// Returns: name, address, phone, website, categories, rating, hours
// ─────────────────────────────────────────────────────────────────────
async function fetchFromFoursquare(
  businessType: string,
  location: string,
  coords: { lat: number; lon: number } | null
): Promise<ScrapedBusiness[]> {
  const apiKey = process.env.FOURSQUARE_API_KEY;
  if (!apiKey) {
    console.log("[Foursquare] No API key set (FOURSQUARE_API_KEY). Skipping.");
    return [];
  }

  try {
    const params = new URLSearchParams({
      query: businessType,
      limit: "50",
      sort: "RELEVANCE",
    });

    if (coords) {
      params.set("ll", `${coords.lat},${coords.lon}`);
      params.set("radius", "50000"); // 50km radius
    } else {
      params.set("near", location);
    }

    // Also request details fields
    params.set("fields", "name,location,tel,website,categories,rating,hours,email,social_media,description");

    const url = `https://api.foursquare.com/v3/places/search?${params.toString()}`;
    const res = await fetch(url, {
      headers: {
        "Authorization": apiKey,
        "Accept": "application/json",
      }
    });

    if (!res.ok) {
      console.warn(`[Foursquare] HTTP ${res.status} for "${businessType}" in "${location}"`);
      return [];
    }

    const data = await res.json() as any;
    const results: ScrapedBusiness[] = [];

    for (const place of (data.results || [])) {
      const loc = place.location || {};
      const addressParts = [
        loc.address,
        loc.locality,
        loc.region,
        loc.country,
        loc.postcode
      ].filter(Boolean);

      const hasSocial = !!(place.social_media?.facebook_id || place.social_media?.instagram || place.social_media?.twitter);

      results.push({
        name: place.name || "Unknown Business",
        phone: place.tel || undefined,
        email: place.email || undefined,
        address: addressParts.join(", ") || location,
        website: place.website || undefined,
        category: place.categories?.[0]?.name || businessType,
        source: "other" as const,
        rating: place.rating ? (place.rating / 2).toFixed(1) : undefined, // Foursquare uses 0-10 scale
        hasGbp: undefined, // Can't determine from Foursquare
        hasSocial,
        hasOrdering: undefined,
        existingPresence: [
          place.website ? "Website" : "",
          hasSocial ? "Social Media" : "",
        ].filter(Boolean).join(", ") || "Directory Listing Only",
        notes: "",
      });
    }

    console.log(`[Foursquare] Found ${results.length} results for "${businessType}" in "${location}"`);
    return results;
  } catch (err: any) {
    console.error(`[Foursquare] Error:`, err.message);
    return [];
  }
}

// ─────────────────────────────────────────────────────────────────────
// SOURCE 2: OpenStreetMap Overpass API (Free, unlimited, structured)
// Way more powerful than Nominatim — queries actual POI/amenity nodes
// ─────────────────────────────────────────────────────────────────────

// Map common business types to OSM amenity/shop/tourism tags
const OSM_TAG_MAP: Record<string, string[]> = {
  // Education
  "schools": ['["amenity"="school"]'],
  "colleges": ['["amenity"="college"]'],
  "universities": ['["amenity"="university"]'],
  "coaching centers": ['["amenity"="training"]', '["amenity"="college"]'],
  "tuition centers": ['["amenity"="training"]'],
  "libraries": ['["amenity"="library"]'],

  // Healthcare
  "hospitals": ['["amenity"="hospital"]'],
  "clinics": ['["amenity"="clinic"]'],
  "dental clinics": ['["amenity"="dentist"]'],
  "pharmacies": ['["amenity"="pharmacy"]'],
  "doctors": ['["amenity"="doctors"]'],
  "veterinary": ['["amenity"="veterinary"]'],

  // Food & Drink
  "restaurants": ['["amenity"="restaurant"]'],
  "cafes": ['["amenity"="cafe"]'],
  "bars": ['["amenity"="bar"]'],
  "fast food": ['["amenity"="fast_food"]'],
  "bakeries": ['["shop"="bakery"]'],
  "ice cream": ['["amenity"="ice_cream"]'],

  // Accommodation
  "hotels": ['["tourism"="hotel"]'],
  "hostels": ['["tourism"="hostel"]'],
  "guest houses": ['["tourism"="guest_house"]'],
  "resorts": ['["leisure"="resort"]', '["tourism"="hotel"]'],

  // Shopping & Retail
  "supermarkets": ['["shop"="supermarket"]'],
  "convenience stores": ['["shop"="convenience"]'],
  "department stores": ['["shop"="department_store"]'],
  "clothing stores": ['["shop"="clothes"]'],
  "electronics stores": ['["shop"="electronics"]'],
  "furniture stores": ['["shop"="furniture"]'],
  "stationery shops": ['["shop"="stationery"]'],
  "bookstores": ['["shop"="books"]'],
  "jewelry stores": ['["shop"="jewelry"]'],
  "optical stores": ['["shop"="optician"]'],
  "pet stores": ['["shop"="pet"]'],
  "hardware stores": ['["shop"="hardware"]'],
  "mobile shops": ['["shop"="mobile_phone"]'],
  "computer shops": ['["shop"="computer"]'],
  "car dealers": ['["shop"="car"]'],
  "bicycle shops": ['["shop"="bicycle"]'],
  "florists": ['["shop"="florist"]'],
  "gift shops": ['["shop"="gift"]'],
  "toy stores": ['["shop"="toys"]'],
  "sporting goods": ['["shop"="sports"]'],
  "grocery stores": ['["shop"="greengrocer"]', '["shop"="grocery"]'],
  "retail stores": ['["shop"="department_store"]', '["shop"="mall"]'],

  // Beauty & Wellness
  "salons": ['["shop"="hairdresser"]'],
  "beauty salons": ['["shop"="beauty"]'],
  "spas": ['["leisure"="spa"]', '["shop"="beauty"]'],
  "barbers": ['["shop"="hairdresser"]'],

  // Fitness & Sports
  "gyms": ['["leisure"="fitness_centre"]'],
  "fitness centers": ['["leisure"="fitness_centre"]'],
  "swimming pools": ['["leisure"="swimming_pool"]'],
  "sports centers": ['["leisure"="sports_centre"]'],
  "yoga studios": ['["leisure"="fitness_centre"]'],

  // Professional Services
  "banks": ['["amenity"="bank"]'],
  "atms": ['["amenity"="atm"]'],
  "insurance": ['["office"="insurance"]'],
  "lawyers": ['["office"="lawyer"]'],
  "accountants": ['["office"="accountant"]'],
  "architects": ['["office"="architect"]'],
  "consultants": ['["office"="consulting"]'],
  "real estate agents": ['["office"="estate_agent"]'],
  "tax consultants": ['["office"="tax_advisor"]'],
  "notaries": ['["office"="notary"]'],

  // IT & Tech
  "it companies": ['["office"="it"]', '["office"="company"]'],
  "software companies": ['["office"="it"]'],
  "coworking spaces": ['["amenity"="coworking_space"]'],

  // Automotive
  "car repair": ['["shop"="car_repair"]'],
  "car wash": ['["amenity"="car_wash"]'],
  "fuel stations": ['["amenity"="fuel"]'],
  "parking": ['["amenity"="parking"]'],

  // Real Estate & Construction
  "builders": ['["office"="construction_company"]'],
  "real estate developers": ['["office"="estate_agent"]'],
  "interior designers": ['["office"="architect"]'],

  // Entertainment & Leisure
  "cinemas": ['["amenity"="cinema"]'],
  "theatres": ['["amenity"="theatre"]'],
  "nightclubs": ['["amenity"="nightclub"]'],
  "amusement parks": ['["leisure"="amusement_arcade"]'],

  // Logistics & Transport
  "courier services": ['["amenity"="post_office"]'],
  "logistics": ['["industrial"="warehouse"]'],
  "travel agencies": ['["shop"="travel_agency"]'],

  // Miscellaneous
  "laundry": ['["shop"="laundry"]'],
  "dry cleaning": ['["shop"="dry_cleaning"]'],
  "printing shops": ['["shop"="copyshop"]'],
  "photography studios": ['["shop"="photo"]'],
  "event venues": ['["amenity"="events_venue"]'],
  "places of worship": ['["amenity"="place_of_worship"]'],
  "funeral homes": ['["amenity"="funeral_hall"]'],
};

function getOsmTagsForType(businessType: string): string[] {
  const normalized = businessType.toLowerCase().trim();

  // Exact match
  if (OSM_TAG_MAP[normalized]) return OSM_TAG_MAP[normalized];

  // Partial match
  for (const [key, tags] of Object.entries(OSM_TAG_MAP)) {
    if (normalized.includes(key) || key.includes(normalized)) return tags;
  }

  // Singularize and try again
  const singular = normalized.replace(/s$/, "").replace(/ies$/, "y");
  for (const [key, tags] of Object.entries(OSM_TAG_MAP)) {
    const keySingular = key.replace(/s$/, "").replace(/ies$/, "y");
    if (singular.includes(keySingular) || keySingular.includes(singular)) return tags;
  }

  // Fallback: generic name search
  return [];
}

async function fetchFromOverpass(
  businessType: string,
  coords: { lat: number; lon: number } | null,
  radiusMeters: number = 25000
): Promise<ScrapedBusiness[]> {
  if (!coords) {
    console.log("[Overpass] No coordinates available, skipping.");
    return [];
  }

  const osmTags = getOsmTagsForType(businessType);
  if (osmTags.length === 0) {
    console.log(`[Overpass] No OSM tag mapping for "${businessType}", using name-based search.`);
    // Fall back to a name-based search
    const nameQuery = `
      [out:json][timeout:30];
      (
        node["name"~"${businessType.replace(/[^a-zA-Z0-9 ]/g, "")}"i](around:${radiusMeters},${coords.lat},${coords.lon});
        way["name"~"${businessType.replace(/[^a-zA-Z0-9 ]/g, "")}"i](around:${radiusMeters},${coords.lat},${coords.lon});
      );
      out body 50;
    `;
    return executeOverpassQuery(nameQuery, businessType);
  }

  // Build query with all matching tags
  const nodeQueries = osmTags.map(tag => `node${tag}(around:${radiusMeters},${coords.lat},${coords.lon});`).join("\n        ");
  const wayQueries = osmTags.map(tag => `way${tag}(around:${radiusMeters},${coords.lat},${coords.lon});`).join("\n        ");

  const query = `
    [out:json][timeout:30];
    (
      ${nodeQueries}
      ${wayQueries}
    );
    out body 50;
  `;

  return executeOverpassQuery(query, businessType);
}

async function executeOverpassQuery(query: string, businessType: string): Promise<ScrapedBusiness[]> {
  try {
    const url = "https://overpass-api.de/api/interpreter";
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: `data=${encodeURIComponent(query)}`,
    });

    if (!res.ok) {
      console.warn(`[Overpass] HTTP ${res.status}`);
      return [];
    }

    const data = await res.json() as any;
    const results: ScrapedBusiness[] = [];

    for (const element of (data.elements || [])) {
      const tags = element.tags || {};
      const name = tags.name || tags["name:en"];
      if (!name) continue; // Skip unnamed POIs

      const addressParts = [
        tags["addr:housenumber"],
        tags["addr:street"],
        tags["addr:city"] || tags["addr:suburb"],
        tags["addr:state"],
        tags["addr:postcode"],
        tags["addr:country"],
      ].filter(Boolean);

      const phone = tags.phone || tags["contact:phone"] || tags["phone:mobile"] || undefined;
      const email = tags.email || tags["contact:email"] || undefined;
      const website = tags.website || tags["contact:website"] || tags.url || undefined;
      const hasSocial = !!(tags["contact:facebook"] || tags["contact:instagram"] || tags["contact:twitter"] || tags.facebook || tags.instagram);

      results.push({
        name,
        phone,
        email,
        address: addressParts.length > 0 ? addressParts.join(", ") : undefined,
        website,
        category: tags.amenity || tags.shop || tags.office || tags.tourism || tags.leisure || businessType,
        source: "google_maps" as const, // Mark as "google_maps" since it's map-sourced POI data
        rating: tags.stars || undefined,
        hasGbp: undefined,
        hasSocial,
        hasOrdering: undefined,
        existingPresence: [
          website ? "Website" : "",
          hasSocial ? "Social Media" : "",
          phone ? "Phone Listed" : "",
        ].filter(Boolean).join(", ") || "OSM Listing Only",
        notes: "",
      });
    }

    console.log(`[Overpass] Found ${results.length} results for "${businessType}"`);
    return results;
  } catch (err: any) {
    console.error(`[Overpass] Error:`, err.message);
    return [];
  }
}

// ─────────────────────────────────────────────────────────────────────
// SOURCE 3: Nominatim Search (Free, rate-limited backup)
// ─────────────────────────────────────────────────────────────────────
async function fetchFromNominatim(businessType: string, locationStr: string): Promise<ScrapedBusiness[]> {
  try {
    const query = encodeURIComponent(`${businessType} in ${locationStr}`);
    const url = `https://nominatim.openstreetmap.org/search?q=${query}&format=json&addressdetails=1&extratags=1&limit=40`;

    const res = await fetch(url, {
      headers: { "User-Agent": "DataPal/1.0 (business-lead-scraper)" }
    });

    if (res.status === 429) {
      console.warn(`[Nominatim] Rate limited (429) for ${locationStr}.`);
      return [];
    }

    if (!res.ok) {
      console.warn(`[Nominatim] HTTP Error ${res.status} for ${locationStr}.`);
      return [];
    }

    const data = await res.json() as any[];
    if (!Array.isArray(data) || data.length === 0) return [];

    const results: ScrapedBusiness[] = [];

    for (const item of data) {
      const name = item.name || (item.display_name ? item.display_name.split(",")[0] : null);
      if (!name) continue;

      const phone = item.extratags?.phone || item.extratags?.["contact:phone"] || undefined;
      const email = item.extratags?.email || item.extratags?.["contact:email"] || undefined;
      const website = item.extratags?.website || item.extratags?.["contact:website"] || undefined;

      results.push({
        name,
        phone,
        email,
        website,
        address: item.display_name || locationStr,
        category: item.type ? item.type.charAt(0).toUpperCase() + item.type.slice(1) : businessType,
        source: "google_maps" as const,
        rating: undefined,
        hasGbp: undefined,
        hasSocial: undefined,
        hasOrdering: undefined,
        existingPresence: [
          website ? "Website" : "",
          phone ? "Phone Listed" : "",
        ].filter(Boolean).join(", ") || "Directory Listing",
        notes: "",
      });
    }

    console.log(`[Nominatim] Found ${results.length} results for "${businessType}" in "${locationStr}"`);
    return results;
  } catch (err: any) {
    console.error(`[Nominatim] Network error for ${locationStr}:`, err.message);
    return [];
  }
}

// ─────────────────────────────────────────────────────────────────────
// PITCH GENERATOR: Creates 1-line pitch notes based on requirement
// ─────────────────────────────────────────────────────────────────────
function generateOneLinePitch(requirement: string, businessType: string): string {
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
  else entity = typeLower.replace(/s$/, '');

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

// ─────────────────────────────────────────────────────────────────────
// MAIN SCRAPING ORCHESTRATOR
// Priority: Foursquare → Overpass → Nominatim
// All sources are 100% free, no fake data generated
// ─────────────────────────────────────────────────────────────────────

const TOP_INDIA_CITIES = [
  "Mumbai", "Delhi", "Bangalore", "Hyderabad", "Chennai",
  "Kolkata", "Pune", "Ahmedabad", "Jaipur", "Surat",
  "Lucknow", "Nagpur", "Indore", "Bhopal", "Visakhapatnam"
];

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function scrapeBusinesses(
  businessType: string,
  location: string,
  requirement?: string,
  onProgress?: (status: string, count: number) => void
): Promise<ScrapedBusiness[]> {
  let allResults: ScrapedBusiness[] = [];
  const isAllIndia = location.toLowerCase() === "all india";
  const locations = isAllIndia ? TOP_INDIA_CITIES : [location];

  onProgress?.("searching", 0);

  for (let i = 0; i < locations.length; i++) {
    const loc = locations[i];
    console.log(`\n[Scraper] ──── Searching "${businessType}" in "${loc}" (${i + 1}/${locations.length}) ────`);

    // Step 1: Geocode the location
    const coords = await geocodeLocation(loc);
    if (coords) {
      console.log(`[Scraper] Geocoded "${loc}" → ${coords.lat}, ${coords.lon}`);
    } else {
      console.warn(`[Scraper] Could not geocode "${loc}", will use text-based search only.`);
    }

    let cityResults: ScrapedBusiness[] = [];

    // Step 2: Try Foursquare first (best structured data — name, phone, website, rating)
    const foursquareResults = await fetchFromFoursquare(businessType, loc, coords);
    cityResults.push(...foursquareResults);

    // Step 3: Try Overpass API (free, unlimited, structured OSM data)
    const overpassResults = await fetchFromOverpass(businessType, coords);
    cityResults.push(...overpassResults);

    // Step 4: If still not enough results, try Nominatim as last resort
    if (cityResults.length < 10) {
      // Small delay to respect Nominatim's rate limit (1 req/sec)
      await sleep(1100);
      const nominatimResults = await fetchFromNominatim(businessType, loc);
      cityResults.push(...nominatimResults);
    }

    allResults.push(...cityResults);
    onProgress?.("searching", allResults.length);

    // Rate limit between cities for All India searches
    if (isAllIndia && i < locations.length - 1) {
      await sleep(1200);
    }
  }

  onProgress?.("processing", allResults.length);

  // ── Post-processing ──

  // 1. Deduplicate by name (case-insensitive)
  const seen = new Set<string>();
  allResults = allResults.filter(r => {
    const key = r.name.toLowerCase().trim();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  // 2. Filter by selected requirement
  if (requirement && requirement !== "all") {
    console.log(`[Scraper] Filtering results for requirement: ${requirement}`);
    allResults = allResults.filter(r => {
      let isMatch = true;

      if (requirement === "website" || requirement === "no_website") {
        isMatch = !r.website;
      } else if (requirement === "logo") {
        // Can't determine logo status from external data — include all
        isMatch = true;
      } else if (requirement === "gbp") {
        // If no website and no rich presence, likely no GBP
        isMatch = !r.hasGbp && !r.website;
      } else if (requirement === "social") {
        isMatch = !r.hasSocial;
      } else if (requirement === "online_ordering") {
        isMatch = !r.hasOrdering;
      } else if (requirement === "no_phone") {
        isMatch = !r.phone;
      } else if (requirement === "low_rating") {
        isMatch = r.rating ? parseFloat(r.rating) < 4.0 : true;
      }
      // For custom requirements, include all results and add notes

      if (isMatch) {
        r.notes = generateOneLinePitch(requirement, businessType);
      }
      return isMatch;
    });
  } else {
    // Add general notes
    allResults.forEach(r => {
      if (!r.website) r.notes = "Missing website — potential web development lead.";
      else if (!r.hasSocial) r.notes = "Missing social media presence.";
      else if (!r.phone) r.notes = "No phone listed — may need visibility improvement.";
      else r.notes = "Established business with online presence.";
    });
  }

  // 3. Sort: businesses with more contact info first (most actionable leads)
  allResults.sort((a, b) => {
    const scoreA = (a.phone ? 2 : 0) + (a.email ? 2 : 0) + (a.website ? 1 : 0);
    const scoreB = (b.phone ? 2 : 0) + (b.email ? 2 : 0) + (b.website ? 1 : 0);
    return scoreB - scoreA;
  });

  console.log(`\n[Scraper] ═══════════════════════════════════════`);
  console.log(`[Scraper] FINAL: ${allResults.length} real businesses found`);
  console.log(`[Scraper]   With phone: ${allResults.filter(r => r.phone).length}`);
  console.log(`[Scraper]   With email: ${allResults.filter(r => r.email).length}`);
  console.log(`[Scraper]   With website: ${allResults.filter(r => r.website).length}`);
  console.log(`[Scraper] ═══════════════════════════════════════\n`);

  onProgress?.("complete", allResults.length);
  return allResults;
}
