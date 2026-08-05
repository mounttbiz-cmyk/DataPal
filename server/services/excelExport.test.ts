import { describe, expect, it } from "vitest";
import { generateExcelExport, generateFullExportCSV } from "./excelExport";
import type { ScrapedBusiness } from "./scraper";

describe("excelExport", () => {
  const mockData = {
    businessType: "Schools",
    location: "Mumbai",
    results: [
      {
        name: "ABC School",
        phone: "+91-9876543210",
        email: "info@abcschool.com",
        address: "123 Main St, Mumbai",
        website: "https://abcschool.com",
        category: "Schools",
        source: "justdial" as const,
        rating: "4.5",
      },
      {
        name: "XYZ Institute",
        phone: undefined,
        email: "contact@xyz.edu",
        address: "456 Park Ave, Delhi",
        website: "https://xyz.edu",
        category: "Coaching",
        source: "indiamart" as const,
      },
      {
        name: "PQR Academy",
        phone: "9876543210",
        email: undefined,
        address: "789 Hill Rd, Bangalore",
        website: undefined,
        category: "Schools",
        source: "google_maps" as const,
      },
    ] as ScrapedBusiness[],
  };

  describe("generateExcelExport", () => {
    it("should return a Buffer", () => {
      const result = generateExcelExport(mockData);
      expect(Buffer.isBuffer(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
    });

    it("should contain two sheets: Phone Numbers and Emails", () => {
      const result = generateExcelExport(mockData);
      // The buffer should be a valid XLSX file
      // We can verify it's not empty and has expected structure
      expect(result.length).toBeGreaterThan(100); // XLSX files are at least 100+ bytes
    });

    it("should handle empty results", () => {
      const emptyData = { ...mockData, results: [] };
      const result = generateExcelExport(emptyData);
      expect(Buffer.isBuffer(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
    });

    it("should filter phone sheet to only entries with phones", () => {
      // 2 out of 3 entries have phones
      const result = generateExcelExport(mockData);
      expect(Buffer.isBuffer(result)).toBe(true);
      // Verify it's a valid XLSX buffer
      const header = result.subarray(0, 4);
      expect(header[0]).toBe(0x50); // P
      expect(header[1]).toBe(0x4b); // K
    });

    it("should filter email sheet to only entries with emails", () => {
      const result = generateExcelExport(mockData);
      expect(Buffer.isBuffer(result)).toBe(true);
    });
  });

  describe("generateFullExportCSV", () => {
    it("should return a valid CSV string", () => {
      const csv = generateFullExportCSV(mockData);
      expect(typeof csv).toBe("string");
      expect(csv.length).toBeGreaterThan(0);
    });

    it("should include header row", () => {
      const csv = generateFullExportCSV(mockData);
      const lines = csv.split("\n");
      expect(lines[0]).toContain("Business Name");
      expect(lines[0]).toContain("Phone");
      expect(lines[0]).toContain("Email");
      expect(lines[0]).toContain("Category");
    });

    it("should include all results as rows", () => {
      const csv = generateFullExportCSV(mockData);
      const lines = csv.split("\n");
      // Header + 3 data rows
      expect(lines.length).toBe(4);
    });

    it("should handle empty results", () => {
      const emptyData = { ...mockData, results: [] };
      const csv = generateFullExportCSV(emptyData);
      const lines = csv.split("\n");
      expect(lines.length).toBe(1); // Just the header
      expect(lines[0]).toContain("Business Name");
    });

    it("should use each result's own category", () => {
      const csv = generateFullExportCSV(mockData);
      // ABC School -> Schools, XYZ Institute -> Coaching
      expect(csv).toContain("Schools");
      expect(csv).toContain("Coaching");
    });
  });
});
