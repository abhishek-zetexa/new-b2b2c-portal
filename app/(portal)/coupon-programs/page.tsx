import type { Metadata } from "next";
import { CouponProgramsView } from "@/components/coupons/coupon-programs-view";

export const metadata: Metadata = {
  title: "Coupon Programs - Partner Portal",
};

export default function CouponProgramsPage() {
  return <CouponProgramsView />;
}
