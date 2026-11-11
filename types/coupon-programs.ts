export type CouponDiscountType = "percentage" | "fixed";
export type CouponStatus = "active" | "paused" | "expired" | "archived";

export interface CouponProgram {
  id: string;
  name: string;
  description: string;
  campaignPrefix: string;
  discountType: CouponDiscountType;
  discountValue: number;
  maxDiscountCap?: number;
  minOrderValue: number;
  targetScope: "All Packages" | "Specific Destinations" | "Specific Bundles";
  targetDetails: string[];
  startDate: string;
  endDate: string;
  totalCoupons: number;
  redeemedCount: number;
  maxRedemptions: number;
  maxPerCustomer: number;
  eligiblePlatforms: string[];
  status: CouponStatus;
  totalDiscountGranted: number;
}

export interface CreateProgramInput {
  name: string;
  internalNotes?: string;
  campaignPrefix: string;
  discountType: CouponDiscountType;
  discountValue: number;
  maxDiscountCap?: number;
  minOrderValue: number;
  eligiblePlatforms: string[];
  countries: string[];
  applicableBundles: "all" | "selected";
  startDate: string;
  endDate: string;
  maxTotalRedemptions: number;
  maxPerCustomer: number;
}

export interface RedemptionRecord {
  id: string;
  programId: string;
  couponCode: string;
  redeemedBy: string;
  customerEmail: string;
  orderId: string;
  orderAmount: number;
  discountAmount: number;
  date: string;
}

export interface GeneratedVoucher {
  code: string;
  programId: string;
  createdAt: string;
  assignedTo?: {
    name: string;
    email: string;
    phone: string;
    passport?: string;
  };
  status: "unredeemed" | "redeemed";
}
