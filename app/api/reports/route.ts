import { publicEnv } from "@/lib/public-env";
import { readPortalSession, upstream } from "@/lib/upstream";

type ReportBody = {
  fromDate?: string;
  toDate?: string;
  platform?: string;
  filterRequest?: string;
  specific_sub_agent?: string;
  include_all_subagents?: boolean;
};

export async function GET() {
  return upstream(`${publicEnv.custConfig}reseller/agent?page=1&page_size=100&search_key=`);
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as ReportBody;
  const { user } = await readPortalSession();
  if (!body.fromDate || !body.toDate) {
    return Response.json({ message: "Choose a start and end date." }, { status: 400 });
  }

  const payload: Record<string, unknown> = { fromDate: body.fromDate, toDate: body.toDate };
  if (user?.role === "RESELLER_AGENT") {
    if (!user.agentId) {
      return Response.json({ message: "Invalid user ID. Please log in again or contact support." }, { status: 400 });
    }
    payload.request_type = "RESELLER_AGENT";
    payload.agent_id = user.agentId;
  } else {
    if (!user?.resellerId) {
      return Response.json({ message: "Invalid user ID. Please log in again or contact support." }, { status: 400 });
    }
    payload.request_type = "RESELLER_ADMIN";
    payload.resellerId = user.resellerId;
    if (body.specific_sub_agent !== undefined) {
      payload.specific_sub_agent = body.specific_sub_agent;
      payload.include_all_subagents = body.specific_sub_agent ? Boolean(body.include_all_subagents) : false;
    }
  }
  if (body.platform !== undefined) payload.platform = body.platform;
  if (body.filterRequest?.trim()) payload.filterRequest = body.filterRequest.trim();

  return upstream(`${publicEnv.orderNewConfig}v2/partners/orders/history`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
