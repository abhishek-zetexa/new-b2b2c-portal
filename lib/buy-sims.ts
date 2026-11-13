import { asList, asRecord, num, text, type JsonRecord } from "@/lib/portal-fetch";

export const supportMail = "support@zetexa.com";

export const desktopLetters = ["All", "A-B", "C-D-E", "F-G-H", "I-J-K", "L-M", "N-O-P-Q", "R-S", "T-U-V-W-X-Y-Z"] as const;
export const mobileLetters = ["All", "A-B-C-D-E", "F-G-H-I-J", "K-L-M-N-O", "P-Q-R-S-T", "U-V-W-X-Y-Z"] as const;

export const travelValidity = [
  { label: "7 Days", value: "1-7" },
  { label: "15 Days", value: "1-15" },
  { label: "30 Days", value: "1-30" },
  { label: "30 Days +", value: "1-365" },
] as const;

export const localListValidity = [
  { label: "30 Days", value: "30-30" },
  { label: "90 Days", value: "90-90" },
  { label: "180 Days", value: "180-180" },
  { label: "360 Days", value: "360-360" },
] as const;

export const dataValidity = [
  { label: "1–7 Days", min: 1, max: 7 },
  { label: "8–15 Days", min: 8, max: 15 },
  { label: "16–30 Days", min: 16, max: 30 },
  { label: "30 days +", min: 30, max: 366 },
] as const;

export const inrPrices = [
  { label: "Under ₹1000", min: "0", max: "1000" },
  { label: "₹1000–₹2000", min: "1000", max: "2000" },
  { label: "₹2000–₹3000", min: "2000", max: "3000" },
  { label: "₹3000+", min: "3000", max: "" },
] as const;

export const usdPrices = [
  { label: "Under $10", min: "0", max: "10" },
  { label: "$10–$25", min: "10", max: "25" },
  { label: "$25–$50", min: "25", max: "50" },
  { label: "$50+", min: "50", max: "" },
] as const;

export const localPlanValidity = [
  { label: "1 Month", days: 30 },
  { label: "3 Months", days: 90 },
  { label: "6 Months", days: 180 },
  { label: "12 Months", days: 360 },
] as const;

export type CatalogTab = "country" | "region" | "local";
export type ListTab = "travel" | "local";
export type PlanKind = "country" | "region" | "local";
export type PlanTab = "data" | "voice" | "local";

export type Destination = {
  id: string;
  name: string;
  flag: string;
  image: string;
  price: number | null;
  currency: string;
  carrier: string;
  carrierLogo: string;
};

export type PlanRow = {
  id: string;
  name: string;
  price: number;
  currency: string;
  data: string;
  speed: string;
  voice: string;
  sms: string;
  validity: string;
  network: string;
  category: number;
  coverage: string;
  fup: string;
  description: string;
  unlimitedTalk: boolean;
  unlimitedText: boolean;
  voicePlan: boolean;
  displayName: string;
  carrier: string;
  carrierLogo: string;
  dataUnlimited: boolean;
  originalPrice: number;
  currencySymbol: string;
  expiryType: string;
  expiryDays: number;
};

export function letterBounds(chip: string) {
  if (!chip || chip === "All") return null;
  const parts = chip.split("-").filter(Boolean);
  if (!parts.length) return null;
  return { start: parts[0], end: parts[parts.length - 1] };
}

