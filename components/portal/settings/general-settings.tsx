"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import { SearchableSelect } from "@/components/portal/settings/searchable-select";
import { TextField } from "@/components/ui/form-field";
import { Icon } from "@/components/ui/icon";
import {
  identityKeys,
  isDuplicateDestination,
  markupPayload,
  sameSelection,
  type DestinationIdentity,
} from "@/lib/account-settings";
import { hasPermission, type FeatureAccess } from "@/lib/auth-session";
import {
  asRecord,
  errorText,
  PortalRequestError,
  portalRequest,
  requestErrorMessage,
  text,
  type JsonRecord,
} from "@/lib/portal-fetch";
import { readPreferredTimeZone, storePreferredTimeZone, timeZones, type TimeZoneOption } from "@/lib/time-zones";

type Country = DestinationIdentity & {
  name: string;
  country_name?: string;
};

function chipKey(country: DestinationIdentity) {
  return identityKeys(country)[0] ?? "";
}

function destinationId(country: DestinationIdentity) {
  if (country.id !== undefined && country.id !== null && String(country.id) !== "") return country.id;
  return country.country_id;
}

function chipLabel(country: Country) {
  return country.country_name || country.name;
}

function parseCountries(payload: unknown): Country[] {
  const rows = asRecord(payload)?.data;
  if (!Array.isArray(rows)) return [];
  return rows.flatMap((item) => {
    const row = asRecord(item);
    if (!row || row.is_region === true || row.is_region === "true") return [];
    const name = text(row.name);
    if (!name || identityKeys(row).length === 0) return [];
    return [{
      id: row.id,
      country_id: row.country_id,
      name,
      country_name: text(row.country_name) || undefined,
    }];
  });
}

function parseDestinations(payload: unknown): Country[] {
  const rows = asRecord(payload)?.countries_data;
  if (!Array.isArray(rows)) return [];
  return rows.flatMap((item) => {
    const row = asRecord(item);
    if (!row || identityKeys(row).length === 0) return [];
    return [{
      id: row.id,
      country_id: row.country_id,
      name: text(row.name),
      country_name: text(row.country_name) || undefined,
    }];
  });
}

