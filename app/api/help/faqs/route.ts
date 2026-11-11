import { publicEnv } from "@/lib/public-env";
import { upstream } from "@/lib/upstream";

export async function GET() {
  return upstream(`${publicEnv.adminConfig}allfaqs`);
}