export function moneyAmount(amount: number, currency: string, digits = 2) {
  const value = Number.isFinite(amount) ? amount : 0;
  const formatted = value.toLocaleString("en-US", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
  return currency ? `${formatted} ${currency}` : formatted;
}

export function readSession(key: string) {
  if (typeof window === "undefined") return "";
  return sessionStorage.getItem(key) || "";
}

export function agentSession() {
  const record = asRecord(safeJson(readSession("agent-data")));
  return {
    resellerId: text(record?.reseller_id),
    agentId: text(record?.agent_id),
    email: text(record?.email),
    voiceSms: record?.display_voice_sms_plans === true,
    mvno: record?.mvno_access === true,
  };
}

export function rememberAgentFlags(voiceSms: boolean, mvno: boolean) {
  const record = asRecord(safeJson(readSession("agent-data"))) ?? {};
  sessionStorage.setItem("agent-data", JSON.stringify({
    ...record,
    display_voice_sms_plans: voiceSms,
    mvno_access: mvno,
  }));
}

export function isTopup() {
  return readSession("istopup") === "true";
}

export function clearTopup() {
  sessionStorage.removeItem("istopup");
  sessionStorage.removeItem("topupIccid");
}

export function checkoutId() {
  return readSession("CheckoutId");
}

export function setCheckoutId(id: string) {
  if (!id) return;
  sessionStorage.setItem("CheckoutId", id);
  sessionStorage.removeItem("checkout-reset");
}

export function clearAssignedCustomer() {
  sessionStorage.removeItem("customer_id");
  sessionStorage.removeItem("buy-sims-customer");
}

export function canRestoreCheckout() {
  return sessionStorage.getItem("checkout-reset") !== "1" && !sessionStorage.getItem("buy-sims-order");
}

export function checkoutIdFromAdd(payload: unknown) {
  const root = asRecord(payload);
  return text(root?.checkout_id || asRecord(root?.data)?.checkout_id);
}

export function checkoutPath(id = checkoutId()) {
  return id ? `/checkout?checkout_id=${encodeURIComponent(id)}` : "/checkout";
}

export function clearCheckout() {
  sessionStorage.removeItem("CheckoutId");
  sessionStorage.removeItem("isCartOpen");
  clearAssignedCustomer();
  sessionStorage.setItem("checkout-reset", "1");
}

function safeJson(raw: string) {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return null;
  }
}

export function pageMeta(payload: unknown) {
  const root = asRecord(payload);
  return {
    totalPages: Math.max(1, num(root?.total_page || root?.total_pages || asRecord(root?.data)?.total_page) || 1),
    currency: text(root?.currency_code || root?.currency || asRecord(root?.payment_data)?.currency),
    success: root?.success !== false,
    message: text(root?.message),
  };
}

export function destinationsFrom(payload: unknown, kind: CatalogTab): Destination[] {
  const root = asRecord(payload);
  const rows = asList(root?.data ?? payload);
  return rows.map((row) => {
    if (kind === "region") {
      return {
        id: text(row.name),
        name: text(row.name),
        flag: "",
        image: text(row.image),
        price: null,
        currency: "",
        carrier: "",
        carrierLogo: "",
      };
    }
    if (kind === "local") {
      return {
        id: text(row.country_iso2),
        name: text(row.country_name),
        flag: text(row.country_flag_url),
        image: "",
        price: null,
        currency: "",
        carrier: text(row.carrier),
        carrierLogo: text(row.carrier_logo),
      };
    }
    const price = row.starts_at == null || row.starts_at === "" ? null : num(row.starts_at);
    return {
      id: text(row.iso_two),
      name: text(row.country_name),
      flag: text(row.country_flag_url),
      image: "",
      price,
      currency: text(row.currency || root?.currency_code),
      carrier: "",
      carrierLogo: "",
    };
  }).filter((item) => item.id && item.name);
}

export function plansFrom(payload: unknown): { rows: PlanRow[]; currency: string; totalPages: number } {
  const root = asRecord(payload);
  const data = root?.data;
  const rows = Array.isArray(data) ? asList(data) : asList(asRecord(data)?.packages ?? asRecord(data)?.results ?? data);
  const currency = text(root?.currency_code || root?.currency);
  return {
    currency,
    totalPages: Math.max(1, num(root?.total_page || root?.total_pages || asRecord(data)?.total_page) || 1),
    rows: rows.map((row) => planFrom(row, currency)).filter((row) => row.id),
  };
}

function planAmount(value: unknown) {
  const raw = text(value).trim();
  return raw === "0" ? "" : raw;
}

