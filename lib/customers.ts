export type CustomerAddress = {
  address: string;
  city: string;
  state: string;
  postalCode: string;
};

export type CustomerRecord = {
  id: string;
  firstName: string;
  lastName: string;
  name: string;
  email: string;
  phone: string;
  phoneNational: string;
  phoneDialCode: string;
  country: string;
  countryCode: string;
  profileImg: string;
  kycExists: boolean;
  addressInfo: CustomerAddress;
};

export type CustomerListResponse = {
  customers: CustomerRecord[];
  currentPage: number;
  totalPages: number;
  totalCustomers: number;
};

export type CustomerCountryOption = {
  name: string;
  iso2: string;
  image: string;
};

export type CustomerFormPayload = {
  customer_id?: string | number | null;
  first_name: string;
  last_name: string;
  email: string;
  country: string;
  customer_country: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  user_name: string;
  phone_number: string;
};

function readText(value: unknown): string {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return "";
}

function sanitizeImageUrl(value: unknown): string {
  const url = readText(value);
  if (!url || /^none|null|undefined$/i.test(url)) return "";
  if (/^https?:\/\//i.test(url) || url.startsWith("/")) return url;
  return "";
}

export function sanitizePhoneText(value: unknown): string {
  const phone = readText(value);
  if (!phone || /none|null|undefined/i.test(phone)) return "";
  return phone;
}

export function normalizeCustomer(raw: unknown): CustomerRecord | null {
  if (!raw || typeof raw !== "object") return null;
  const record = raw as Record<string, unknown>;
  const id = readText(record.id);
  if (!id) return null;

  const firstName = readText(record.first_name);
  const lastName = readText(record.last_name);
  const email = readText(record.email);
  const name = `${firstName} ${lastName}`.trim() || readText(record.user_name) || email || "Customer";

  const phoneDetails =
    record.phone_details && typeof record.phone_details === "object"
      ? (record.phone_details as Record<string, unknown>)
      : null;

  const phone = sanitizePhoneText(phoneDetails?.full_number ?? record.phone_number);
  const phoneNational = sanitizePhoneText(phoneDetails?.phone);
  const dialRaw = sanitizePhoneText(phoneDetails?.country_code).replace(/^\+/, "");
  const phoneDialCode = dialRaw ? `+${dialRaw}` : "";

  const countryCode = readText(record.nationality_iso2 || record.country_code).toUpperCase();
  const country = readText(record.nationality || record.country) || "NA";

  const rawAddress = Array.isArray(record.address_info)
    ? record.address_info[0]
    : record.address_info;
  const addressObj =
    rawAddress && typeof rawAddress === "object"
      ? (rawAddress as Record<string, unknown>)
      : null;

  return {
    id,
    firstName,
    lastName,
    name,
    email,
    phone,
    phoneNational,
    phoneDialCode,
    country,
    countryCode,
    profileImg: sanitizeImageUrl(record.profile_img),
    kycExists: Boolean(record.kyc_exits ?? record.kyc_exists),
    addressInfo: {
      address: readText(addressObj?.street_address_1) || readText(addressObj?.address),
      city: readText(addressObj?.city),
      state: readText(addressObj?.state),
      postalCode: readText(addressObj?.postal_code) || readText(addressObj?.pincode),
    },
  };
}

const apiFieldKeyMap: Record<string, string> = {
  first_name: "firstName",
  last_name: "lastName",
  email: "email",
  country: "country",
  phone_number: "phone",
  phone: "phone",
  address: "address",
  state: "state",
  city: "city",
  pincode: "postalCode",
  postal_code: "postalCode",
};

export function extractApiFieldErrors(payload: unknown): Record<string, string> {
  if (!payload || typeof payload !== "object") return {};
  const record = payload as Record<string, unknown>;
  if (!Array.isArray(record.errors)) return {};

  const mapped: Record<string, string> = {};
  for (const item of record.errors) {
    if (!item || typeof item !== "object") continue;
    const entry = item as Record<string, unknown>;
    const field = readText(entry.field);
    const message = readText(entry.message);
    const localKey = apiFieldKeyMap[field] ?? field;
    if (localKey && message) {
      mapped[localKey] = message;
    }
  }
  return mapped;
}

export function customerInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "C";
  return parts
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

