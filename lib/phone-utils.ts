import { parsePhoneNumberFromString, CountryCode } from "libphonenumber-js";

export interface CountryInfo {
  name: string;
  code: CountryCode;
  dialCode: string;
  flag: string;
}

export const SUPPORTED_COUNTRIES: CountryInfo[] = [
  { name: "Sri Lanka", code: "LK", dialCode: "+94", flag: "🇱🇰" },
  { name: "United States", code: "US", dialCode: "+1", flag: "🇺🇸" },
  { name: "Canada", code: "CA", dialCode: "+1", flag: "🇨🇦" },
  { name: "United Kingdom", code: "GB", dialCode: "+44", flag: "🇬🇧" },
  { name: "Australia", code: "AU", dialCode: "+61", flag: "🇦🇺" },
  { name: "New Zealand", code: "NZ", dialCode: "+64", flag: "🇳🇿" },
  { name: "India", code: "IN", dialCode: "+91", flag: "🇮🇳" },
  { name: "Pakistan", code: "PK", dialCode: "+92", flag: "🇵🇰" },
  { name: "Bangladesh", code: "BD", dialCode: "+880", flag: "🇧🇩" },
  { name: "Nepal", code: "NP", dialCode: "+977", flag: "🇳🇵" },
  { name: "Singapore", code: "SG", dialCode: "+65", flag: "🇸🇬" },
  { name: "Malaysia", code: "MY", dialCode: "+60", flag: "🇲🇾" },
  { name: "Indonesia", code: "ID", dialCode: "+62", flag: "🇮🇩" },
  { name: "Philippines", code: "PH", dialCode: "+63", flag: "🇵🇭" },
  { name: "Thailand", code: "TH", dialCode: "+66", flag: "🇹🇭" },
  { name: "Vietnam", code: "VN", dialCode: "+84", flag: "🇻🇳" },
  { name: "Japan", code: "JP", dialCode: "+81", flag: "🇯🇵" },
  { name: "South Korea", code: "KR", dialCode: "+82", flag: "🇰🇷" },
  { name: "China", code: "CN", dialCode: "+86", flag: "🇨🇳" },
  { name: "Hong Kong", code: "HK", dialCode: "+852", flag: "🇭🇰" },
  { name: "United Arab Emirates", code: "AE", dialCode: "+971", flag: "🇦🇪" },
  { name: "Saudi Arabia", code: "SA", dialCode: "+966", flag: "🇸🇦" },
  { name: "Qatar", code: "QA", dialCode: "+974", flag: "🇶🇦" },
  { name: "Kuwait", code: "KW", dialCode: "+965", flag: "🇰🇼" },
  { name: "Germany", code: "DE", dialCode: "+49", flag: "🇩🇪" },
  { name: "France", code: "FR", dialCode: "+33", flag: "🇫🇷" },
  { name: "Italy", code: "IT", dialCode: "+39", flag: "🇮🇹" },
  { name: "Spain", code: "ES", dialCode: "+34", flag: "🇪🇸" },
  { name: "Netherlands", code: "NL", dialCode: "+31", flag: "🇳🇱" },
  { name: "Switzerland", code: "CH", dialCode: "+41", flag: "🇨🇭" },
  { name: "South Africa", code: "ZA", dialCode: "+27", flag: "🇿🇦" },
  { name: "Nigeria", code: "NG", dialCode: "+234", flag: "🇳🇬" },
  { name: "Kenya", code: "KE", dialCode: "+254", flag: "🇰🇪" },
  { name: "Brazil", code: "BR", dialCode: "+55", flag: "🇧🇷" },
  { name: "Mexico", code: "MX", dialCode: "+52", flag: "🇲🇽" },
];

/**
 * Validates a telephone number against a selected country code.
 */
export function validatePhoneNumber(phone: string, countryCode: CountryCode): boolean {
  if (!phone) return false;
  try {
    const phoneNumber = parsePhoneNumberFromString(phone, countryCode);
    return phoneNumber ? phoneNumber.isValid() : false;
  } catch (e) {
    return false;
  }
}

/**
 * Normalizes and formats a telephone number to E.164 specification.
 */
export function formatToE164(phone: string, countryCode: CountryCode): string | null {
  if (!phone) return null;
  try {
    const phoneNumber = parsePhoneNumberFromString(phone, countryCode);
    return phoneNumber && phoneNumber.isValid() ? phoneNumber.format("E.164") : null;
  } catch (e) {
    return null;
  }
}

/**
 * Formats a telephone number on-the-fly for editing input visualization (e.g. (415) 555-2671).
 */
export function formatNationalNumber(phone: string, countryCode: CountryCode): string {
  if (!phone) return "";
  try {
    const phoneNumber = parsePhoneNumberFromString(phone, countryCode);
    return phoneNumber ? phoneNumber.formatNational() : phone;
  } catch (e) {
    return phone;
  }
}

/**
 * Parses an E.164 formatted string back to country code and its national raw number.
 */
export function parseE164(e164String: string): { countryCode: CountryCode; nationalNumber: string } | null {
  if (!e164String) return null;
  try {
    // If not starting with +, force it
    const formatted = e164String.startsWith("+") ? e164String : `+${e164String}`;
    const parsed = parsePhoneNumberFromString(formatted);
    if (parsed && parsed.country) {
      return {
        countryCode: parsed.country as CountryCode,
        nationalNumber: parsed.nationalNumber,
      };
    }
  } catch (e) {
    // Fail silently
  }
  return null;
}
