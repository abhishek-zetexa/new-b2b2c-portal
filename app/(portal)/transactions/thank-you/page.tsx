import { redirect } from "next/navigation";

export default function Page() {
  redirect("/transactions/payment/thank-you");
}