function planFrom(row: JsonRecord, currency: string): PlanRow {
  const category = num(row.package_category || row.plan_name) || 1;
  const talk = planAmount(row.talk ?? row.call);
  const sms = planAmount(row.text ?? row.sms);
  const description = Array.isArray(row.description)
    ? row.description.map((line) => text(line)).filter(Boolean).join("\n")
    : text(row.description);
  const powered = asRecord(row.powered_by);
  const local = row.plan_price != null || row.display_name != null || row.data_unlimited != null;
  const coverage = text(row.coverage || row.package_coverage);
  return {
    id: text(local ? row.id || row.package_id : row.package_id || row.id),
    name: text(row.package_name || row.display_name || row.name || row.plan_name),
    displayName: text(row.display_name || row.package_name || row.name),
    price: num(row.plan_price ?? row.price ?? row.pack_price),
    originalPrice: num(row.original_price),
    currency: text(row.currency || row.currency_code || currency),
    currencySymbol: text(row.currency_symbol),
    data: text(row.data || row.package_data),
    dataUnlimited: row.data_unlimited === true,
    speed: coverage || text(row.speed),
    voice: talk,
    sms,
    validity: text(row.validity || row.validity_days || row.perioddays || row.plan_expiry_days),
    network: text(row.network).replace(/\s*\([^)]*\)\s*/g, "").trim(),
    category,
    coverage,
    fup: text(row.fup_policy),
    description,
    carrier: text(powered?.carrier || row.carrier),
    carrierLogo: text(powered?.carrier_logo || row.carrier_logo),
    expiryType: text(row.plan_expiry_type),
    expiryDays: num(row.plan_expiry_days || row.validity || row.perioddays),
    unlimitedTalk: row.minute_unlimited === true || talk.toLowerCase() === "unlimited",
    unlimitedText: row.text_unlimited === true || sms.toLowerCase() === "unlimited",
    voicePlan: category === 2 || Boolean(talk || sms),
  };
}

export function voiceTerms(destination: string, validityDays: number) {
  const expiry = new Date();
  expiry.setDate(expiry.getDate() + validityDays + 30);
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const formatted = `${String(expiry.getDate()).padStart(2, "0")}-${months[expiry.getMonth()]}-${String(expiry.getFullYear()).slice(-2)}`;
  return [
    "You will be allocated a +1 Number.",
    "eKYC is mandatory for Voice and SMS plan.",
    "No refund is available for Voice and SMS packs.",
    `Your package and mobile number will expire on ${formatted}. Please ensure the trip is completed by that date.`,
    `You can make and receive calls and SMS within ${destination}.`,
    "This number may not be compatible with WhatsApp or other social logins.",
  ];
}

export type CheckoutLine = {
  id: string;
  lineId: string;
  title: string;
  flag: string;
  coverage: string;
  showCoverage: boolean;
  network: string;
  speed: string;
  data: string;
  days: string;
  price: number;
  quantity: number;
  currency: string;
  category: number;
  simType: string;
  psimAllowed: boolean;
  sms: string;
  minutes: string;
  iccid: string;
  zip: string;
  journeyDate: string;
  serviceable: boolean;
  shippingCost: number;
};

export type AddonGroup = {
  key: string;
  planId: string;
  serviceId: string;
  serviceName: string;
  displayName: string;
  location: string;
  terminal: string;
  date: string;
  time: string;
  currency: string;
  adults: number;
  children: number;
  infants: number;
  adultPrice: number;
  childPrice: number;
  infantPrice: number;
  names: string[];
  raw: JsonRecord;
};

export type CheckoutView = {
  lines: CheckoutLine[];
  addons: AddonGroup[];
  currency: string;
  customerId: string;
  nationalityRequired: boolean;
  addressRequired: boolean;
  summary: {
    esim: number | null;
    airport: number;
    psim: number;
    shipping: number;
    net: number;
    tax: number;
    total: number;
  };
  breakage: {
    plan: number;
    lounge: number;
    vip: number;
    fastTrack: number;
    meet: number;
    other: number;
    discount: number;
    esimSubtotal: number;
    tax: number;
    total: number;
  };
  couponApplied: boolean;
  couponCode: string;
  addonCart: JsonRecord | null;
};

