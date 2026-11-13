import { ancillaryImage } from "@/lib/dashboard";
import { asList, asRecord, num, text } from "@/lib/portal-fetch";

export type MoneyCode = "INR" | "USD";
export type QuickRange = "24h" | "7d" | "10d" | "30d" | "custom";

export type MetricCard = {
  value: number;
  previousValue: number;
  changePercent: number;
  newCustomers: number;
};

export type TrendPoint = {
  date: string;
  orders: number;
  packagesSold: number;
  revenue: number;
  revenueUSD: number;
};

export type TopPackage = {
  rank: number;
  packageName: string;
  type: string;
  units: number;
  revenue: number;
  sharePercent: number;
};

export type DashboardOverview = {
  currency: MoneyCode;
  cards: {
    totalOrders: MetricCard;
    totalRevenue: MetricCard;
    packagesSold: MetricCard;
    esimsSold: MetricCard;
    psimsSold: MetricCard;
    customersInPeriod: MetricCard;
  };
  trend: TrendPoint[];
  packages: TopPackage[];
  split: {
    esimUnits: number;
    psimUnits: number;
    esimSharePercent: number;
    psimSharePercent: number;
  };
  last24: {
    from: string;
    to: string;
    orders: number;
    revenue: number;
    esimsActivated: number;
    newCustomers: number;
    hourly: { hour: string; orders: number; heightPct: number }[];
  };
  customers: { totalCustomers: number; newCustomers: number; repeatBuyers: number };
  orderTypes: { orders: number; topups: number };
};

export type AncillaryItem = {
  serviceName: string;
  imageUrl: string;
  status: boolean;
  locked: boolean;
};

const rangeOffsets: Record<Exclude<QuickRange, "custom">, number> = {
  "24h": 1,
  "7d": 6,
  "10d": 9,
  "30d": 29,
};

export function isoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

export function rangeDates(range: Exclude<QuickRange, "custom">, today = new Date()) {
  const from = new Date(today);
  from.setDate(today.getDate() - rangeOffsets[range]);
  return { fromDate: isoDate(from), toDate: isoDate(today) };
}

export function moneyCode(raw: unknown): MoneyCode {
  const value = String(raw ?? "");
  return value === "INR" || value === "₹" || value.toUpperCase().includes("INR") ? "INR" : "USD";
}

export function moneySymbol(code: MoneyCode) {
  return code === "INR" ? "₹" : "$";
}

