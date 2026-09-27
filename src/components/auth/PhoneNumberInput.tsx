'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  AsYouType,
  getCountries,
  getCountryCallingCode,
  parsePhoneNumberFromString,
  type CountryCode,
} from 'libphonenumber-js/mobile';

interface PhoneNumberInputProps {
  /** Called with the E.164-formatted number (e.g. "+8801712345678") and whether it's a valid, deliverable mobile number. */
  onChange: (e164: string, isValid: boolean) => void;
  disabled?: boolean;
  className?: string;
}

function getCountryName(code: string): string {
  try {
    // Intl.DisplayNames avoids needing a separate country-name dataset/dependency.
    return new Intl.DisplayNames(['en'], { type: 'region' }).of(code) || code;
  } catch {
    return code;
  }
}

const ALL_COUNTRIES = getCountries()
  .map((code) => ({
    code,
    name: getCountryName(code),
    dialCode: getCountryCallingCode(code),
  }))
  .sort((a, b) => a.name.localeCompare(b.name));

function guessDefaultCountry(): CountryCode {
  if (typeof navigator !== 'undefined') {
    try {
      const region = navigator.language?.split('-')[1]?.toUpperCase();
      if (region && ALL_COUNTRIES.some((c) => c.code === region)) {
        return region as CountryCode;
      }
    } catch {
      // Fall through to default
    }
  }
  return 'US';
}

export const PhoneNumberInput: React.FC<PhoneNumberInputProps> = ({ onChange, disabled, className }) => {
  const [country, setCountry] = useState<CountryCode>('US');
  const [nationalInput, setNationalInput] = useState('');
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    setCountry(guessDefaultCountry());
  }, []);

  const validation = useMemo(() => {
    if (!nationalInput.trim()) return { e164: '', isValid: false };
    const parsed = parsePhoneNumberFromString(nationalInput, country);
    return { e164: parsed?.number || '', isValid: parsed?.isValid() || false };
  }, [nationalInput, country]);

  useEffect(() => {
    onChange(validation.e164, validation.isValid);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [validation.e164, validation.isValid]);

  const handleNationalChange = (raw: string) => {
    setNationalInput(new AsYouType(country).input(raw));
  };

  const exampleNumber = useMemo(() => {
    // A short, illustrative placeholder — not a real validated example, just a length hint.
    return country === 'US' ? '415 555 0123' : '712 345 678';
  }, [country]);

  return (
    <div className={className}>
      <div className="flex gap-2">
        <select
          value={country}
          onChange={(e) => setCountry(e.target.value as CountryCode)}
          disabled={disabled}
          aria-label="Country code"
          className="shrink-0 w-[130px] rounded-xl border border-slate-300 bg-white px-2.5 py-2.5 text-xs text-slate-700 focus:border-indigo-600 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all"
        >
          {ALL_COUNTRIES.map((c) => (
            <option key={c.code} value={c.code}>
              {c.name} (+{c.dialCode})
            </option>
          ))}
        </select>
        <input
          type="tel"
          inputMode="tel"
          required
          disabled={disabled}
          value={nationalInput}
          onChange={(e) => handleNationalChange(e.target.value)}
          onBlur={() => setTouched(true)}
          placeholder={exampleNumber}
          className={`flex-1 min-w-0 rounded-xl border px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-4 transition-all ${
            touched && nationalInput && !validation.isValid
              ? 'border-rose-300 focus:border-rose-500 focus:ring-rose-500/10'
              : 'border-slate-300 focus:border-indigo-600 focus:ring-indigo-500/10'
          }`}
        />
      </div>
      {touched && nationalInput && !validation.isValid && (
        <p className="text-[11px] text-rose-600 mt-1.5">
          That doesn&apos;t look like a valid mobile number for the selected country.
        </p>
      )}
    </div>
  );
};

export default PhoneNumberInput;
