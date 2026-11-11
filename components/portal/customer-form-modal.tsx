"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { FlagImage } from "react-international-phone";
import { Modal } from "@/components/ui/modal";
import { Icon } from "@/components/ui/icon";
import { FieldLabel, FieldMessage, TextField } from "@/components/ui/form-field";
import { PhoneField } from "@/components/ui/phone-field";
import { WaveLoader } from "@/components/ui/wave-loader";
import { emailError, nationalDigits, optionalPhoneError, requiredText } from "@/lib/field-rules";
import {
  extractApiFieldErrors,
  type CustomerCountryOption,
  type CustomerFormPayload,
  type CustomerRecord,
} from "@/lib/customers";

const postalPattern = /^[A-Za-z0-9 -]{3,10}$/;

function CountrySearchSelect({
  id,
  label,
  value,
  fallbackName,
  countries,
  loadingCountries,
  disabled,
  required,
  error = "",
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  fallbackName?: string;
  countries: CustomerCountryOption[];
  loadingCountries: boolean;
  disabled?: boolean;
  required?: boolean;
  error?: string;
  onChange: (iso2: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const errorId = error ? `${id}-error` : undefined;

  const selected = useMemo(
    () => countries.find((item) => item.iso2 === value.toUpperCase()),
    [countries, value],
  );

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return countries;
    return countries.filter(
      (item) =>
        item.name.toLowerCase().includes(term) ||
        item.iso2.toLowerCase().includes(term),
    );
  }, [countries, search]);

  useEffect(() => {
    if (!open) return;
    searchRef.current?.focus();

    function onPointerDown(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.stopPropagation();
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const displayName = selected?.name || (value ? fallbackName || value : "");
  const displayIso2 = (selected?.iso2 || value).toLowerCase();

  return (
    <div ref={containerRef} className="relative">
      <FieldLabel htmlFor={id} required={required}>
        {label}
      </FieldLabel>
      <button
        id={id}
        type="button"
        role="combobox"
        aria-controls={`${id}-listbox`}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-required={required || undefined}
        aria-invalid={error ? true : undefined}
        aria-describedby={errorId}
        onClick={() => {
          if (disabled) return;
          setSearch("");
          setOpen((current) => !current);
        }}
        className={`field mt-2 flex items-center justify-between gap-2 text-left ${
          disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer"
        }`}
      >
        <span className="flex min-w-0 items-center gap-2.5">
          {displayIso2 ? (
            <FlagImage iso2={displayIso2} size="1.2rem" className="shrink-0" />
          ) : null}
          <span
            className="truncate"
            style={
              displayName
                ? undefined
                : { color: "color-mix(in srgb, var(--ink) 45%, transparent)" }
            }
          >
            {displayName || (loadingCountries ? "Loading countries..." : "Select Country")}
          </span>
        </span>
        <Icon
          name="chevron"
          className={`h-4 w-4 shrink-0 text-muted transition-transform duration-200 ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      {open && !disabled ? (
        <div className="absolute top-full right-0 left-0 z-30 mt-1.5 overflow-hidden rounded-2xl border border-line bg-surface shadow-[0_18px_40px_color-mix(in_srgb,var(--navy)_16%,transparent)]">
          <div className="border-b border-line p-2">
            <div className="relative">
              <Icon
                name="search"
                className="pointer-events-none absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-muted"
              />
              <input
                ref={searchRef}
                type="text"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search country..."
                aria-label="Search country"
                className="w-full rounded-xl border border-line bg-page py-2 pr-3 pl-8 text-xs text-ink outline-none placeholder:text-muted focus:border-primary"
              />
            </div>
          </div>
          <ul id={`${id}-listbox`} role="listbox" className="max-h-52 overflow-y-auto p-1.5">
            {filtered.length === 0 ? (
              <li className="px-3 py-4 text-center text-xs text-muted">
                {loadingCountries ? "Loading countries..." : "No matching countries"}
              </li>
            ) : (
              filtered.map((item) => {
                const active = item.iso2 === value.toUpperCase();
                return (
                  <li key={item.iso2}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={active}
                      onClick={() => {
                        onChange(item.iso2);
                        setOpen(false);
                      }}
                      className={`flex w-full cursor-pointer items-center justify-between gap-2 rounded-xl px-2.5 py-2 text-left text-sm transition ${
                        active
                          ? "bg-mint font-semibold text-primary"
                          : "text-ink hover:bg-soft"
                      }`}
                    >
                      <span className="flex min-w-0 items-center gap-2.5">
                        <FlagImage
                          iso2={item.iso2.toLowerCase()}
                          size="1.15rem"
                          className="shrink-0"
                        />
                        <span className="truncate">{item.name}</span>
                      </span>
                      {active ? <Icon name="check" className="h-3.5 w-3.5 shrink-0 text-primary" /> : null}
                    </button>
                  </li>
                );
              })
            )}
          </ul>
        </div>
      ) : null}

      <FieldMessage id={errorId}>{error}</FieldMessage>
    </div>
  );
}

export function CustomerFormModal({
  open,
  customer,
  countries,
  loadingCountries,
  onClose,
  onSuccess,
  onUnauthorized,
}: {
  open: boolean;
  customer: CustomerRecord | null;
  countries: CustomerCountryOption[];
  loadingCountries: boolean;
  onClose: () => void;
  onSuccess: (message: string) => void;
  onUnauthorized: () => void;
}) {
  const isEdit = Boolean(customer);
  const [firstName, setFirstName] = useState(customer?.firstName ?? "");
  const [lastName, setLastName] = useState(customer?.lastName ?? "");
  const [email, setEmail] = useState(customer?.email ?? "");
  const [country, setCountry] = useState(customer?.countryCode ?? "");
  const [phone, setPhone] = useState(customer?.phone ?? "");
  const [phoneDial, setPhoneDial] = useState(customer?.phoneDialCode ?? "");
  const [address, setAddress] = useState(customer?.addressInfo.address ?? "");
  const [stateName, setStateName] = useState(customer?.addressInfo.state ?? "");
  const [city, setCity] = useState(customer?.addressInfo.city ?? "");
  const [postalCode, setPostalCode] = useState(customer?.addressInfo.postalCode ?? "");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState("");
  const [busy, setBusy] = useState(false);

  function clearFieldError(key: string) {
    setFormError("");
    setErrors((current) => (current[key] ? { ...current, [key]: "" } : current));
  }

  function validate(): Record<string, string> {
    const next: Record<string, string> = {};

    if (!isEdit) {
      const trimmedFirst = firstName.trim();
      if (!trimmedFirst) {
        next.firstName = "First Name is required.";
      } else if (trimmedFirst.length < 3) {
        next.firstName = "Should be more than 2 characters.";
      }

      if (!lastName.trim()) {
        next.lastName = "Last Name is required.";
      }

      const trimmedEmail = email.trim();
      if (!trimmedEmail) {
        next.email = "Email is required.";
      } else if (emailError(trimmedEmail)) {
        next.email = "Email format is Incorrect.";
      }

      if (!country.trim()) {
        next.country = "Country is required.";
      }

      const phoneIssue = optionalPhoneError(phone, phoneDial);
      if (phoneIssue) {
        next.phone = "Please enter a valid phone number.";
      }
    }

    if (isEdit) {
      next.address = requiredText(address, "Address is required.");
      next.state = requiredText(stateName, "State is required.");
      next.city = requiredText(city, "City is required.");
      const trimmedPostal = postalCode.trim();
      if (!trimmedPostal) {
        next.postalCode = "Postal Code is required.";
      } else if (!postalPattern.test(trimmedPostal)) {
        next.postalCode = "Invalid Postal code.";
      }
    } else if (postalCode.trim() && !postalPattern.test(postalCode.trim())) {
      next.postalCode = "Invalid Postal code.";
    }

    return next;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;

    const issues = validate();
    setErrors(issues);
    if (Object.values(issues).some(Boolean)) {
      setFormError("Kindly fill all the required fields.");
      return;
    }

    setBusy(true);
    setFormError("");

    const national = nationalDigits(phone, phoneDial);
    const formattedPhone = national ? phone.trim() : "";

    const payload: CustomerFormPayload = {
      customer_id: isEdit && customer ? customer.id : null,
      first_name: firstName.trim(),
      last_name: lastName.trim(),
      email: email.trim(),
      country: country.trim().toUpperCase(),
      customer_country: isEdit ? (customer?.countryCode || country).trim().toUpperCase() : "",
      address: address.trim(),
      city: city.trim(),
      state: stateName.trim(),
      pincode: postalCode.trim(),
      user_name: `${firstName.trim()} ${lastName.trim()}`.trim(),
      phone_number: formattedPhone,
    };

    try {
      const response = await fetch("/api/customers", {
        method: isEdit ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (response.status === 401) {
        onUnauthorized();
        return;
      }

      const data = (await response.json().catch(() => ({}))) as {
        success?: boolean;
        message?: string;
        errors?: unknown;
      };

      if (!response.ok || data.success === false) {
        const apiFieldErrors = extractApiFieldErrors(data);
        if (Object.keys(apiFieldErrors).length > 0) {
          setErrors((current) => ({ ...current, ...apiFieldErrors }));
        }
        setFormError(
          data.message ||
            (isEdit ? "Failed to update customer." : "Failed to add customer."),
        );
        setBusy(false);
        return;
      }

      onSuccess(
        data.message ||
          (isEdit ? "Customer updated successfully" : "Customer added successfully"),
      );
    } catch {
      setFormError("Cannot reach the customer service. Try again in a moment.");
      setBusy(false);
    }
  }

  return (
    <Modal
      open={open}
      title={isEdit ? "Update Customer" : "Add Customer"}
      onClose={() => {
        if (!busy) onClose();
      }}
      footer={
        <div className="flex w-full items-center justify-end gap-3">
          <button
            type="button"
            disabled={busy}
            onClick={onClose}
            className="inline-flex h-11 cursor-pointer items-center justify-center rounded-full border border-line bg-surface px-5 text-sm font-semibold text-ink transition hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="customer-form"
            disabled={busy}
            aria-busy={busy || undefined}
            className="inline-flex h-11 min-w-28 cursor-pointer items-center justify-center gap-2 rounded-full bg-primary px-6 text-sm font-semibold text-on-primary transition hover:bg-primary-hover disabled:cursor-wait"
          >
            {busy ? <WaveLoader size="sm" label="Saving" /> : isEdit ? "Update" : "Add"}
          </button>
        </div>
      }
    >
      {formError ? (
        <div
          role="alert"
          className="mb-4 rounded-2xl border border-danger/25 bg-danger/5 px-4 py-3 text-sm font-medium text-danger"
        >
          {formError}
        </div>
      ) : null}

      <form
        id="customer-form"
        noValidate
        className="grid gap-4 sm:grid-cols-2"
        onSubmit={handleSubmit}
      >
        <TextField
          id="customer-first-name"
          label="First Name"
          required
          disabled={isEdit || busy}
          value={firstName}
          error={errors.firstName}
          placeholder="Enter First Name"
          onChange={(next) => {
            setFirstName(next);
            clearFieldError("firstName");
          }}
        />
        <TextField
          id="customer-last-name"
          label="Last Name"
          required
          disabled={isEdit || busy}
          value={lastName}
          error={errors.lastName}
          placeholder="Enter Last Name"
          onChange={(next) => {
            setLastName(next);
            clearFieldError("lastName");
          }}
        />
        <TextField
          id="customer-email"
          label="Email Id"
          type="email"
          inputMode="email"
          required
          disabled={isEdit || busy}
          value={email}
          error={errors.email}
          placeholder="Enter Email"
          onChange={(next) => {
            setEmail(next);
            clearFieldError("email");
          }}
        />
        <CountrySearchSelect
          id="customer-country"
          label="Country"
          required
          disabled={isEdit || busy}
          value={country}
          fallbackName={customer?.country}
          countries={countries}
          loadingCountries={loadingCountries}
          error={errors.country}
          onChange={(nextIso2) => {
            setCountry(nextIso2);
            clearFieldError("country");
          }}
        />
        <PhoneField
          id="customer-phone"
          label="Mobile Number"
          value={phone}
          countryIso2={country || customer?.countryCode}
          disabled={isEdit || busy}
          error={errors.phone}
          placeholder="Enter mobile number"
          onChange={(next) => {
            setPhone(next.international);
            setPhoneDial(next.dialCode);
            clearFieldError("phone");
          }}
        />
        <TextField
          id="customer-address"
          label="Address"
          required={isEdit}
          disabled={busy}
          value={address}
          error={errors.address}
          placeholder="Enter Address"
          onChange={(next) => {
            setAddress(next);
            clearFieldError("address");
          }}
        />
        <TextField
          id="customer-state"
          label="State"
          required={isEdit}
          disabled={busy}
          value={stateName}
          error={errors.state}
          placeholder="Enter State"
          onChange={(next) => {
            setStateName(next);
            clearFieldError("state");
          }}
        />
        <TextField
          id="customer-city"
          label="City"
          required={isEdit}
          disabled={busy}
          value={city}
          error={errors.city}
          placeholder="Enter City"
          onChange={(next) => {
            setCity(next);
            clearFieldError("city");
          }}
        />
        <TextField
          id="customer-postal"
          label="Postal Code"
          required={isEdit}
          disabled={busy}
          value={postalCode}
          error={errors.postalCode}
          placeholder="Enter Postal Code"
          onChange={(next) => {
            setPostalCode(next);
            clearFieldError("postalCode");
          }}
        />
      </form>
    </Modal>
  );
}
