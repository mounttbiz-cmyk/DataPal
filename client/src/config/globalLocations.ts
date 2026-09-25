export type CountryData = {
  code: string;
  name: string;
  flag: string;
  phonePrefix: string;
  postalCodeLabel: string; // e.g. "ZIP Code", "Postal Code", "PIN Code"
  states: {
    name: string;
    cities: string[];
  }[];
};

export const GLOBAL_COUNTRIES: CountryData[] = [
  {
    code: "US",
    name: "United States",
    flag: "🇺🇸",
    phonePrefix: "+1",
    postalCodeLabel: "ZIP Code",
    states: [
      {
        name: "California",
        cities: ["Los Angeles", "San Francisco", "San Diego", "San Jose", "Beverly Hills", "Irvine", "Sacramento", "Oakland"]
      },
      {
        name: "New York",
        cities: ["New York City", "Manhattan", "Brooklyn", "Queens", "Buffalo", "Rochester", "Albany", "Syracuse"]
      },
      {
        name: "Texas",
        cities: ["Houston", "Austin", "Dallas", "San Antonio", "Fort Worth", "Plano", "Arlington", "El Paso"]
      },
      {
        name: "Florida",
        cities: ["Miami", "Orlando", "Tampa", "Fort Lauderdale", "Jacksonville", "St. Petersburg", "Boca Raton"]
      },
      {
        name: "Illinois",
        cities: ["Chicago", "Naperville", "Aurora", "Rockford", "Joliet", "Evanston"]
      },
      {
        name: "Washington",
        cities: ["Seattle", "Bellevue", "Tacoma", "Spokane", "Redmond", "Vancouver"]
      },
      {
        name: "Massachusetts",
        cities: ["Boston", "Cambridge", "Worcester", "Springfield", "Lowell", "Quincy"]
      },
      {
        name: "Georgia",
        cities: ["Atlanta", "Savannah", "Augusta", "Athens", "Alpharetta", "Roswell"]
      }
    ]
  },
  {
    code: "IN",
    name: "India",
    flag: "🇮🇳",
    phonePrefix: "+91",
    postalCodeLabel: "PIN Code",
    states: [
      {
        name: "Maharashtra",
        cities: ["Mumbai", "Pune", "Nagpur", "Thane", "Nashik", "Aurangabad", "Navi Mumbai", "Solapur"]
      },
      {
        name: "Delhi NCR",
        cities: ["New Delhi", "Noida", "Gurgaon", "Ghaziabad", "Faridabad", "South Delhi", "Connaught Place"]
      },
      {
        name: "Karnataka",
        cities: ["Bangalore", "Mysore", "Hubli-Dharwad", "Mangalore", "Belgaum", "Gulbarga"]
      },
      {
        name: "Tamil Nadu",
        cities: ["Chennai", "Coimbatore", "Madurai", "Tiruchirappalli", "Salem", "Tiruppur", "Vellore"]
      },
      {
        name: "Telangana",
        cities: ["Hyderabad", "Warangal", "Nizamabad", "Karimnagar", "Secunderabad"]
      },
      {
        name: "Gujarat",
        cities: ["Ahmedabad", "Surat", "Vadodara", "Rajkot", "Bhavnagar", "Jamnagar", "Gandhinagar"]
      },
      {
        name: "Uttar Pradesh",
        cities: ["Lucknow", "Kanpur", "Varanasi", "Agra", "Prayagraj (Allahabad)", "Meerut", "Bareilly", "Aligarh"]
      },
      {
        name: "West Bengal",
        cities: ["Kolkata", "Howrah", "Durgapur", "Asansol", "Siliguri"]
      },
      {
        name: "Rajasthan",
        cities: ["Jaipur", "Jodhpur", "Kota", "Udaipur", "Ajmer", "Bikaner"]
      },
      {
        name: "Punjab & Chandigarh",
        cities: ["Chandigarh", "Ludhiana", "Amritsar", "Jalandhar", "Patiala", "Mohali"]
      },
      {
        name: "Kerala",
        cities: ["Kochi", "Thiruvananthapuram", "Kozhikode", "Thrissur", "Kollam"]
      },
      {
        name: "Madhya Pradesh",
        cities: ["Indore", "Bhopal", "Jabalpur", "Gwalior", "Ujjain"]
      }
    ]
  },
  {
    code: "GB",
    name: "United Kingdom",
    flag: "🇬🇧",
    phonePrefix: "+44",
    postalCodeLabel: "Postal Code",
    states: [
      {
        name: "Greater London & South East",
        cities: ["London", "Westminster", "Canary Wharf", "Camden", "Brighton", "Oxford", "Southampton"]
      },
      {
        name: "Greater Manchester & North West",
        cities: ["Manchester", "Liverpool", "Salford", "Preston", "Chester", "Bolton"]
      },
      {
        name: "West Midlands",
        cities: ["Birmingham", "Coventry", "Wolverhampton", "Solihull", "Dudley"]
      },
      {
        name: "West & South Yorkshire",
        cities: ["Leeds", "Sheffield", "Bradford", "York", "Huddersfield"]
      },
      {
        name: "Scotland",
        cities: ["Glasgow", "Edinburgh", "Aberdeen", "Dundee", "Stirling"]
      },
      {
        name: "Wales",
        cities: ["Cardiff", "Swansea", "Newport", "Wrexham"]
      },
      {
        name: "Northern Ireland",
        cities: ["Belfast", "Derry", "Lisburn", "Newry"]
      }
    ]
  },
  {
    code: "CA",
    name: "Canada",
    flag: "🇨🇦",
    phonePrefix: "+1",
    postalCodeLabel: "Postal Code",
    states: [
      {
        name: "Ontario",
        cities: ["Toronto", "Ottawa", "Mississauga", "Brampton", "Hamilton", "London", "Markham", "Vaughan"]
      },
      {
        name: "British Columbia",
        cities: ["Vancouver", "Surrey", "Burnaby", "Richmond", "Victoria", "Kelowna"]
      },
      {
        name: "Quebec",
        cities: ["Montreal", "Quebec City", "Laval", "Gatineau", "Longueuil"]
      },
      {
        name: "Alberta",
        cities: ["Calgary", "Edmonton", "Red Deer", "Lethbridge"]
      }
    ]
  },
  {
    code: "AU",
    name: "Australia",
    flag: "🇦🇺",
    phonePrefix: "+61",
    postalCodeLabel: "Postcode",
    states: [
      {
        name: "New South Wales",
        cities: ["Sydney", "Newcastle", "Central Coast", "Wollongong", "Parramatta"]
      },
      {
        name: "Victoria",
        cities: ["Melbourne", "Geelong", "Ballarat", "Bendigo"]
      },
      {
        name: "Queensland",
        cities: ["Brisbane", "Gold Coast", "Sunshine Coast", "Townsville", "Cairns"]
      },
      {
        name: "Western Australia",
        cities: ["Perth", "Fremantle", "Mandurah", "Bunbury"]
      },
      {
        name: "South Australia",
        cities: ["Adelaide", "Mount Gambier", "Whyalla"]
      }
    ]
  },
  {
    code: "AE",
    name: "United Arab Emirates",
    flag: "🇦🇪",
    phonePrefix: "+971",
    postalCodeLabel: "Makani / PO Box",
    states: [
      {
        name: "Dubai",
        cities: ["Downtown Dubai", "Dubai Marina", "Business Bay", "Deira", "Jumeirah", "JLT", "Al Barsha"]
      },
      {
        name: "Abu Dhabi",
        cities: ["Abu Dhabi City", "Al Reem Island", "Yas Island", "Al Ain", "Khalifa City"]
      },
      {
        name: "Sharjah & Northern Emirates",
        cities: ["Sharjah City", "Ajman", "Ras Al Khaimah", "Fujairah", "Umm Al Quwain"]
      }
    ]
  },
  {
    code: "DE",
    name: "Germany",
    flag: "🇩🇪",
    phonePrefix: "+49",
    postalCodeLabel: "PLZ (Postleitzahl)",
    states: [
      {
        name: "Berlin",
        cities: ["Berlin", "Mitte", "Charlottenburg", "Kreuzberg"]
      },
      {
        name: "Bavaria",
        cities: ["Munich", "Nuremberg", "Augsburg", "Regensburg", "Ingolstadt"]
      },
      {
        name: "North Rhine-Westphalia",
        cities: ["Cologne", "Düsseldorf", "Dortmund", "Essen", "Bonn"]
      },
      {
        name: "Hesse",
        cities: ["Frankfurt", "Wiesbaden", "Kassel", "Darmstadt"]
      },
      {
        name: "Hamburg",
        cities: ["Hamburg", "Altona", "Wandsbek"]
      }
    ]
  },
  {
    code: "SG",
    name: "Singapore",
    flag: "🇸🇬",
    phonePrefix: "+65",
    postalCodeLabel: "Postal Code",
    states: [
      {
        name: "Singapore Island",
        cities: ["Marina Bay", "Orchard", "Central Business District (CBD)", "Jurong", "Tampines", "Woodlands"]
      }
    ]
  },
  {
    code: "FR",
    name: "France",
    flag: "🇫🇷",
    phonePrefix: "+33",
    postalCodeLabel: "Code Postal",
    states: [
      {
        name: "Île-de-France",
        cities: ["Paris", "Boulogne-Billancourt", "Saint-Denis", "Versailles", "Nanterre"]
      },
      {
        name: "Auvergne-Rhône-Alpes",
        cities: ["Lyon", "Grenoble", "Saint-Étienne", "Annecy", "Clermont-Ferrand"]
      },
      {
        name: "Provence-Alpes-Côte d'Azur",
        cities: ["Marseille", "Nice", "Toulon", "Aix-en-Provence", "Cannes"]
      }
    ]
  }
];
