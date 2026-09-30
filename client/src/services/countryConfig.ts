// Comprehensive Country Configuration with SVG flags, postal codes, and dial codes
export interface CountryConfig {
  code: string;
  name: string;
  dialCode: string;
  postalCodeLabel: string;
  postalCodeRegex?: RegExp;
  postalCodePlaceholder: string;
  popular?: boolean;
}

export const POPULAR_COUNTRY_CODES = ["IN", "US", "GB", "CA", "AU", "AE", "SG", "DE", "FR"];

export const COUNTRY_CONFIGS: Record<string, CountryConfig> = {
  IN: {
    code: "IN",
    name: "India",
    dialCode: "+91",
    postalCodeLabel: "PIN Code",
    postalCodeRegex: /^[1-9][0-9]{5}$/,
    postalCodePlaceholder: "6 digits (e.g. 400001)",
    popular: true,
  },
  US: {
    code: "US",
    name: "United States",
    dialCode: "+1",
    postalCodeLabel: "ZIP Code",
    postalCodeRegex: /^\d{5}(-\d{4})?$/,
    postalCodePlaceholder: "5 digits (e.g. 90210)",
    popular: true,
  },
  GB: {
    code: "GB",
    name: "United Kingdom",
    dialCode: "+44",
    postalCodeLabel: "Postcode",
    postalCodeRegex: /^[A-Z]{1,2}[0-9][0-9A-Z]?\s?[0-9][A-Z]{2}$/i,
    postalCodePlaceholder: "e.g. SW1A 1AA",
    popular: true,
  },
  CA: {
    code: "CA",
    name: "Canada",
    dialCode: "+1",
    postalCodeLabel: "Postal Code",
    postalCodeRegex: /^[A-Za-z]\d[A-Za-z][ -]?\d[A-Za-z]\d$/,
    postalCodePlaceholder: "A1A 1A1",
    popular: true,
  },
  AU: {
    code: "AU",
    name: "Australia",
    dialCode: "+61",
    postalCodeLabel: "Postcode",
    postalCodeRegex: /^\d{4}$/,
    postalCodePlaceholder: "4 digits (e.g. 2000)",
    popular: true,
  },
  AE: {
    code: "AE",
    name: "United Arab Emirates",
    dialCode: "+971",
    postalCodeLabel: "Makani / Area Code",
    postalCodePlaceholder: "Makani No. or Area",
    popular: true,
  },
  SG: {
    code: "SG",
    name: "Singapore",
    dialCode: "+65",
    postalCodeLabel: "Postal Code",
    postalCodeRegex: /^\d{6}$/,
    postalCodePlaceholder: "6 digits (e.g. 238858)",
    popular: true,
  },
  DE: {
    code: "DE",
    name: "Germany",
    dialCode: "+49",
    postalCodeLabel: "PLZ (Postleitzahl)",
    postalCodeRegex: /^\d{5}$/,
    postalCodePlaceholder: "5 digits (e.g. 10115)",
    popular: true,
  },
  FR: {
    code: "FR",
    name: "France",
    dialCode: "+33",
    postalCodeLabel: "Code Postal",
    postalCodeRegex: /^\d{5}$/,
    postalCodePlaceholder: "5 digits (e.g. 75001)",
    popular: true,
  },
  JP: {
    code: "JP",
    name: "Japan",
    dialCode: "+81",
    postalCodeLabel: "Postal Code",
    postalCodeRegex: /^\d{3}-?\d{4}$/,
    postalCodePlaceholder: "7 digits (e.g. 100-0001)",
  },
  BR: {
    code: "BR",
    name: "Brazil",
    dialCode: "+55",
    postalCodeLabel: "CEP",
    postalCodeRegex: /^\d{5}-?\d{3}$/,
    postalCodePlaceholder: "8 digits (e.g. 01310-100)",
  },
  ZA: {
    code: "ZA",
    name: "South Africa",
    dialCode: "+27",
    postalCodeLabel: "Postal Code",
    postalCodeRegex: /^\d{4}$/,
    postalCodePlaceholder: "4 digits (e.g. 2000)",
  },
  NZ: {
    code: "NZ",
    name: "New Zealand",
    dialCode: "+64",
    postalCodeLabel: "Postcode",
    postalCodeRegex: /^\d{4}$/,
    postalCodePlaceholder: "4 digits (e.g. 1010)",
  },
  NL: {
    code: "NL",
    name: "Netherlands",
    dialCode: "+31",
    postalCodeLabel: "Postcode",
    postalCodeRegex: /^\d{4}\s?[A-Za-z]{2}$/,
    postalCodePlaceholder: "e.g. 1012 JS",
  },
  ES: {
    code: "ES",
    name: "Spain",
    dialCode: "+34",
    postalCodeLabel: "Código Postal",
    postalCodeRegex: /^\d{5}$/,
    postalCodePlaceholder: "5 digits (e.g. 28001)",
  },
  IT: {
    code: "IT",
    name: "Italy",
    dialCode: "+39",
    postalCodeLabel: "CAP",
    postalCodeRegex: /^\d{5}$/,
    postalCodePlaceholder: "5 digits (e.g. 00185)",
  },
  SA: {
    code: "SA",
    name: "Saudi Arabia",
    dialCode: "+966",
    postalCodeLabel: "Postal Code",
    postalCodeRegex: /^\d{5}$/,
    postalCodePlaceholder: "5 digits",
  },
  MY: {
    code: "MY",
    name: "Malaysia",
    dialCode: "+60",
    postalCodeLabel: "Poskod",
    postalCodeRegex: /^\d{5}$/,
    postalCodePlaceholder: "5 digits (e.g. 50000)",
  },
  ID: {
    code: "ID",
    name: "Indonesia",
    dialCode: "+62",
    postalCodeLabel: "Kode Pos",
    postalCodeRegex: /^\d{5}$/,
    postalCodePlaceholder: "5 digits",
  },
  IE: {
    code: "IE",
    name: "Ireland",
    dialCode: "+353",
    postalCodeLabel: "Eircode",
    postalCodePlaceholder: "e.g. D02 X285",
  },
  CH: {
    code: "CH",
    name: "Switzerland",
    dialCode: "+41",
    postalCodeLabel: "PLZ",
    postalCodeRegex: /^\d{4}$/,
    postalCodePlaceholder: "4 digits (e.g. 8001)",
  },
  SE: {
    code: "SE",
    name: "Sweden",
    dialCode: "+46",
    postalCodeLabel: "Postnummer",
    postalCodeRegex: /^\d{3}\s?\d{2}$/,
    postalCodePlaceholder: "5 digits (e.g. 111 22)",
  },
};

export function getCountryConfig(code: string): CountryConfig {
  return COUNTRY_CONFIGS[code.toUpperCase()] || {
    code: code.toUpperCase(),
    name: code,
    dialCode: "",
    postalCodeLabel: "Postal Code",
    postalCodePlaceholder: "Enter postal code",
  };
}

export function validatePostalCode(code: string, value: string): { valid: boolean; message?: string } {
  if (!value || !value.trim()) return { valid: true };
  const config = getCountryConfig(code);
  if (!config.postalCodeRegex) return { valid: true };
  const isValid = config.postalCodeRegex.test(value.trim());
  return {
    valid: isValid,
    message: isValid ? undefined : `Invalid ${config.postalCodeLabel} format (expected: ${config.postalCodePlaceholder})`,
  };
}
