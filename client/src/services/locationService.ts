import { GLOBAL_COUNTRIES, type CountryData } from "@/config/globalLocations";
import { COUNTRY_CONFIGS, POPULAR_COUNTRY_CODES, getCountryConfig } from "./countryConfig";

export interface PlaceOption {
  id: string;
  name: string;
  code?: string;
  countryCode?: string;
  stateName?: string;
  dialCode?: string;
  isPopular?: boolean;
}

export interface StructuredLocationScope {
  countries: string[];
  states: "ALL" | string[];
  cities: "ALL" | string[];
  area?: string;
  postalCode?: string;
}

// In-memory cache for lazy-loaded states and cities
const stateCache = new Map<string, PlaceOption[]>();
const cityCache = new Map<string, PlaceOption[]>();
const localityCache = new Map<string, string[]>();

class LocationService {
  /**
   * Returns list of all supported countries, popular ones first
   */
  async getCountries(): Promise<PlaceOption[]> {
    const list: PlaceOption[] = [];

    // First map from GLOBAL_COUNTRIES
    for (const country of GLOBAL_COUNTRIES) {
      const cfg = getCountryConfig(country.code);
      list.push({
        id: country.code,
        name: country.name,
        code: country.code,
        dialCode: cfg.dialCode || country.phonePrefix,
        isPopular: POPULAR_COUNTRY_CODES.includes(country.code),
      });
    }

    // Add any remaining from COUNTRY_CONFIGS not in list
    for (const [code, cfg] of Object.entries(COUNTRY_CONFIGS)) {
      if (!list.some(c => c.code === code)) {
        list.push({
          id: code,
          name: cfg.name,
          code: code,
          dialCode: cfg.dialCode,
          isPopular: !!cfg.popular,
        });
      }
    }

    // Sort popular first, then alphabetically
    return list.sort((a, b) => {
      if (a.isPopular && !b.isPopular) return -1;
      if (!a.isPopular && b.isPopular) return 1;
      return a.name.localeCompare(b.name);
    });
  }

  /**
   * Returns states for a given country code (lazy & cached)
   */
  async getStates(countryCode: string): Promise<PlaceOption[]> {
    if (!countryCode) return [];
    const upper = countryCode.toUpperCase();
    if (stateCache.has(upper)) {
      return stateCache.get(upper)!;
    }

    const country = GLOBAL_COUNTRIES.find(c => c.code === upper);
    let states: PlaceOption[] = [];

    if (country && country.states.length > 0) {
      states = country.states.map(s => ({
        id: `${upper}_${s.name}`,
        name: s.name,
        countryCode: upper,
      }));
    } else {
      // Basic fallback
      states = [
        { id: `${upper}_ALL`, name: "All States / Nationwide", countryCode: upper }
      ];
    }

    stateCache.set(upper, states);
    return states;
  }

  /**
   * Returns cities for a given country and optional state (lazy & cached)
   */
  async getCities(countryCode: string, stateName?: string): Promise<PlaceOption[]> {
    if (!countryCode) return [];
    const cacheKey = `${countryCode.toUpperCase()}_${stateName || "ALL"}`;
    if (cityCache.has(cacheKey)) {
      return cityCache.get(cacheKey)!;
    }

    const country = GLOBAL_COUNTRIES.find(c => c.code === countryCode.toUpperCase());
    let cities: PlaceOption[] = [];

    if (country) {
      if (!stateName || stateName === "ALL") {
        // Flat map across all states
        const all = country.states.flatMap(s => s.cities.map(cityName => ({
          id: `${cityName}_${s.name}`,
          name: cityName,
          stateName: s.name,
          countryCode: country.code,
        })));
        cities = all.slice(0, 30);
      } else {
        const stateObj = country.states.find(s => s.name.toLowerCase() === stateName.toLowerCase());
        if (stateObj) {
          cities = stateObj.cities.map(cityName => ({
            id: `${cityName}_${stateObj.name}`,
            name: cityName,
            stateName: stateObj.name,
            countryCode: country.code,
          }));
        }
      }
    }

    cityCache.set(cacheKey, cities);
    return cities;
  }

