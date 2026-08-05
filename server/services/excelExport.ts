import * as XLSX from "xlsx";
import type { ScrapedBusiness } from "./scraper";

export interface ExportData {
  businessType: string;
  location: string;
  results: ScrapedBusiness[];
}

// Removed getSalesPalPitch function

/**
 * Generate an Excel file with two sheets:
 * Sheet 1: Mobile/Phone Numbers
 * Sheet 2: Emails
 */
export function generateExcelExport(data: ExportData): Buffer {
  const workbook = XLSX.utils.book_new();

  // Sheet 1: Phone Numbers
  const phoneData = [
    ["Business Name", "Phone Number", "Address", "Source", "Category", "Pitch"],
    ...data.results
      .filter(b => b.phone)
      .map(b => [
        b.name,
        b.phone,
        b.address || "",
        b.source,
        b.category || data.businessType,
        b.notes || "",
      ]),
  ];

  const phoneSheet = XLSX.utils.aoa_to_sheet(phoneData);
  // Set column widths
  phoneSheet["!cols"] = [
    { wch: 35 }, // Business Name
    { wch: 20 }, // Phone Number
    { wch: 40 }, // Address
    { wch: 15 }, // Source
    { wch: 20 }, // Category
    { wch: 70 }, // Pitch
  ];
  XLSX.utils.book_append_sheet(workbook, phoneSheet, "Phone Numbers");

  // Sheet 2: Emails
  const emailData = [
    ["Business Name", "Email", "Website", "Source", "Category", "Pitch"],
    ...data.results
      .filter(b => b.email)
      .map(b => [
        b.name,
        b.email,
        b.website || "",
        b.source,
        b.category || data.businessType,
        b.notes || "",
      ]),
  ];

  const emailSheet = XLSX.utils.aoa_to_sheet(emailData);
  emailSheet["!cols"] = [
    { wch: 35 }, // Business Name
    { wch: 35 }, // Email
    { wch: 40 }, // Website
    { wch: 15 }, // Source
    { wch: 20 }, // Category
    { wch: 70 }, // Pitch
  ];
  XLSX.utils.book_append_sheet(workbook, emailSheet, "Emails");

  // Generate buffer
  const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "buffer" });
  return excelBuffer;
}

/**
 * Generate a full CSV export (all fields)
 */
export function generateFullExportCSV(data: ExportData): string {
  const headers = ["Business Name", "Phone", "Email", "Address", "Website", "Source", "Category", "Rating", "Pitch"];
  const rows = data.results.map(b => [
    b.name,
    b.phone || "",
    b.email || "",
    b.address || "",
    b.website || "",
    b.source,
    b.category || data.businessType,
    b.rating || "",
    b.notes || "",
  ]);

  const csvRows = [headers, ...rows];
  return csvRows.map(row => row.map(cell => `"${(cell || "").replace(/"/g, '""')}"`).join(",")).join("\n");
}

/**
 * Generate a single Excel file with one sheet per business type.
 * Used for "Export All" functionality.
 */
export interface AllExportEntry {
  businessType: string;
  location: string;
  results: ScrapedBusiness[];
}

export function generateAllInOneExcel(entries: AllExportEntry[]): Buffer {
  const workbook = XLSX.utils.book_new();

  // Group by businessType, merging results across different locations
  const grouped = new Map<string, ScrapedBusiness[]>();
  for (const entry of entries) {
    const key = entry.businessType;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(...entry.results);
  }

  for (const [bizType, results] of grouped.entries()) {
    // Deduplicate within the group
    const seen = new Set<string>();
    const unique = results.filter(r => {
      const k = r.name.toLowerCase().trim();
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });

    const sheetData = [
      ["Business Name", "Phone", "Email", "Address", "Website", "Source", "Category", "Rating", "Pitch"],
      ...unique.map(b => [
        b.name,
        b.phone || "",
        b.email || "",
        b.address || "",
        b.website || "",
        b.source,
        b.category || bizType,
        b.rating || "",
        b.notes || "",
      ]),
    ];

    const sheet = XLSX.utils.aoa_to_sheet(sheetData);
    sheet["!cols"] = [
      { wch: 35 }, // Business Name
      { wch: 18 }, // Phone
      { wch: 32 }, // Email
      { wch: 40 }, // Address
      { wch: 30 }, // Website
      { wch: 14 }, // Source
      { wch: 20 }, // Category
      { wch: 8  }, // Rating
      { wch: 70 }, // Pitch
    ];

    // Excel sheet names max 31 chars, no special chars
    const safeName = bizType.replace(/[\\/*?:[\]]/g, "").slice(0, 31) || "Sheet";
    XLSX.utils.book_append_sheet(workbook, sheet, safeName);
  }

  const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "buffer" });
  return excelBuffer;
}

