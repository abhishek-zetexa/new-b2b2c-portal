export interface ReportSummary {
  grossRevenue: number;
  revenueDelta: number;
  orderCount: number;
  orderCountDelta: number;
  averageOrderValue: number;
  aovDelta: number;
  discountsGranted: number;
  cashbackGranted: number;
}

export interface AnalyticsDataPoint {
  date: string;
  formattedDate: string;
  revenue: number;
  orders: number;
  directSales: number;
  apiSales: number;
  walletSales: number;
}

export interface TopProductBundle {
  id: string;
  name: string;
  destination: string;
  salesCount: number;
  revenue: number;
  sharePercentage: number;
}

export interface ChannelShare {
  channel: string;
  revenue: number;
  sharePercentage: number;
  color: string;
}

export interface OrderReportRecord {
  id: string;
  orderId: string;
  customerName: string;
  productName: string;
  category: "core" | "ancillary" | "custom";
  platform: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  netTotal: number;
  paymentMethod: string;
  status: "Completed" | "Pending" | "Refunded";
  date: string;
}
