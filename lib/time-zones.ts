export type TimeZoneOption = {
  label: string;
  value: string;
};

export const timeZones: TimeZoneOption[] = [
  { label: "Los Angeles, United States (PST) (\u221208:00)", value: "America/Los_Angeles" },
  { label: "Denver, United States (MST) (\u221207:00)", value: "America/Denver" },
  { label: "Chicago, United States (CST) (\u221206:00)", value: "America/Chicago" },
  { label: "New York, United States (EST) (\u221205:00)", value: "America/New_York" },
  { label: "Buenos Aires, Argentina (ART) (\u221203:00)", value: "America/Argentina/Buenos_Aires" },
  { label: "S\u00e3o Paulo, Brazil (BRT) (\u221203:00)", value: "America/Sao_Paulo" },
  { label: "London, United Kingdom (GMT) (\u00b100:00)", value: "Europe/London" },
  { label: "Berlin, Germany (CET) (+01:00)", value: "Europe/Berlin" },
  { label: "Paris, France (CET) (+01:00)", value: "Europe/Paris" },
  { label: "Athens, Greece (EET) (+02:00)", value: "Europe/Athens" },
  { label: "Cairo, Egypt (EET) (+02:00)", value: "Africa/Cairo" },
  { label: "Moscow, Russia (MSK) (+03:00)", value: "Europe/Moscow" },
  { label: "Nairobi, Kenya (EAT) (+03:00)", value: "Africa/Nairobi" },
  { label: "Tehran, Iran (IRST) (+03:30)", value: "Asia/Tehran" },
  { label: "Dubai, United Arab Emirates (GST) (+04:00)", value: "Asia/Dubai" },
  { label: "Kabul, Afghanistan (AFT) (+04:30)", value: "Asia/Kabul" },
  { label: "Karachi, Pakistan (PKT) (+05:00)", value: "Asia/Karachi" },
  { label: "Kolkata, India (IST) (+05:30)", value: "Asia/Kolkata" },
  { label: "Kathmandu, Nepal (NPT) (+05:45)", value: "Asia/Kathmandu" },
  { label: "Dhaka, Bangladesh (BST) (+06:00)", value: "Asia/Dhaka" },
  { label: "Bangkok, Thailand (ICT) (+07:00)", value: "Asia/Bangkok" },
  { label: "Singapore (SGT) (+08:00)", value: "Asia/Singapore" },
  { label: "Shanghai, China (CST) (+08:00)", value: "Asia/Shanghai" },
  { label: "Hong Kong (HKT) (+08:00)", value: "Asia/Hong_Kong" },
  { label: "Tokyo, Japan (JST) (+09:00)", value: "Asia/Tokyo" },
  { label: "Adelaide, Australia (ACST) (+09:30)", value: "Australia/Adelaide" },
  { label: "Sydney, Australia (AEST) (+10:00)", value: "Australia/Sydney" },
  { label: "Port Moresby, Papua New Guinea (PGT) (+10:00)", value: "Pacific/Port_Moresby" },
  { label: "Guadalcanal, Solomon Islands (SBT) (+11:00)", value: "Pacific/Guadalcanal" },
  { label: "Auckland, New Zealand (NZST) (+12:00)", value: "Pacific/Auckland" },
  { label: "Chatham Islands, New Zealand (CHAST) (+12:45)", value: "Pacific/Chatham" },
  { label: "Tongatapu, Tonga (TOT) (+13:00)", value: "Pacific/Tongatapu" },
  { label: "Kiritimati, Kiribati (LINT) (+14:00)", value: "Pacific/Kiritimati" },
];

export function readPreferredTimeZone(): TimeZoneOption | null {
  try {
    const raw = localStorage.getItem("PREFERRED_TIMEZONE");
    if (raw) {
      const parsed = JSON.parse(raw) as { label?: unknown; value?: unknown };
      if (parsed && typeof parsed.value === "string" && parsed.value) {
        return (
          timeZones.find((zone) => zone.value === parsed.value) ?? {
            label: typeof parsed.label === "string" && parsed.label ? parsed.label : parsed.value,
            value: parsed.value,
          }
        );
      }
    }
  } catch {
    /* an unreadable preference falls through to the browser zone */
  }

  const current = Intl.DateTimeFormat().resolvedOptions().timeZone;
  return timeZones.find((zone) => zone.value === current) ?? null;
}

export function storePreferredTimeZone(zone: TimeZoneOption) {
  localStorage.setItem("PREFERRED_TIMEZONE", JSON.stringify({ label: zone.label, value: zone.value }));
}
