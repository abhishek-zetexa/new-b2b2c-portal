import type { Metadata } from "next";
import { ProductsView } from "@/components/portal/products/products-view";

export const metadata: Metadata = { title: "Products" };

export default function ProductsPage() {
  return <ProductsView />;
}