export function GeneralSettings({ resellerId, access }: { resellerId: string; access: FeatureAccess }) {
  const canMarkup = hasPermission(access, "SetMarkup");
  const canDestinations = hasPermission(access, "SetTopDestination");
  const canSave = canMarkup || canDestinations;
  const [markup, setMarkup] = useState("");
  const [markupBase, setMarkupBase] = useState("");
  const [markupLoading, setMarkupLoading] = useState(canMarkup);
  const [countries, setCountries] = useState<Country[]>([]);
  const [chips, setChips] = useState<Country[]>([]);
  const [destinationBase, setDestinationBase] = useState<string[]>([]);
  const [destinationsLoading, setDestinationsLoading] = useState(canDestinations);
  const [zone, setZone] = useState<TimeZoneOption | null>(null);
  const [zoneBase, setZoneBase] = useState("");
  const [zoneReady, setZoneReady] = useState(false);
  const [saving, setSaving] = useState(false);

  const zoneOptions = useMemo(() => {
    if (zone && !timeZones.some((item) => item.value === zone.value)) return [zone, ...timeZones];
    return timeZones;
  }, [zone]);

  useEffect(() => {
    const initial = readPreferredTimeZone();
    setZone(initial);
    setZoneBase(initial?.value ?? "");
    setZoneReady(true);
  }, []);

  useEffect(() => {
    if (!canMarkup) return;
    let ignore = false;
    portalRequest<JsonRecord>(`/api/settings?resource=markup&reseller_id=${encodeURIComponent(resellerId)}`)
      .then((res) => {
        if (ignore) return;
        const value = res.markup == null || res.markup === "" ? "" : String(res.markup);
        setMarkup(value);
        setMarkupBase(value);
      })
      .catch((err) => {
        console.error("Error fetching markup data", err);
      })
      .finally(() => {
        if (!ignore) setMarkupLoading(false);
      });
    return () => {
      ignore = true;
    };
  }, [canMarkup, resellerId]);

  useEffect(() => {
    if (!canDestinations) return;
    let ignore = false;
    Promise.allSettled([
      portalRequest<JsonRecord>("/api/settings?resource=countries"),
      portalRequest<JsonRecord>("/api/settings?resource=destinations"),
    ])
      .then(([countryResult, savedResult]) => {
        if (ignore) return;
        if (countryResult.status === "fulfilled") setCountries(parseCountries(countryResult.value));
        else if (!(countryResult.reason instanceof PortalRequestError && countryResult.reason.status === 401)) {
          console.error(countryResult.reason);
        }
        if (savedResult.status === "fulfilled") {
          const saved = parseDestinations(savedResult.value);
          setChips(saved);
          setDestinationBase(saved.map(chipKey));
        } else if (!(savedResult.reason instanceof PortalRequestError && savedResult.reason.status === 401)) {
          console.error(savedResult.reason);
        }
      })
      .finally(() => {
        if (!ignore) setDestinationsLoading(false);
      });
    return () => {
      ignore = true;
    };
  }, [canDestinations]);

  function addCountry(optionValue: string) {
    const country = countries.find((item, index) => `${chipKey(item)}-${index}` === optionValue);
    if (!country) return;
    if (isDuplicateDestination(chips, country)) {
      toast.error("Duplicate input!");
      return;
    }
    if (chips.length >= 10) {
      toast.error("Maximum of 10 destinations can be added!");
      return;
    }
    setChips((current) => [...current, country]);
  }

  async function updateSettings() {
    if (saving || !canSave) return;
    setSaving(true);
    try {
      if (canMarkup && markup !== markupBase) {
        const parsed = markupPayload(markup);
        if (!parsed.ok) {
          toast.error("Markup must be a whole number between 0 and 999.");
        } else {
          try {
            const res = await portalRequest<JsonRecord>("/api/settings?resource=markup", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ markup: parsed.markup }),
            });
            if (res.success === false) {
              throw new Error(errorText(res) || "Markup could not be updated. Please try again.");
            }
            toast.success("Changes updated successfully!");
            setMarkupBase(markup);
          } catch (err) {
            const message = requestErrorMessage(err, "Markup could not be updated. Please try again.");
            if (message) toast.error(message);
          }
        }
      }

      const currentKeys = chips.map(chipKey);
      if (canDestinations && !sameSelection(currentKeys, destinationBase)) {
        try {
          if (chips.length === 0) {
            const res = await portalRequest<JsonRecord>(
              `/api/settings?resource=destinations&reseller_id=${encodeURIComponent(resellerId)}`,
              { method: "DELETE" },
            );
            if (res.success === false) throw new Error(errorText(res) || "Request failed.");
            toast.success("Removed Top Destinations!!");
          } else {
            const res = await portalRequest<JsonRecord>("/api/settings?resource=destinations", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                countries_ids: chips.map((chip) => destinationId(chip)),
              }),
            });
            if (res.success === false) throw new Error(errorText(res) || "Request failed.");
            toast.success("Top Destinations updated successfully!");
          }
          setDestinationBase(currentKeys);
        } catch (err) {
          const message = requestErrorMessage(err, "Request failed.");
          if (message) toast.error(message);
        }
      }

      if (zoneReady && zone && zone.value !== zoneBase) {
        try {
          storePreferredTimeZone(zone);
          toast.success("Prefered Time Zone updated successfully!");
          setZoneBase(zone.value);
        } catch (err) {
          console.error(err);
        }
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="rounded-3xl border border-line bg-surface p-5 shadow-[var(--shadow)] sm:p-6">
      <h2 className="text-lg font-semibold text-ink">General Settings</h2>
      <div className="mt-5 space-y-5">
        {canMarkup ? (
          <TextField
            id="markup"
            label="Markup"
            placeholder="Enter Markup Value"
            value={markup}
            inputMode="numeric"
            disabled={markupLoading}
            onChange={(value) => setMarkup(value.replace(/\D/g, "").slice(0, 3))}
          />
        ) : null}

        {canDestinations ? (
          <div className="space-y-3">
            <SearchableSelect
              id="top-destinations"
              label="Top Destinations"
              placeholder="Select Destinations"
              disabled={destinationsLoading}
              options={countries.map((country, index) => ({
                value: `${chipKey(country)}-${index}`,
                label: country.name,
              }))}
              value=""
              onSelect={(option) => addCountry(option.value)}
            />
            {destinationsLoading ? null : chips.length === 0 ? (
              <p className="text-sm text-muted">No destinations added.</p>
            ) : (
              <ul className="flex flex-wrap gap-2">
                {chips.map((chip, index) => (
                  <li
                    key={`${chipKey(chip)}-${index}`}
                    className="inline-flex items-center gap-1.5 rounded-full bg-mint py-1 pr-1.5 pl-3 text-sm font-medium text-primary"
                  >
                    {chipLabel(chip)}
                    <button
                      type="button"
                      aria-label={`Remove ${chipLabel(chip)}`}
                      onClick={() => setChips((current) => current.filter((_, chipIndex) => chipIndex !== index))}
                      className="inline-flex h-6 w-6 cursor-pointer items-center justify-center rounded-full text-primary hover:bg-primary hover:text-on-primary"
                    >
                      <Icon name="close" className="h-3.5 w-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : null}

        <SearchableSelect
          id="time-zone"
          label="Time Zone"
          placeholder="Select Time Zone"
          options={zoneOptions}
          value={zone?.value ?? ""}
          onSelect={(option) => setZone({ label: option.label, value: option.value })}
        />

        {canSave ? (
          <button
            type="button"
            onClick={updateSettings}
            disabled={saving}
            aria-busy={saving}
            className="inline-flex h-11 cursor-pointer items-center justify-center rounded-full bg-primary px-5 text-sm font-semibold text-on-primary transition hover:bg-primary-hover disabled:opacity-50"
          >
            Update Settings
          </button>
        ) : null}
      </div>
    </section>
  );
}
