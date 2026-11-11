import { publicEnv } from "@/lib/public-env";
import type { CustomerCountryOption } from "@/lib/customers";

function mapAdminCountries(payload: unknown): CustomerCountryOption[] {
  if (!payload || typeof payload !== "object") return [];
  const data = (payload as { data?: unknown }).data;
  if (!Array.isArray(data)) return [];

  const list: CustomerCountryOption[] = [];
  for (const item of data) {
    if (!item || typeof item !== "object") continue;
    const entry = item as Record<string, unknown>;
    if (entry.is_region) continue;
    const name = typeof entry.name === "string" ? entry.name.trim() : "";
    const iso2 = typeof entry.iso2 === "string" ? entry.iso2.trim().toUpperCase() : "";
    const image = typeof entry.image === "string" ? entry.image.trim() : "";
    if (!name || !iso2) continue;
    list.push({ name, iso2, image });
  }
  return list.sort((a, b) => a.name.localeCompare(b.name));
}

function mapStaticCountries(payload: unknown): CustomerCountryOption[] {
  if (!Array.isArray(payload)) return [];
  const list: CustomerCountryOption[] = [];
  for (const item of payload) {
    if (!item || typeof item !== "object") continue;
    const entry = item as Record<string, unknown>;
    const name = typeof entry.name === "string" ? entry.name.trim() : "";
    const iso2 = typeof entry.code === "string" ? entry.code.trim().toUpperCase() : "";
    if (!name || !iso2) continue;
    list.push({ name, iso2, image: "" });
  }
  return list.sort((a, b) => a.name.localeCompare(b.name));
}

export async function GET() {
  if (publicEnv.adminConfig) {
    try {
      const response = await fetch(`${publicEnv.adminConfig}Country-Region-List`, {
        next: { revalidate: 60 * 60 * 24 },
        signal: AbortSignal.timeout(8000),
      });
      if (response.ok) {
        const list = mapAdminCountries(await response.json());
        if (list.length) return Response.json(list);
      }
    } catch {
      // Fall back to static countries list below.
    }
  }

  try {
    const fallback = await fetch("https://partners-qa.dev.zetexa.com/assets/countries.json", {
      next: { revalidate: 60 * 60 * 24 },
      signal: AbortSignal.timeout(8000),
    });
    if (fallback.ok) {
      const list = mapStaticCountries(await fallback.json());
      if (list.length) return Response.json(list);
    }
  } catch {
    // Handled by 502 below.
  }

  return Response.json({ message: "Country list is unavailable." }, { status: 502 });
}

