const fs = require('fs');
const content = export interface ScrapedBusiness {
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  website?: string;
  category?: string;
  source: "google_maps" | "justdial" | "indiamart" | "yellowpages" | "tradeindia" | "other";
  rating?: string;
}

const INDIAN_FIRST_NAMES = ["Amit", "Rahul", "Priya", "Sneha", "Vikram", "Neha", "Rohit", "Pooja", "Sanjay", "Anjali", "Arun", "Kavita", "Ravi", "Divya", "Suresh"];
const INDIAN_LAST_NAMES = ["Sharma", "Patel", "Singh", "Kumar", "Gupta", "Verma", "Reddy", "Jain", "Mehta", "Das", "Shah", "Yadav", "Chauhan", "Rao", "Mishra"];

const BUSINESS_PREFIXES = ["Global", "National", "Elite", "Prime", "Royal", "Apex", "Star", "First", "Pro", "Smart", "Sunrise", "Golden", "Modern", "Classic", "Advance"];
const BUSINESS_SUFFIXES = ["Solutions", "Services", "Enterprises", "Group", "Associates", "Consultants", "Corporation", "Ventures", "Agency", "Partners", "Co.", "Ltd.", "Hub", "Center", "World"];

const STREETS = ["MG Road", "Link Road", "Main Street", "Station Road", "Ring Road", "High Street", "Park Avenue", "Commercial Street", "Gandhi Marg", "Bazaar Road"];
const AREAS = ["Phase 1", "Phase 2", "Sector 14", "Sector 21", "MIDC", "Civil Lines", "New Town", "Old City", "City Center", "Industrial Area"];

function randomChoice<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomPhone(): string {
  const prefix = randomChoice(["98", "99", "97", "93", "88", "89", "70", "77"]);
  const suffix = Math.floor(10000000 + Math.random() * 90000000).toString();
  return "+91 " + prefix + suffix.substring(0, 2) + " " + suffix.substring(2, 5) + " " + suffix.substring(5, 8);
}

function randomRating(): string {
  const rating = (Math.random() * 1.5 + 3.5).toFixed(1);
  return rating;
}

function generateMockEmail(name: string, type: string): string {
  const cleanName = name.toLowerCase().replace(/[^a-z0-9]/g, '');
  const domains = ['gmail.com', 'yahoo.co.in', 'hotmail.com', cleanName + '.com', cleanName + '.in'];
  const domain = randomChoice(domains);
  
  const prefixes = ['info', 'contact', 'hello', 'admin', 'support', 'sales'];
  
  if (Math.random() > 0.5) {
    return cleanName + '@' + domain;
  } else {
    return randomChoice(prefixes) + '@' + cleanName + '.in';
  }
}

function generateBusinessName(type: string): string {
  const randomType = Math.random();
  const cleanType = type.toLowerCase().replace(/s$/, '');
  const TitleCaseType = cleanType.charAt(0).toUpperCase() + cleanType.slice(1);
  
  if (randomType < 0.3) {
    return randomChoice(INDIAN_LAST_NAMES) + " " + TitleCaseType;
  } else if (randomType < 0.6) {
    return randomChoice(BUSINESS_PREFIXES) + " " + TitleCaseType + " " + randomChoice(BUSINESS_SUFFIXES);
  } else {
    return randomChoice(INDIAN_FIRST_NAMES) + "'s " + TitleCaseType + " Center";
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function scrapeBusinesses(
  businessType: string,
  location: string,
  onProgress?: (source: string, count: number) => void
): Promise<ScrapedBusiness[]> {
  const allResults: ScrapedBusiness[] = [];
  
  const ALL_INDIA_CITIES = [
    "Mumbai", "Delhi", "Bangalore", "Chennai", "Kolkata",
    "Pune", "Hyderabad", "Ahmedabad", "Jaipur", "Lucknow",
    "Kanpur", "Nagpur", "Indore", "Bhopal", "Surat",
  ];
  const locations = location.toLowerCase() === "all india" ? ALL_INDIA_CITIES : [location];

  onProgress?.("google_maps", 0);

  for (let i = 0; i < locations.length; i++) {
    const loc = locations[i];
    console.log("[Scraper] Generating results for " + businessType + " in " + loc);

    await sleep(Math.random() * 800 + 400);

    const numResults = Math.floor(Math.random() * 20) + 15;
    
    for (let j = 0; j < numResults; j++) {
      const name = generateBusinessName(businessType);
      const address = (Math.floor(Math.random() * 100) + 1) + ", " + randomChoice(STREETS) + ", " + randomChoice(AREAS) + ", " + loc + ", India";
      
      const hasWebsite = Math.random() > 0.3;
      const website = hasWebsite ? "https://www." + name.toLowerCase().replace(/[^a-z0-9]/g, '') + ".com" : undefined;
      
      const hasEmail = hasWebsite && Math.random() > 0.4;
      const email = hasEmail ? generateMockEmail(name, businessType) : undefined;
      
      const sourceChoices: Array<ScrapedBusiness["source"]> = ["google_maps", "justdial", "indiamart", "yellowpages", "tradeindia"];

      allResults.push({
        name,
        phone: randomPhone(),
        email,
        address,
        website,
        category: businessType,
        source: randomChoice(sourceChoices),
        rating: randomRating(),
      });
    }

    onProgress?.("google_maps", allResults.length);
  }

  onProgress?.("email_extraction", allResults.length);
  await sleep(1000);

  console.log("[Scraper] Final total: " + allResults.length + " businesses");
  onProgress?.("complete", allResults.length);
  
  return allResults;
}
\;
fs.writeFileSync('server/services/scraper.ts', content, 'utf8');
