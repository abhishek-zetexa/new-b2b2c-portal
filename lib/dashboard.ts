import { asList, asRecord, text } from "@/lib/portal-fetch";
import { preferredTimeZone } from "@/lib/portal-time";

const iconBase = "https://b2b2c-img.s3.ap-south-1.amazonaws.com/icons/";

export type ResellerDashboard = {
  kycStatus: string;
  referralCode: string;
  firstName: string;
  lastName: string;
  currency: string;
};

export type AncillaryService = {
  serviceName: string;
  imageUrl: string;
};

export type PromoBanner = {
  imageUrl: string;
  couponCode: string;
};

export type PopularCountry = {
  iso2: string;
  name: string;
  flagUrl: string;
};

export type RecentOrder = {
  orderId: string;
  name: string;
  email: string;
  image: string;
  price: string;
  createdOn: string;
  status: string;
  agentKycRequired: boolean;
};

export const travelEsim: AncillaryService = {
  serviceName: "Travel eSIM",
  imageUrl: `${iconBase}sim.png`,
};

const gatedKyc = new Set(["INIT", "REJECTED", "PENDING"]);

export function isKycGated(status: string) {
  return gatedKyc.has(status.trim().toUpperCase());
}

export function greeting(date = new Date()) {
  const hour = date.getHours();
  if (hour >= 5 && hour < 12) return "Good Morning!";
  if (hour >= 12 && hour < 17) return "Good Afternoon!";
  return "Good Evening!";
}

export function titleCase(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/(^|[\s'-])([a-z])/g, (_lead, boundary: string, letter: string) => `${boundary}${letter.toUpperCase()}`);
}

export function ancillaryImage(serviceName: string) {
  const name = serviceName.toLowerCase();
  if (name.includes("esim")) return `${iconBase}sim.png`;
  if (name.includes("lounge")) return `${iconBase}lounge.png`;
  if (name.includes("meet")) return `${iconBase}meet%26greet.png`;
  if (name.includes("fast")) return `${iconBase}fasttrack.png`;
  if (name.includes("vip")) return `${iconBase}vip.png`;
  return `${iconBase}lounge.png`;
}

export function resellerDashboard(payload: unknown): ResellerDashboard | null {
  const root = asRecord(payload);
  if (!root || root.success === false) return null;
  const wallet = asRecord(asRecord(root.wallet_balance_url)?.data);
  return {
    kycStatus: text(root.kyc_status).toUpperCase(),
    referralCode: text(root.referral_code),
    firstName: text(wallet?.reseller_first_name),
    lastName: text(wallet?.reseller_last_name),
    currency: text(wallet?.currency),
  };
}

export function ancillaryServices(payload: unknown) {
  const root = asRecord(payload);
  const rows = Array.isArray(root?.data) ? asList(root.data) : [];
  const services = rows
    .map((row) => ({
      serviceName: text(row.service_name),
      imageUrl: text(row.service_image_url),
    }))
    .filter((row) => row.serviceName);
  return {
    services: [travelEsim, ...services],
    empty: services.length === 0,
  };
}

export function promoBanners(payload: unknown): PromoBanner[] {
  const root = asRecord(payload);
  if (!root || root.success === false) return [];
  return asList(root.data)
    .map((row) => ({
      imageUrl: text(row.banner_image_url),
      couponCode: text(asRecord(row.coupon)?.coupon_code),
    }))
    .filter((row) => row.imageUrl);
}

export function popularCountries(payload: unknown): PopularCountry[] {
  const root = asRecord(payload);
  const rows = Array.isArray(root?.countries_data) ? asList(root.countries_data) : [];
  return rows
    .map((row) => ({
      iso2: text(row.iso2),
      name: text(row.country_name),
      flagUrl: text(row.country_flag_url),
    }))
    .filter((row) => row.name || row.iso2);
}

export function recentOrders(payload: unknown): RecentOrder[] {
  const root = asRecord(payload);
  const rows = Array.isArray(root?.data) ? asList(root.data) : asList(payload);
  return rows.slice(-10).map((row) => ({
    orderId: text(row.order_id),
    name: text(row.name),
    email: text(row.email),
    image: text(row.img || row.image || row.profile_img),
    price: row.total_value == null || row.total_value === "" ? "" : String(row.total_value),
    createdOn: text(row.created_on),
    status: text(row.order_status),
    agentKycRequired: row.agent_kyc_required === true || row.agent_kyc_required === "true",
  }));
}

export function needsOrderEkyc(order: RecentOrder) {
  const status = order.status.trim();
  return (
    (order.agentKycRequired && status === "Completed: E-KYC Further Action Required") ||
    status.toLowerCase() === "kyc pending"
  );
}

export function formatOrderCreated(value: string) {
  if (!value) return "—";
  const hasZone = /(?:Z|[+-]\d{2}:?\d{2})$/i.test(value.trim());
  const date = new Date(hasZone ? value : `${value}Z`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(undefined, {
    timeZone: preferredTimeZone(),
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function checkoutIdFrom(payload: unknown) {
  const root = asRecord(payload);
  const data = root && "data" in root ? root.data : root?.checkout_id;
  if (typeof data === "string" || typeof data === "number") return String(data).trim();
  const nested = asRecord(data);
  return text(nested?.checkout_id || nested?.id || nested?.CheckoutId).trim();
}