export function checkoutFrom(payload: unknown): CheckoutView {
  const root = asRecord(payload) ?? {};
  const pay = asRecord(root.customer_payment) ?? {};
  const commission = asRecord(root.commission) ?? {};
  const payment = asRecord(root.payment_data) ?? {};
  const currency = text(payment.currency || root.currency);
  const rows = asList(root.data2 ?? root.data);
  const lines = rows.map((row) => {
    const detail = asRecord(asList(row.package_details)[0]) ?? {};
    const zone = asRecord(asList(detail.locationzoneids)[0]);
    const data = text(detail.package_data);
    return {
      id: text(row.package_id),
      lineId: text(row.checkout_line_id),
      title: text(detail.package_ui_slug || row.package_name),
      flag: text(row.image_url),
      coverage: text(zone?.countryname),
      showCoverage: row.region_flag === false,
      network: text(row.network),
      speed: text(detail.package_coverage),
      data: data.toLowerCase() === "unlimited" ? "Unlimited" : data ? `${data} MB` : "",
      days: text(detail.perioddays),
      price: num(row.pack_price),
      quantity: num(row.quantity) || 1,
      currency,
      category: num(detail.package_category_id || detail.package_category) || 1,
      simType: text(row.sim_type || "esim").toLowerCase() || "esim",
      psimAllowed: text(detail.vendor).toLowerCase() !== "gamma" && detail.vendor_esim !== true,
      sms: text(detail.package_mosms),
      minutes: num(detail.package_moc_call_second) ? String(Math.round(num(detail.package_moc_call_second) / 60)) : "",
      iccid: text(row.iccid),
      zip: text(row.zip_code),
      journeyDate: text(row.date_of_journey),
      serviceable: row.is_serviceable === true,
      shippingCost: num(row.shipping_cost),
    };
  });
  const addonCart = asRecord(root.addon_cart);
  const addons = groupAddons(asList(addonCart?.items));
  const shipping = num(pay.shipment_cost ?? root.shipment_cost);
  const psim = num(pay.p_sim_price ?? root.p_sim_price);
  return {
    lines,
    addons,
    currency,
    customerId: text(root.customer_id),
    nationalityRequired: root.nationality_check === true || lines.some((line) => /voice|sms/i.test(line.title)),
    addressRequired: shipping > 0 || psim > 0 || root.address_required === true,
    summary: {
      esim: pay.esim_subtotal == null ? null : num(pay.esim_subtotal),
      airport: num(pay.addon_subtotal ?? commission.addon_subtotal),
      psim,
      shipping,
      net: num(pay.total_net),
      tax: num(pay.total_tax),
      total: num(pay.total_price),
    },
    breakage: {
      plan: num(commission.esim_cart_total),
      lounge: num(asRecord(commission.lounge_price)?.subtotal),
      vip: num(asRecord(commission.vip_price)?.subtotal),
      fastTrack: num(asRecord(commission.fast_track_price)?.subtotal),
      meet: num(asRecord(commission.meet_and_greet_price)?.subtotal),
      other: num(asRecord(commission.other_addon_price)?.subtotal),
      discount: num(commission.discount_amount),
      esimSubtotal: num(commission.discount_price),
      tax: num(commission.total_tax),
      total: num(commission.total_price ?? commission.cost_price),
    },
    couponApplied: asRecord(root.coupon_discount_summary)?.coupon_applied === true,
    couponCode: text(asRecord(root.coupon_discount_summary)?.coupon_code),
    addonCart,
  };
}

function groupAddons(items: JsonRecord[]): AddonGroup[] {
  const groups = new Map<string, AddonGroup>();
  for (const item of items) {
    const key = [item.plan_id, item.location_code, item.terminal, item.service_date, item.service_time].map(text).join("|");
    const current = groups.get(key) ?? {
      key,
      planId: text(item.plan_id),
      serviceId: text(item.service_id),
      serviceName: text(item.service_name),
      displayName: text(item.display_name),
      location: text(item.location_code || item.location),
      terminal: text(item.terminal),
      date: text(item.service_date),
      time: text(item.service_time),
      currency: text(item.currency),
      adults: 0,
      children: 0,
      infants: 0,
      adultPrice: 0,
      childPrice: 0,
      infantPrice: 0,
      names: [],
      raw: item,
    };
    const kind = text(item.passenger_type || item.pax_type).toLowerCase();
    const count = num(item.quantity || item.adult_count);
    const unit = num(item.customer_unit_price || item.unit_price);
    if (kind.includes("child")) {
      current.children += count || num(item.child_count);
      current.childPrice = unit;
    } else if (kind.includes("infant")) {
      current.infants += count || num(item.infant_count);
      current.infantPrice = unit;
    } else {
      current.adults += count || num(item.adult_count);
      current.adultPrice = unit;
    }
    const people = asList(asRecord(item.passenger_info)?.adults)
      .concat(asList(asRecord(item.passenger_info)?.children), asList(asRecord(item.passenger_info)?.infants));
    for (const person of people) {
      const name = text(person.name || `${text(person.first_name)} ${text(person.last_name)}`).trim();
      if (name) current.names.push(name);
    }
    groups.set(key, current);
  }
  return [...groups.values()];
}