  /**
   * Get dynamic localities / areas for a city
   */
  async getLocalities(city: string, state?: string, countryCode?: string): Promise<string[]> {
    if (!city) return [];
    const key = `${city}_${state || ""}_${countryCode || ""}`.toLowerCase();
    if (localityCache.has(key)) return localityCache.get(key)!;

    // Default sample localities for major hubs
    const defaults: Record<string, string[]> = {
      mumbai: ["Bandra West", "Andheri East", "Colaba", "Juhu", "Powai", "BKC", "Dadar"],
      delhi: ["Connaught Place", "Hauz Khas", "South Extension", "Karol Bagh", "Saket"],
      bangalore: ["Koramangala", "Indiranagar", "HSR Layout", "Whitefield", "MG Road"],
      pune: ["Kothrud", "Viman Nagar", "Baner", "Hinjewadi", "Koregaon Park"],
      "new york city": ["Manhattan", "Brooklyn", "Queens", "SoHo", "Midtown"],
      "los angeles": ["Downtown", "Beverly Hills", "Santa Monica", "Hollywood", "Venice"],
      london: ["Canary Wharf", "Westminster", "Camden", "Soho", "Kensington"],
      dubai: ["Downtown Dubai", "Dubai Marina", "Business Bay", "Deira", "JBR"],
    };

    const found = defaults[city.toLowerCase()] || ["Downtown", "Central District", "Commercial Area", "North Sector"];
    localityCache.set(key, found);
    return found;
  }

  /**
   * Formats structured scope into user-friendly plain English string
   * e.g. "All cities in Maharashtra, India", "Mumbai and Pune, India", "All of India", "3 countries"
   */
  formatScopeDescription(scope: StructuredLocationScope): string {
    const { countries, states, cities } = scope;

    if (!countries || countries.length === 0) return "Global";

    if (countries.length > 1) {
      return `${countries.length} countries selected`;
    }

    const countryCode = countries[0];
    const countryName = GLOBAL_COUNTRIES.find(c => c.code === countryCode)?.name || COUNTRY_CONFIGS[countryCode]?.name || countryCode;

    // Check states and cities
    if (cities !== "ALL" && Array.isArray(cities) && cities.length > 0) {
      if (cities.length === 1) {
        return `${cities[0]}, ${countryName}`;
      }
      if (cities.length === 2) {
        return `${cities[0]} and ${cities[1]}, ${countryName}`;
      }
      return `${cities.slice(0, 2).join(", ")} +${cities.length - 2} more, ${countryName}`;
    }

    if (states !== "ALL" && Array.isArray(states) && states.length > 0) {
      if (states.length === 1) {
        return `All cities in ${states[0]}, ${countryName}`;
      }
      return `${states.join(", ")}, ${countryName}`;
    }

    return `All of ${countryName}`;
  }

  /**
   * Converts structured scope to API query string
   */
  toApiLocationString(scope: StructuredLocationScope): string {
    const parts: string[] = [];
    if (scope.area?.trim()) parts.push(scope.area.trim());
    if (scope.postalCode?.trim()) parts.push(scope.postalCode.trim());

    if (scope.cities !== "ALL" && Array.isArray(scope.cities) && scope.cities.length > 0) {
      parts.push(scope.cities.join(", "));
    }

    if (scope.states !== "ALL" && Array.isArray(scope.states) && scope.states.length > 0) {
      parts.push(scope.states.join(", "));
    }

    if (scope.countries && scope.countries.length > 0) {
      const countryNames = scope.countries.map(
        c => GLOBAL_COUNTRIES.find(gc => gc.code === c)?.name || COUNTRY_CONFIGS[c]?.name || c
      );
      parts.push(countryNames.join(", "));
    }

    return parts.filter(Boolean).join(", ") || "Global";
  }
}

export const locationService = new LocationService();
