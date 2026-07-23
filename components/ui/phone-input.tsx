"use client";

import * as React from "react";
import { useAuth } from "@/context/AuthContext";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  SUPPORTED_COUNTRIES,
  parseE164,
  formatToE164,
  formatNationalNumber,
} from "@/lib/phone-utils";
import { CountryCode } from "libphonenumber-js";

export interface PhoneInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  id?: string;
  error?: boolean;
}

export function PhoneInput({
  value,
  onChange,
  placeholder = "Phone number",
  className,
  disabled = false,
  id,
  error = false,
}: PhoneInputProps) {
  const { userData } = useAuth();
  
  // Resolve default country based on user settings, fallback to LK (Sri Lanka)
  const defaultCountryCode = (userData?.country || "LK") as CountryCode;
  
  // Local state for tracking current selection
  const [selectedCountry, setSelectedCountry] = React.useState<CountryCode>(defaultCountryCode);
  const [inputValue, setInputValue] = React.useState<string>("");

  // Update selected country if default changes and no value is loaded
  React.useEffect(() => {
    if (!value && userData?.country) {
      setSelectedCountry(userData.country as CountryCode);
    }
  }, [userData?.country, value]);

  // Synchronize internal state with external value changes
  React.useEffect(() => {
    if (value) {
      const parsed = parseE164(value);
      if (parsed) {
        setSelectedCountry(parsed.countryCode);
        setInputValue(formatNationalNumber(parsed.nationalNumber, parsed.countryCode));
      } else {
        // If it isn't a valid E.164, try to check if it contains a known dialCode prefix
        const cleanVal = value.replace(/\s+/g, "");
        const matched = SUPPORTED_COUNTRIES.find((c) => cleanVal.startsWith(c.dialCode));
        if (matched) {
          setSelectedCountry(matched.code);
          const national = cleanVal.slice(matched.dialCode.length);
          setInputValue(formatNationalNumber(national, matched.code));
        } else {
          setInputValue(value);
        }
      }
    } else {
      setInputValue("");
    }
  }, [value]);

  const activeCountryInfo = React.useMemo(() => {
    return SUPPORTED_COUNTRIES.find((c) => c.code === selectedCountry) || SUPPORTED_COUNTRIES[0];
  }, [selectedCountry]);

  // Handle number input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value;
    setInputValue(rawVal);

    // Keep numbers and allowed separators
    const digits = rawVal.replace(/[^\d+]/g, "");
    if (!digits) {
      onChange("");
      return;
    }

    // Try formatting to E.164; if invalid, pass raw representation with dial code
    const formatted = formatToE164(digits, selectedCountry);
    if (formatted) {
      onChange(formatted);
    } else {
      // Fallback: prepend dialCode if it doesn't already have it
      if (digits.startsWith("+")) {
        onChange(digits);
      } else {
        const withoutLeadingZero = digits.replace(/^0+/, "");
        onChange(`${activeCountryInfo.dialCode}${withoutLeadingZero}`);
      }
    }
  };

  // Handle select country code updates
  const handleCountryChange = (countryCodeVal: string) => {
    const newCode = countryCodeVal as CountryCode;
    setSelectedCountry(newCode);
    
    const countryInfo = SUPPORTED_COUNTRIES.find((c) => c.code === newCode) || activeCountryInfo;
    
    // Recalculate output with new country selection context
    const cleanDigits = inputValue.replace(/[^\d]/g, "").replace(/^0+/, "");
    if (cleanDigits) {
      const formatted = formatToE164(cleanDigits, newCode);
      if (formatted) {
        onChange(formatted);
      } else {
        onChange(`${countryInfo.dialCode}${cleanDigits}`);
      }
    }
  };

  // On blur, auto-format the national number block
  const handleBlur = () => {
    if (inputValue) {
      const cleanDigits = inputValue.replace(/[^\d]/g, "");
      setInputValue(formatNationalNumber(cleanDigits, selectedCountry));
    }
  };

  return (
    <div className={cn("flex flex-row items-center gap-2", className)}>
      <Select
        value={selectedCountry}
        onValueChange={handleCountryChange}
        disabled={disabled}
      >
        <SelectTrigger
          size="default"
          className={cn(
            "w-[110px] bg-slate-50 border-slate-200 text-slate-700 font-medium shrink-0 dark:bg-[#0b0f19]/60 dark:border-white/10 dark:text-slate-200",
            error && "border-destructive text-destructive"
          )}
        >
          <div className="flex items-center gap-1.5 justify-start text-xs">
            <span className="text-base leading-none">{activeCountryInfo.flag}</span>
            <span>{activeCountryInfo.dialCode}</span>
          </div>
        </SelectTrigger>
        <SelectContent className="max-h-[300px]">
          {SUPPORTED_COUNTRIES.map((c) => (
            <SelectItem key={c.code} value={c.code}>
              <div className="flex items-center gap-2 text-xs">
                <span className="text-base leading-none">{c.flag}</span>
                <span className="font-semibold text-slate-650 dark:text-slate-350">{c.dialCode}</span>
                <span className="text-slate-400 font-normal truncate max-w-[120px]">{c.name}</span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Input
        id={id}
        type="tel"
        value={inputValue}
        onChange={handleInputChange}
        onBlur={handleBlur}
        placeholder={placeholder}
        disabled={disabled}
        className={cn(
          "flex-1 bg-slate-50 border-slate-200 text-slate-700 dark:bg-[#0b0f19]/60 dark:border-white/10 dark:text-slate-200",
          error && "border-destructive focus-visible:ring-destructive/20"
        )}
      />
    </div>
  );
}
