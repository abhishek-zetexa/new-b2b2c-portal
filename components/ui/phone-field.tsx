"use client";

import { useCallback, useEffect, useRef } from "react";
import {
  CountrySelector,
  FlagImage,
  usePhoneInput,
  type CountryIso2,
  type ParsedCountry,
} from "react-international-phone";
import "react-international-phone/style.css";
import { nationalDigits } from "@/lib/field-rules";
import { FieldLabel, FieldMessage } from "@/components/ui/form-field";
import "./phone-field.css";

const preferredCountries: CountryIso2[] = ["in", "us", "gb", "ae", "sg"];

export type PhoneValue = {
  international: string;
  dialCode: string;
  national: string;
  iso2: string;
};

type PhoneFieldProps = {
  id: string;
  label: string;
  value: string;
  onChange: (next: PhoneValue) => void;
  onBlur?: () => void;
  error?: string;
  required?: boolean;
  placeholder?: string;
  countryIso2?: string;
  disabled?: boolean;
};

export function PhoneField({
  id,
  label,
  value,
  onChange,
  onBlur,
  error = "",
  required,
  placeholder = "Enter phone number",
  countryIso2,
  disabled,
}: PhoneFieldProps) {
  const errorId = error ? `${id}-error` : undefined;
  const lastAppliedCountryRef = useRef<string>("");

  const handlePhoneChange = useCallback(
    (data: { phone: string; country: ParsedCountry }) => {
      const dialCode = `+${data.country.dialCode}`;
      onChange({
        international: data.phone,
        dialCode,
        national: nationalDigits(data.phone, dialCode),
        iso2: data.country.iso2,
      });
    },
    [onChange],
  );

  const { inputValue, inputRef, country, setCountry, handlePhoneValueChange } = usePhoneInput({
    defaultCountry: "in",
    value,
    forceDialCode: true,
    disableDialCodeAndPrefix: true,
    preferredCountries,
    onChange: handlePhoneChange,
  });

  useEffect(() => {
    const normalized = countryIso2?.trim().toLowerCase() ?? "";
    if (!normalized || normalized === lastAppliedCountryRef.current) return;
    lastAppliedCountryRef.current = normalized;
    if (!inputValue.replace(/\D/g, "")) {
      setCountry(normalized as CountryIso2, { focusOnInput: false });
    }
  }, [countryIso2, inputValue, setCountry]);

  const handleCountrySelect = useCallback(
    (selected: ParsedCountry) => {
      setCountry(selected.iso2, { focusOnInput: true });
    },
    [setCountry],
  );

  return (
    <div
      className="phone-field"
      data-invalid={error ? "true" : undefined}
      data-disabled={disabled ? "true" : undefined}
    >
      <FieldLabel htmlFor={id} required={required}>
        {label}
      </FieldLabel>
      <div className="react-international-phone-input-container">
        <CountrySelector
          selectedCountry={country.iso2}
          preferredCountries={preferredCountries}
          disabled={disabled}
          onSelect={handleCountrySelect}
          renderButtonWrapper={({ rootProps }) => {
            const expanded = Boolean(rootProps["aria-expanded"]);
            return (
              <button
                {...rootProps}
                type="button"
                disabled={disabled || rootProps.disabled}
                data-country={country.iso2}
                className={`react-international-phone-country-selector-button${
                  expanded ? " react-international-phone-country-selector-button--active" : ""
                }${disabled ? " react-international-phone-country-selector-button--disabled" : ""}`}
              >
                <span className="react-international-phone-country-selector-button__button-content">
                  <FlagImage
                    iso2={country.iso2}
                    className="react-international-phone-country-selector-button__flag-emoji"
                  />
                  <span className="phone-field-dial-code">+{country.dialCode}</span>
                  <span
                    aria-hidden="true"
                    className={`react-international-phone-country-selector-button__dropdown-arrow${
                      expanded
                        ? " react-international-phone-country-selector-button__dropdown-arrow--active"
                        : ""
                    }`}
                  />
                </span>
              </button>
            );
          }}
        />
        <input
          id={id}
          name={id}
          ref={inputRef}
          type="tel"
          autoComplete="tel"
          value={inputValue}
          disabled={disabled}
          placeholder={placeholder}
          aria-invalid={error ? true : undefined}
          aria-describedby={errorId}
          aria-required={required || undefined}
          className={`react-international-phone-input${
            disabled ? " react-international-phone-input--disabled" : ""
          }`}
          onBlur={onBlur}
          onChange={handlePhoneValueChange}
        />
      </div>
      <FieldMessage id={errorId}>{error}</FieldMessage>
    </div>
  );
}