export function regionCountries(payload: unknown) {
  const root = asRecord(payload);
  const first = asRecord(asList(root?.data)[0]);
  const details = typeof first?.plan_details_json === "string" ? asRecord(safeJson(first.plan_details_json)) : asRecord(first?.plan_details_json);
  const countries = details?.Countries ?? details?.countries;
  if (typeof countries === "string") return countries.split(",").map((item) => item.trim()).filter(Boolean);
  if (Array.isArray(countries)) return countries.map((item) => text(asRecord(item)?.name || asRecord(item)?.country_name || item)).filter(Boolean);
  if (countries && typeof countries === "object") return Object.values(countries as Record<string, unknown>).map((item) => text(item)).filter(Boolean);
  return [];
}

export function downloadXlsx(filename: string, headers: string[], rows: string[][]) {
  const sheet = [headers, ...rows]
    .map((row) => `<row>${row.map((cell) => `<c t="inlineStr"><is><t>${escapeXml(cell)}</t></is></c>`).join("")}</row>`)
    .join("");
  const files: Record<string, string> = {
    "[Content_Types].xml": `<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>`,
    "_rels/.rels": `<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`,
    "xl/workbook.xml": `<?xml version="1.0" encoding="UTF-8"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Plans" sheetId="1" r:id="rId1"/></sheets></workbook>`,
    "xl/_rels/workbook.xml.rels": `<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>`,
    "xl/worksheets/sheet1.xml": `<?xml version="1.0" encoding="UTF-8"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${sheet}</sheetData></worksheet>`,
  };
  const blob = new Blob([zipStore(files)], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function escapeXml(value: string) {
  return value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" })[char] || char);
}

function zipStore(files: Record<string, string>) {
  const encoder = new TextEncoder();
  const parts: Uint8Array[] = [];
  const central: Uint8Array[] = [];
  let offset = 0;
  for (const [name, contents] of Object.entries(files)) {
    const data = encoder.encode(contents);
    const nameBytes = encoder.encode(name);
    const crc = crc32(data);
    const local = new DataView(new ArrayBuffer(30));
    local.setUint32(0, 0x04034b50, true);
    local.setUint16(4, 20, true);
    local.setUint16(8, 0, true);
    local.setUint32(14, crc, true);
    local.setUint32(18, data.length, true);
    local.setUint32(22, data.length, true);
    local.setUint16(26, nameBytes.length, true);
    const localBytes = new Uint8Array(local.buffer);
    parts.push(localBytes, nameBytes, data);
    const dir = new DataView(new ArrayBuffer(46));
    dir.setUint32(0, 0x02014b50, true);
    dir.setUint16(4, 20, true);
    dir.setUint16(6, 20, true);
    dir.setUint32(16, crc, true);
    dir.setUint32(20, data.length, true);
    dir.setUint32(24, data.length, true);
    dir.setUint16(28, nameBytes.length, true);
    dir.setUint32(42, offset, true);
    central.push(new Uint8Array(dir.buffer), nameBytes);
    offset += localBytes.length + nameBytes.length + data.length;
  }
  const centralStart = offset;
  const centralSize = central.reduce((sum, part) => sum + part.length, 0);
  const end = new DataView(new ArrayBuffer(22));
  end.setUint32(0, 0x06054b50, true);
  end.setUint16(8, Object.keys(files).length, true);
  end.setUint16(10, Object.keys(files).length, true);
  end.setUint32(12, centralSize, true);
  end.setUint32(16, centralStart, true);
  const blobParts = [...parts, ...central, new Uint8Array(end.buffer)];
  const total = blobParts.reduce((sum, part) => sum + part.length, 0);
  const out = new Uint8Array(total);
  let cursor = 0;
  for (const part of blobParts) {
    out.set(part, cursor);
    cursor += part.length;
  }
  return out;
}

function crc32(data: Uint8Array) {
  let crc = 0xffffffff;
  for (const byte of data) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
}