export function formatMoney(amount: number, code: MoneyCode, digits: number) {
  const value = Number.isFinite(amount) ? amount : 0;
  const body = Math.abs(value).toLocaleString("en-US", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
  return `${value < 0 ? "-" : ""}${moneySymbol(code)}${body}`;
}

export function formatCount(amount: number) {
  return (Number.isFinite(amount) ? amount : 0).toLocaleString("en-US", { maximumFractionDigits: 0 });
}

export function percentLabel(amount: number) {
  const rounded = Math.round((Number.isFinite(amount) ? amount : 0) * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}

export function shortDate(iso: string) {
  const [year, month, day] = iso.split("-").map(Number);
  if (!year || !month || !day) return iso;
  return new Date(year, month - 1, day).toLocaleString("en-US", { month: "short", day: "2-digit" });
}

function metric(value: unknown): MetricCard {
  const record = asRecord(value);
  return {
    value: num(record?.value),
    previousValue: num(record?.previousValue),
    changePercent: num(record?.changePercent),
    newCustomers: num(record?.newCustomers),
  };
}

export function parseOverview(payload: unknown): DashboardOverview {
  const root = asRecord(payload);
  const data = asRecord(root?.data) ?? root ?? {};
  const cards = asRecord(data.summaryCards);
  const split = asRecord(data.esimVsPsimSplit);
  const last = asRecord(data.last24Hours);
  const customers = asRecord(data.customerSummary);
  const types = asRecord(data.orderTypeBreakdown);
  const hourly = asList(last?.hourly);
  const maxOrders = Math.max(...hourly.map((row) => num(row.orders)), 1);

  return {
    currency: moneyCode(root?.currency ?? data.currency),
    cards: {
      totalOrders: metric(cards?.totalOrders),
      totalRevenue: metric(cards?.totalRevenue),
      packagesSold: metric(cards?.packagesSold),
      esimsSold: metric(cards?.esimsSold),
      psimsSold: metric(cards?.psimsSold),
      customersInPeriod: metric(cards?.customersInPeriod),
    },
    trend: asList(data.ordersRevenueTrend).map((row) => ({
      date: text(row.date),
      orders: num(row.orders),
      packagesSold: num(row.packagesSold),
      revenue: num(row.revenue),
      revenueUSD: num(row.revenueUSD),
    })),
    packages: asList(data.topSoldPackages).map((row) => ({
      rank: num(row.rank),
      packageName: text(row.packageName),
      type: text(row.type),
      units: num(row.units),
      revenue: num(row.revenue),
      sharePercent: num(row.sharePercent),
    })),
    split: {
      esimUnits: num(split?.esimUnits),
      psimUnits: num(split?.psimUnits),
      esimSharePercent: num(split?.esimSharePercent),
      psimSharePercent: num(split?.psimSharePercent),
    },
    last24: {
      from: text(last?.from),
      to: text(last?.to),
      orders: num(last?.orders),
      revenue: num(last?.revenue),
      esimsActivated: num(last?.esimsActivated),
      newCustomers: num(last?.newCustomers),
      hourly: hourly.map((row) => ({
        hour: text(row.hour),
        orders: num(row.orders),
        heightPct: Math.max(4, Math.round((num(row.orders) / maxOrders) * 100)),
      })),
    },
    customers: {
      totalCustomers: num(customers?.totalCustomers),
      newCustomers: num(customers?.newCustomers),
      repeatBuyers: num(customers?.repeatBuyers),
    },
    orderTypes: {
      orders: num(types?.orders),
      topups: num(types?.topups),
    },
  };
}

export function walletBalance(payload: unknown) {
  const root = asRecord(payload);
  const wallet = asRecord(asRecord(root?.wallet_balance_url)?.data);
  return {
    balance: num(wallet?.balance),
    currency: moneyCode(wallet?.currency || sessionCurrency()),
  };
}

export function sessionCurrency(): MoneyCode {
  if (typeof window === "undefined") return "USD";
  return moneyCode(sessionStorage.getItem("reseller-currency") || "USD");
}

const defaultAncillaries: AncillaryItem[] = [
  {
    serviceName: "Travel eSIM",
    imageUrl: "https://b2b2c-img.s3.ap-south-1.amazonaws.com/icons/sim.png",
    status: true,
    locked: true,
  },
  {
    serviceName: "Local eSIM",
    imageUrl: "https://b2b2c-img.s3.ap-south-1.amazonaws.com/icons/sim.png",
    status: true,
    locked: true,
  },
];

function flag(value: unknown) {
  return value === true || value === "true" || value === 1 || value === "1";
}

export function ancillaryItems(payload: unknown): AncillaryItem[] {
  const rows = asList(asRecord(payload)?.data).map((row) => {
    const serviceName = text(row.service_name);
    return {
      serviceName,
      imageUrl: text(row.service_image_url) || ancillaryImage(serviceName),
      status: flag(row.status),
      locked: serviceName === "Travel eSIM" || serviceName === "Local eSIM",
    };
  });
  return [...defaultAncillaries, ...rows];
}

export type TrendBar = {
  x: number;
  y: number;
  w: number;
  h: number;
  date: string;
  orders: number;
  revenue: number;
};

export type TrendDot = { cx: number; cy: number; date: string; orders: number; revenue: number };

export function buildTrend(points: TrendPoint[]) {
  const width = 1000;
  const height = 260;
  const pad = { top: 16, bottom: 34, left: 8, right: 8 };
  const plotW = width - pad.left - pad.right;
  const plotH = height - pad.top - pad.bottom;
  if (!points.length) return { bars: [], dots: [], line: "" };
  const maxOrders = Math.max(...points.map((point) => point.orders), 1);
  const maxRevenue = Math.max(...points.map((point) => point.revenue), 1);
  const step = points.length ? plotW / points.length : plotW;
  const barW = Math.min(step * 0.55, 64);
  const bars: TrendBar[] = [];
  const dots: TrendDot[] = [];
  const line: string[] = [];

  points.forEach((point, index) => {
    const cx = pad.left + step * index + step / 2;
    const barH = (point.orders / maxOrders) * plotH;
    bars.push({
      x: cx - barW / 2,
      y: pad.top + (plotH - barH),
      w: barW,
      h: barH,
      date: point.date,
      orders: point.orders,
      revenue: point.revenue,
    });
    const cy = pad.top + plotH - (point.revenue / maxRevenue) * plotH;
    line.push(`${index === 0 ? "M" : "L"} ${cx.toFixed(1)} ${cy.toFixed(1)}`);
    dots.push({ cx, cy, date: point.date, orders: point.orders, revenue: point.revenue });
  });

  return { bars, dots, line: line.join(" ") };
}

export const donutRadius = 70;
export const donutCircumference = 2 * Math.PI * donutRadius;
