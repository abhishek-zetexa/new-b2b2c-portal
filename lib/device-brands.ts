import { asList, portalRequest, text, type JsonRecord } from "@/lib/portal-fetch";

export async function brandsWithDevices() {
  const payload = await portalRequest<JsonRecord>("/api/buy-sims?resource=brands");
  const brands = asList(payload.data).reverse();
  const checks = await Promise.all(brands.map(async (brand) => {
    const id = text(brand.brand_id);
    if (!id) return null;
    try {
      const devices = await portalRequest<JsonRecord>(`/api/buy-sims?resource=devices&brand_id=${encodeURIComponent(id)}`);
      const names = asList(devices.data)
        .filter((item) => item.status !== false && item.status !== "false")
        .map((item) => text(item.device_name || item.name))
        .filter(Boolean);
      return names.length ? { brand, count: names.length } : null;
    } catch {
      return null;
    }
  }));
  return checks
    .filter((item): item is { brand: JsonRecord; count: number } => Boolean(item))
    .sort((a, b) => b.count - a.count)
    .map((item) => item.brand);
}
