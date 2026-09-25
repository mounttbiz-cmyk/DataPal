export type CategoryGroup = {
  id: string;
  name: string;
  icon: string;
  subcategories: string[];
};

export const CATEGORY_GROUPS: CategoryGroup[] = [
  {
    id: "healthcare",
    name: "Healthcare & Medical",
    icon: "Stethoscope",
    subcategories: [
      "Hospitals",
      "Medical Clinics",
      "Dental Clinics",
      "Pharmacies",
      "Diagnostic Centers",
      "Physical Therapy",
      "Optometrists",
      "Mental Health Clinics"
    ]
  },
  {
    id: "food_hospitality",
    name: "Food, Dining & Hospitality",
    icon: "Utensils",
    subcategories: [
      "Restaurants",
      "Cafes & Coffee Shops",
      "Hotels",
      "Resorts",
      "Bakeries",
      "Bars & Pubs",
      "Catering Services",
      "Food Delivery Hubs"
    ]
  },
  {
    id: "real_estate",
    name: "Real Estate & Construction",
    icon: "Building",
    subcategories: [
      "Real Estate Developers",
      "Builders & Contractors",
      "Architects",
      "Interior Designers",
      "Real Estate Agencies",
      "Property Management",
      "Commercial Real Estate"
    ]
  },
  {
    id: "technology",
    name: "Technology & IT",
    icon: "Laptop",
    subcategories: [
      "IT & Software Companies",
      "SaaS Startups",
      "Tech Consulting",
      "Web Design & Development",
      "Cybersecurity Firms",
      "Cloud Solutions",
      "AI & Automation Services"
    ]
  },
  {
    id: "retail_ecommerce",
    name: "Retail & E-Commerce",
    icon: "ShoppingBag",
    subcategories: [
      "Retail Stores",
      "E-commerce Brands",
      "Supermarkets & Grocery",
      "Fashion & Apparel",
      "Electronics Stores",
      "Jewelry & Watches",
      "Wholesalers & Distributors"
    ]
  },
  {
    id: "professional_services",
    name: "Professional & Legal Services",
    icon: "Briefcase",
    subcategories: [
      "Law Firms & Attorneys",
      "Chartered Accountants (CA/CPA)",
      "Consulting Firms",
      "Marketing & Advertising Agencies",
      "Public Relations (PR)",
      "Financial Advisors",
      "Tax Consultants"
    ]
  },
  {
    id: "fitness_beauty",
    name: "Fitness, Beauty & Wellness",
    icon: "Sparkles",
    subcategories: [
      "Gyms & Fitness Centers",
      "Yoga & Pilates Studios",
      "Salons & Hairdressers",
      "Spas & Wellness Centers",
      "Nail Salons",
      "Aesthetic Clinics"
    ]
  },
  {
    id: "finance_banking",
    name: "Finance & Banking",
    icon: "Landmark",
    subcategories: [
      "Banks",
      "Investment Firms",
      "Insurance Companies",
      "Wealth Management",
      "Mortgage Brokers"
    ]
  },
  {
    id: "education",
    name: "Education & Academics",
    icon: "GraduationCap",
    subcategories: [
      "Universities",
      "Colleges",
      "Private Schools",
      "Coaching Centers",
      "Tuition & Tutoring Centers",
      "Vocational Training Institutes"
    ]
  },
  {
    id: "logistics_automotive",
    name: "Logistics, Transport & Auto",
    icon: "Truck",
    subcategories: [
      "Manufacturing Units",
      "Logistics & Freight",
      "Transport Companies",
      "Auto Dealerships",
      "Auto Repair & Garages"
    ]
  }
];

export const ALL_SUBCATEGORIES = CATEGORY_GROUPS.flatMap(c => c.subcategories);
