"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { toast } from "react-toastify";
import { usePartner } from "@/components/shell/partner-context";
import { hasPermission } from "@/lib/auth-session";
import { ancillaryImage, checkoutIdFrom } from "@/lib/dashboard";
import {
  canRestoreCheckout,
  checkoutFrom,
  checkoutId,
  clearCheckout,
  moneyAmount,
  setCheckoutId,
  type CheckoutLine,
  type CheckoutView as CheckoutCart,
} from "@/lib/buy-sims";
import { notifyCart } from "@/lib/cart-bus";
import { brandsWithDevices } from "@/lib/device-brands";
import { asList, asRecord, portalRequest, PortalRequestError, requestErrorMessage, text, type JsonRecord } from "@/lib/portal-fetch";
import { fieldClass, ghostButton, primaryButton } from "@/components/portal/buy-sims/shared";
import { AssignCustomerDialog } from "@/components/portal/buy-sims/assign-customer-dialog";
import { Icon } from "@/components/ui/icon";
import { Modal } from "@/components/ui/modal";
import type { CustomerCountryOption, CustomerRecord } from "@/lib/customers";
type Address = { id: string; label: string; raw: JsonRecord };
type AddonService = { name: string; image: string; description: string; raw: JsonRecord };

function addonServices(payload: JsonRecord): AddonService[] {
  if (payload.success === false) return [];
  return asList(payload.data)
    .map((item) => ({
      name: text(item.service_name),
      image: text(item.service_image_url) || ancillaryImage(text(item.service_name)),
      description: text(item.description),
      raw: item,
    }))
    .filter((item) => item.name && !item.name.toLowerCase().includes("esim"));
}
type LineDraft = { simType: string; delivery: "onspot" | "shiprocket"; zip: string; date: string; iccidQuery: string; iccids: string[] };

export function CheckoutView() {
  const partner = usePartner();
  const router = useRouter();
  const search = useSearchParams();
  const queryId = search.get("checkout_id") || "";
  const [id, setId] = useState("");
  const [ready, setReady] = useState(false);
  const [cart, setCart] = useState<CheckoutCart | null>(null);
  const [cleared, setCleared] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [wallet, setWallet] = useState(0);
  const [assignOpen, setAssignOpen] = useState(false);
  const [customer, setCustomer] = useState<CustomerRecord | null>(null);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [addressId, setAddressId] = useState("");
  const [comment, setComment] = useState("");
  const [coupon, setCoupon] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState("");
  const [nationality, setNationality] = useState<boolean | null>(null);
  const [askNationality, setAskNationality] = useState(false);
  const [restriction, setRestriction] = useState("");
  const [paying, setPaying] = useState("");
  const [busy, setBusy] = useState("");
  const [services, setServices] = useState<AddonService[]>([]);
  const [drafts, setDrafts] = useState<Record<string, LineDraft>>({});
  const [deviceReady, setDeviceReady] = useState(false);
  const [deviceError, setDeviceError] = useState(false);
  const [addressOpen, setAddressOpen] = useState(false);
  const [addressZip, setAddressZip] = useState("");
  const [devicesOpen, setDevicesOpen] = useState(false);
  const [brands, setBrands] = useState<{ id: string; name: string }[]>([]);
  const [brandId, setBrandId] = useState("");
  const [devices, setDevices] = useState<string[]>([]);
  const [deviceQuery, setDeviceQuery] = useState("");
  const customerRef = useRef<HTMLButtonElement>(null);
  const retryTimer = useRef(0);

  async function resolveCheckoutId() {
    const fromQuery = queryId.trim();
    if (fromQuery) {
      setCheckoutId(fromQuery);
      return fromQuery;
    }
    const stored = checkoutId();
    if (stored) return stored;
    if (!canRestoreCheckout()) return "";
    try {
      const last = await portalRequest<JsonRecord>("/api/buy-sims?resource=last-checkout");
      const recovered = checkoutIdFrom(last);
      if (recovered) setCheckoutId(recovered);
      return recovered;
    } catch {
      return "";
    }
  }

  async function cartStillHasLines(checkout: string) {
    try {
      const payload = await portalRequest<JsonRecord>(`/api/buy-sims?resource=cart&checkout_id=${encodeURIComponent(checkout)}`);
      const lines = asList(payload.data);
      const addons = asList(asRecord(payload.addon_cart)?.items);
      return lines.length > 0 || addons.length > 0;
    } catch (err) {
      return !(err instanceof PortalRequestError && err.status === 404);
    }
  }

  async function load(couponCode = appliedCoupon, attempt = 0) {
    const checkout = await resolveCheckoutId();
    if (!checkout) {
      setId("");
      setLoading(false);
      setReady(true);
      return;
    }
    setId(checkout);
    setCleared(false);
    setLoading(true);
    setError("");
    let retrying = false;
    try {
      const payload = await portalRequest<JsonRecord>("/api/buy-sims", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resource: "checkout-packages", checkout_id: checkout, ...(couponCode ? { coupon_code: couponCode } : {}) }),
      });
      const view = checkoutFrom(payload);
      if (!view.lines.length && !view.addons.length) {
        if (await cartStillHasLines(checkout)) {
          if (attempt < 1) {
            retrying = true;
            window.clearTimeout(retryTimer.current);
            retryTimer.current = window.setTimeout(() => {
              void load(couponCode, attempt + 1);
            }, 600);
            return;
          }
          setError("Could not load checkout.");
          return;
        }
        clearCheckout();
        setCart(null);
        setCustomer(null);
        setAddresses([]);
        setAddressId("");
        setNationality(null);
        setId("");
        setCleared(true);
        notifyCart({ close: true, lines: [] });
        return;
      }
      setCleared(false);
      setCart(view);
      setDrafts((current) => {
        const next = { ...current };
        for (const line of view.lines) {
          next[line.lineId] = {
            simType: line.simType === "psim" ? "psim" : current[line.lineId]?.simType || line.simType || "esim",
            delivery: current[line.lineId]?.delivery || "onspot",
            zip: line.zip || current[line.lineId]?.zip || "",
            date: line.journeyDate || current[line.lineId]?.date || "",
            iccidQuery: current[line.lineId]?.iccidQuery || "",
            iccids: current[line.lineId]?.iccids || [],
          };
        }
        return next;
      });
      if (couponCode) {
        if (view.couponApplied) toast.success(`Coupon "${couponCode}" applied successfully`);
        else toast.error(`Invalid coupon code "${couponCode}". Please try again.`);
      }
      const stored = sessionStorage.getItem("buy-sims-customer");
      const parsed = stored ? JSON.parse(stored) as CustomerRecord : null;
      if (parsed && view.customerId && parsed.id === view.customerId) {
        setCustomer(parsed);
        await loadAddresses(parsed.id);
      } else {
        setCustomer(null);
        setAddresses([]);
        setAddressId("");
      }
    } catch (err) {
      if (attempt < 1 && err instanceof PortalRequestError && err.status >= 500) {
        retrying = true;
        window.clearTimeout(retryTimer.current);
        retryTimer.current = window.setTimeout(() => {
          void load(couponCode, attempt + 1);
        }, 2000);
        return;
      }
      setError(requestErrorMessage(err, "Could not load checkout."));
    } finally {
      if (!retrying) {
        setLoading(false);
        setReady(true);
      }
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load("");
    }, 0);
    portalRequest<JsonRecord>("/api/dashboard?resource=details").then((payload) => {
      const balance = asRecord(asRecord(payload.wallet_balance_url)?.data);
      setWallet(Number(balance?.balance) || 0);
    }).catch(() => undefined);
    return () => {
      window.clearTimeout(timer);
      window.clearTimeout(retryTimer.current);
    };
  }, [queryId]);

  useEffect(() => {
    if (!partner.resellerId) return;
    let ignore = false;
    const reseller = encodeURIComponent(partner.resellerId);
    const agent = encodeURIComponent(partner.agentId);
    portalRequest<JsonRecord>(`/api/buy-sims?resource=services&reseller_id=${reseller}&agent_id=${agent}`)
      .then((payload) => {
        if (!ignore) setServices(addonServices(payload));
      })
      .catch(() => {
        if (!ignore) setServices([]);
      });
    return () => {
      ignore = true;
    };
  }, [partner.agentId, partner.resellerId]);

  async function loadAddresses(customerId: string) {
    const payload = await portalRequest<JsonRecord>(`/api/buy-sims?resource=addresses&customer_id=${encodeURIComponent(customerId)}`);
    setAddresses(asList(payload.data).map((item) => ({
      id: text(item.id || item.address_id),
      label: [item.first_name, item.last_name, item.street_address_1 || item.address, item.city, item.state, item.postal_code].map(text).filter(Boolean).join(", "),
      raw: item,
    })));
  }

  function assign(next: CustomerRecord) {
    sessionStorage.setItem("customer_id", next.id);
    sessionStorage.setItem("buy-sims-customer", JSON.stringify(next));
    setCustomer(next);
    setAddressId("");
    setNationality(null);
    void loadAddresses(next.id).catch(() => undefined);
    void checkRestriction(next);
  }

  async function checkRestriction(next: CustomerRecord) {
    const country = next.country.trim().toLowerCase();
    if (!country || country === "na") {
      setAskNationality(Boolean(cart?.nationalityRequired));
      setRestriction("");
      return;
    }
    try {
      const payload = await portalRequest<JsonRecord>("/api/buy-sims?resource=restricted");
      const restricted = asList(payload.restricted_countries).map((item) => text(item).toLowerCase());
      const names = (payload.restricted_countries && Array.isArray(payload.restricted_countries) ? payload.restricted_countries : []).map((item) => text(item).toLowerCase());
      const blockedList = names.length ? names : restricted;
      if (country === "india" || cart?.nationalityRequired) {
        setAskNationality(true);
        setRestriction("");
        return;
      }
      if (blockedList.includes(country)) {
        const ownCountry = cart?.lines.some((line) => !line.showCoverage && line.coverage.toLowerCase() === country);
        setAskNationality(Boolean(ownCountry));
        setRestriction(ownCountry ? "" : "This customer cannot buy a plan outside their country.");
        return;
      }
      setAskNationality(false);
      setRestriction("");
    } catch {
      setAskNationality(Boolean(cart?.nationalityRequired));
    }
  }

  function openAssign() {
    const esim = cart?.lines.some((line) => (drafts[line.lineId]?.simType || line.simType) === "esim");
    if (esim && !deviceReady) {
      setDeviceError(true);
      toast.error("Please Check Compatible Devices");
      return;
    }
    setDeviceError(false);
    setAssignOpen(true);
  }

  function openAddon(service: AddonService) {
    if (service.name.toLowerCase() === "esim") {
      router.push("/buy-sims");
      return;
    }
    const addonCart = cart?.addonCart ?? null;
    const airports = asList(addonCart?.airports);
    const airportCode = text(cart?.addons[0]?.raw.airport_code || cart?.addons[0]?.raw.location_code) || text(airports[0]?.iata_code);
    sessionStorage.setItem("preselected-addon-service", JSON.stringify({ ...service.raw, airport_hint: airportCode }));
    let stored: JsonRecord = {};
    try {
      stored = asRecord(JSON.parse(sessionStorage.getItem("airport-addon-booking") || "{}")) ?? {};
    } catch {
      stored = {};
    }
    const fromAirport = asRecord(addonCart?.from_airport) || asRecord(stored.from);
    const toAirport = asRecord(addonCart?.to_airport) || asRecord(stored.to);
    const layovers = Array.isArray(addonCart?.layovers) ? addonCart.layovers : Array.isArray(stored.layovers) ? stored.layovers : [];
    if (fromAirport && toAirport) {
      const withCode = (airport: JsonRecord) => ({ ...airport, iataCode: text(airport.iataCode || airport.iata_code) });
      sessionStorage.setItem("airport-addon-booking", JSON.stringify({
        from: withCode(fromAirport),
        to: withCode(toAirport),
        layovers,
        resellerId: partner.resellerId,
        agentId: partner.agentId,
        selectedService: service.raw,
      }));
      sessionStorage.removeItem("airport-addon-services-state");
      router.push("/buy-airport-service/airport-services");
      return;
    }
    router.push("/buy-airport-service");
  }

  function openAddress(line: CheckoutLine) {
    if (!customer) {
      toast.error("Please assign the customer before selecting an address.");
      return;
    }
    const draft = drafts[line.lineId];
    setAddressZip(draft?.zip || line.zip);
    setAddressOpen(true);
  }

  async function removeAddress(address: Address) {
    if (!window.confirm("Delete this address?")) return;
    try {
      await portalRequest(`/api/buy-sims?address_id=${encodeURIComponent(address.id)}`, { method: "DELETE" });
      if (addressId === address.id) setAddressId("");
      if (customer) await loadAddresses(customer.id);
    } catch (err) {
      toast.error(requestErrorMessage(err, "Could not delete the address."));
    }
  }

  async function updateLine(line: CheckoutLine, body: JsonRecord) {
    setBusy(line.lineId);
    try {
      const result = await portalRequest<JsonRecord>("/api/buy-sims", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resource: "update-line",
          checkout_id: id,
          checkout_line_id: line.lineId,
          order_type: "NEW_SIM",
          ...body,
        }),
      });
      if (result.success === false) {
        toast.error(text(result.message) || "Could not update this line.");
        return;
      }
      if (text(result.message)) toast.success(text(result.message));
      await load();
    } catch (err) {
      toast.error(requestErrorMessage(err, "Could not update this line."));
    } finally {
      setBusy("");
    }
  }

  async function changeQuantity(line: CheckoutLine, next: number) {
    if (busy) return;
    setBusy(line.lineId);
    try {
      if (next < 1) {
        await portalRequest("/api/buy-sims", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ resource: "cart-delete", checkout_id: id, package_id: line.id }),
        });
      } else {
        await portalRequest("/api/buy-sims", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ resource: "cart-update", checkout_id: id, package_id: line.id, sim_type: drafts[line.lineId]?.simType || line.simType, quantity: next, checkout_line_id: line.lineId }),
        });
      }
      await load();
    } catch (err) {
      toast.error(requestErrorMessage(err, "Could not update the quantity."));
    } finally {
      setBusy("");
    }
  }

  async function searchIccid(line: CheckoutLine, value: string) {
    setDrafts((current) => ({ ...current, [line.lineId]: { ...current[line.lineId], iccidQuery: value } }));
    if (value.trim().length < 3) return;
    try {
      const payload = await portalRequest<JsonRecord>(`/api/buy-sims?resource=iccids&search=${encodeURIComponent(value.trim())}`);
      const iccids = asList(payload.data).map((item) => text(item.iccid)).filter(Boolean);
      setDrafts((current) => ({ ...current, [line.lineId]: { ...current[line.lineId], iccids } }));
    } catch {
      setDrafts((current) => ({ ...current, [line.lineId]: { ...current[line.lineId], iccids: [] } }));
    }
  }

  async function openDevices() {
    setDevicesOpen(true);
    if (brands.length) return;
    const list = (await brandsWithDevices()).map((item) => ({ id: text(item.brand_id), name: text(item.brand_name) }));
    setBrands(list);
    if (list[0]) {
      setBrandId(list[0].id);
      await loadDevices(list[0].id);
    }
  }

  async function loadDevices(nextBrand: string) {
    try {
      const payload = await portalRequest<JsonRecord>(`/api/buy-sims?resource=devices&brand_id=${encodeURIComponent(nextBrand)}`);
      setDevices(asList(payload.data).filter((item) => item.status !== false).map((item) => text(item.device_name)).filter(Boolean).reverse());
    } catch {
      setDevices([]);
    }
  }

  async function removeAddon(group: CheckoutCart["addons"][number]) {
    setBusy(group.key);
    try {
      await portalRequest("/api/buy-sims", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resource: "addon",
          checkout_id: id,
          plan_id: group.planId,
          service_id: group.serviceId,
          service_name: group.serviceName,
          reseller_id: partner.resellerId,
          agent_id: partner.agentId,
          adult_count: 0,
          child_count: 0,
          infant_count: 0,
          currency: group.currency,
          service_date: group.date,
          service_time: group.time,
          location_code: group.location,
          terminal: group.terminal,
        }),
      });
      toast.success("Airport service removed from cart");
      await load();
    } catch (err) {
      toast.error(requestErrorMessage(err, "Could not remove the airport service."));
    } finally {
      setBusy("");
    }
  }

  async function pay(method: "wallet" | "payment_gateway") {
    if (paying || !cart || !customer) {
      customerRef.current?.focus();
      return;
    }
    if (needsAddress && !addressId) {
      toast.error("Select an address for delivery.");
      return;
    }
    if ((askNationality || cart.nationalityRequired) && nationality == null) return;
    setPaying(method);
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), 30000);
    try {
      if ((askNationality || cart.nationalityRequired) && customer.email) {
        await portalRequest("/api/buy-sims", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ resource: "nationality", email: customer.email, residing_at_nationality: nationality }),
        });
      }
      const result = await portalRequest<JsonRecord>("/api/buy-sims", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resource: "pay", checkout_id: id, comment, payment_method: method, address_id: addressId || null }),
        signal: controller.signal,
      });
      if (result.success === false) {
        toast.error(text(result.message) || "Payment was not completed.");
        return;
      }
      if (method === "payment_gateway") toast.success("Payment link has been sent to the customer email!");
      sessionStorage.setItem("buy-sims-order", JSON.stringify({
        method,
        email: customer.email,
        payload: asRecord(result.data) ?? result,
      }));
      clearCheckout();
      setCustomer(null);
      notifyCart({ close: true, lines: [] });
      toast.success("Order Successful");
      router.push("/checkout/success");
    } catch (err) {
      const aborted = err instanceof DOMException && err.name === "AbortError";
      toast.error(aborted || requestErrorMessage(err, "").includes("did not respond")
        ? "The payment request timed out. Check Orders before trying again."
        : requestErrorMessage(err, "Payment could not be completed."));
    } finally {
      window.clearTimeout(timer);
      setPaying("");
    }
  }

  if (!ready) return <div className="mx-auto h-40 max-w-6xl animate-pulse rounded-3xl bg-surface" />;

  if (!id || cleared) {
    return (
      <div className="mx-auto max-w-xl rounded-3xl border border-line bg-surface px-6 py-12 text-center">
        <h1 className="text-2xl font-semibold text-ink">Your cart is empty</h1>
        <Link href="/buy-sims" className={`${primaryButton} mt-4`}>Back to Buy SIMs</Link>
      </div>
    );
  }

  const needsEsimCheck = Boolean(cart?.lines.some((line) => (drafts[line.lineId]?.simType || line.simType) === "esim"));
  const psimReady = cart?.lines.every((line) => {
    const draft = drafts[line.lineId];
    const simType = draft?.simType || line.simType;
    if (simType !== "psim") return true;
    if (draft?.delivery === "shiprocket") return line.serviceable && Boolean(addressId);
    return Boolean(line.iccid);
  }) ?? false;
  const needsAddress = Boolean(cart?.addressRequired) || Boolean(cart?.lines.some((line) => drafts[line.lineId]?.delivery === "shiprocket" && (drafts[line.lineId]?.simType || line.simType) === "psim"));
  const nationalityMissing = Boolean((askNationality || cart?.nationalityRequired) && nationality == null);
  const lowBalance = cart ? wallet < cart.summary.total : false;
  const reason = restriction
    || (!customer ? "Assign a customer first" : "")
    || (needsEsimCheck && !deviceReady ? "Confirm the device supports eSIM" : "")
    || (!psimReady ? "Finish the physical SIM details" : "")
    || (needsAddress && !addressId ? "Select an address" : "")
    || (nationalityMissing ? "Answer the nationality question" : "");
  const canShip = hasPermission(partner.featureAccess, "MakeShipmentOrder");

  return (
    <div className={`mx-auto grid w-full max-w-6xl gap-5 ${services.length ? "lg:grid-cols-[minmax(0,1.6fr)_minmax(18rem,1fr)]" : ""}`}>
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold text-ink">Checkout</h1>
        {loading ? <div className="h-40 animate-pulse rounded-3xl bg-surface" /> : null}
        {error ? <p className="rounded-2xl border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger">{error} <button type="button" onClick={() => void load()} className="font-semibold text-primary">Try again</button></p> : null}
        {cart?.lines.map((line) => {
          const draft = drafts[line.lineId] || { simType: line.simType, delivery: "onspot" as const, zip: line.zip, date: line.journeyDate, iccidQuery: "", iccids: [] };
          return (
            <article key={line.lineId || line.id} className="rounded-3xl border border-line bg-surface p-4">
              <div className="flex items-start gap-3">
                {line.flag ? <img src={line.flag} alt="" className="h-8 w-8 rounded-full object-cover" /> : null}
                <div className="min-w-0 flex-1">
                  <h2 className="truncate font-semibold text-ink" title={line.title}>{line.title}</h2>
                  <p className="mt-1 text-sm text-muted">{line.data || "—"}{line.category === 2 && line.minutes ? ` · ${line.minutes} mins` : ""}{line.category === 2 && line.sms ? ` · ${line.sms} SMS` : ""} · {line.days} Days</p>
                </div>
                <button type="button" aria-label="Remove" disabled={busy === line.lineId} onClick={() => void changeQuantity(line, 0)} className="grid h-9 w-9 place-items-center rounded-full text-danger disabled:cursor-wait"><Icon name="trash" className="h-4 w-4" /></button>
              </div>
              <div className="mt-3 flex items-center justify-between gap-3">
                {line.category === 1 ? (
                  <div className="inline-flex items-center rounded-full border border-line">
                    <button type="button" aria-label="Decrease quantity" disabled={busy === line.lineId} onClick={() => void changeQuantity(line, line.quantity - 1)} className="h-9 w-9">−</button>
                    <span className="w-8 text-center tabular-nums">{line.quantity}</span>
                    <button type="button" aria-label="Increase quantity" disabled={busy === line.lineId} onClick={() => void changeQuantity(line, line.quantity + 1)} className="h-9 w-9">+</button>
                  </div>
                ) : <p className="text-sm text-muted">Your number will be shared via your order email.</p>}
                <p className="tabular-nums font-semibold text-ink">{moneyAmount(line.price, cart.currency)}</p>
              </div>
              <label className="mt-4 block text-sm font-medium text-ink">Choose SIM Type <span className="text-danger">*</span>
                <select value={draft.simType} disabled={!line.psimAllowed && draft.simType === "esim"} onChange={(event) => {
                  const simType = event.target.value;
                  if (simType === "psim" && line.quantity !== 1) toast.error("For pSIM, quantity must be 1");
                  setDrafts((current) => ({ ...current, [line.lineId]: { ...draft, simType, delivery: simType === "psim" ? draft.delivery : "onspot" } }));
                  if (simType === "esim") void updateLine(line, { sim_type: "esim", iccid: "" });
                }} className={`${fieldClass} mt-1`}>
                  <option value="esim">eSIM</option>
                  {line.psimAllowed ? <option value="psim">pSIM</option> : null}
                </select>
              </label>
              {draft.simType === "psim" ? (
                <div className="mt-3 space-y-3 text-sm">
                  <div className="flex flex-wrap gap-3">
                    <label className="inline-flex items-center gap-2"><input type="radio" name={`delivery-${line.lineId}`} checked={draft.delivery === "onspot"} onChange={() => setDrafts((current) => ({ ...current, [line.lineId]: { ...draft, delivery: "onspot" } }))} />On spot Purchase</label>
                    {canShip ? <label className="inline-flex items-center gap-2"><input type="radio" name={`delivery-${line.lineId}`} checked={draft.delivery === "shiprocket"} onChange={() => setDrafts((current) => ({ ...current, [line.lineId]: { ...draft, delivery: "shiprocket" } }))} />Ship via Shiprocket</label> : null}
                  </div>
                  {draft.delivery === "onspot" ? (
                    <div>
                      <label className="text-muted">Physical SIM Details (ICCID)</label>
                      <input value={draft.iccidQuery} onChange={(event) => void searchIccid(line, event.target.value)} placeholder={line.iccid || "Enter last 5 digits of ICC ID"} className={`${fieldClass} mt-1`} />
                      {draft.iccids.length ? (
                        <ul className="mt-1 max-h-32 overflow-y-auto rounded-2xl border border-line">
                          {draft.iccids.map((iccid) => (
                            <li key={iccid}><button type="button" onClick={() => void updateLine(line, { sim_type: "psim", iccid })} className="w-full px-3 py-2 text-left hover:bg-mint">{iccid}</button></li>
                          ))}
                        </ul>
                      ) : null}
                      {line.iccid ? <p className="mt-1 text-primary">Selected {line.iccid}</p> : null}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <p className="text-danger">Delivery is available only in INDIA.</p>
                      <div className="grid gap-2 sm:grid-cols-2">
                        <input aria-label="Pincode" value={draft.zip} onChange={(event) => setDrafts((current) => ({ ...current, [line.lineId]: { ...draft, zip: event.target.value } }))} placeholder="Enter Pincode" className={fieldClass} />
                        <input aria-label="Traveling date" type="date" value={draft.date} onChange={(event) => setDrafts((current) => ({ ...current, [line.lineId]: { ...draft, date: event.target.value } }))} className={fieldClass} />
                      </div>
                      <button type="button" disabled={busy === line.lineId} onClick={() => void updateLine(line, { sim_type: "psim", zip_code: draft.zip, date_of_journey: draft.date || null })} className={ghostButton}>Check</button>
                      {line.serviceable ? <p className="text-primary">Delivery available | Cost: {moneyAmount(line.shippingCost, cart.currency)}</p> : null}
                      {line.serviceable && addressId ? <p className="rounded-2xl bg-soft px-3 py-2 text-ink">{addresses.find((item) => item.id === addressId)?.label}</p> : null}
                      {line.serviceable ? <button type="button" onClick={() => openAddress(line)} className={primaryButton}>Select/Add Address</button> : null}
                    </div>
                  )}
                </div>
              ) : (
                <div className="mt-4 border-t border-line pt-3 text-sm">
                  <label className="flex items-start gap-2 text-ink">
                    <input type="checkbox" checked={deviceReady} onChange={(event) => { setDeviceReady(event.target.checked); if (event.target.checked) setDeviceError(false); }} className="mt-1" />
                    Before purchasing, ensure your customer&apos;s device supports eSIM and is unlocked. Ask them to dial *#06# and check for an EID.
                  </label>
                  <button type="button" onClick={() => void openDevices()} className="mt-2 font-semibold text-primary underline">Check Compatible Device List</button>
                  {deviceError && !deviceReady ? <p className="mt-1 text-danger">Please Check Compatible Device</p> : null}
                  {devicesOpen ? (
                    <div className="mt-3">
                      <div className="flex flex-wrap gap-2">
                        {brands.map((brand) => (
                          <button key={brand.id} type="button" onClick={() => { setBrandId(brand.id); setDeviceQuery(""); void loadDevices(brand.id); }} className={brandId === brand.id ? primaryButton : ghostButton}>{brand.name}</button>
                        ))}
                      </div>
                      <input aria-label="Search devices" value={deviceQuery} onChange={(event) => setDeviceQuery(event.target.value)} placeholder="Search Devices.." className={`${fieldClass} mt-3`} />
                      <ul className="mt-2 grid max-h-40 grid-cols-2 gap-1 overflow-y-auto text-muted">
                        {(deviceQuery.trim().length > 2 ? devices.filter((name) => name.toLowerCase().includes(deviceQuery.trim().toLowerCase())) : devices).map((name) => <li key={name}>{name}</li>)}
                      </ul>
                    </div>
                  ) : null}
                </div>
              )}
            </article>
          );
        })}
        {cart?.addons.length ? (
          <section className="rounded-3xl border border-line bg-surface p-4">
            <h2 className="font-semibold text-ink">Airport Services</h2>
            {cart.addons.map((group) => (
              <article key={group.key} className="mt-3 text-sm">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-ink">{group.serviceName}</p>
                    <p className="text-muted">{group.displayName} · {group.location} · {group.terminal}</p>
                    <p className="text-muted">{group.date} {group.time}</p>
                    <p>Adults {group.adults} · Children {group.children} · Infants {group.infants}</p>
                    {group.names.length ? <p className="text-muted">{group.names.join(", ")}</p> : null}
                  </div>
                  <button type="button" disabled={busy === group.key} onClick={() => void removeAddon(group)} className="text-sm font-semibold text-danger">Remove</button>
                </div>
              </article>
            ))}
          </section>
        ) : null}
        {cart?.lines.length ? (
          cart.couponApplied ? (
            <div className="flex flex-wrap gap-2">
              <input readOnly value={cart.couponCode || appliedCoupon} className={fieldClass} />
              <button type="button" onClick={() => { setCoupon(""); setAppliedCoupon(""); void load(""); }} className={ghostButton}>Remove Coupon</button>
            </div>
          ) : (
            <form className="flex flex-wrap gap-2" onSubmit={(event) => { event.preventDefault(); const code = coupon.trim(); setAppliedCoupon(code); void load(code); }}>
              <input value={coupon} maxLength={20} onChange={(event) => setCoupon(event.target.value)} placeholder="Enter Promo Code" className={fieldClass} />
              <button type="submit" disabled={!coupon.trim()} className={primaryButton}>Apply Coupon</button>
            </form>
          )
        ) : null}
        {cart ? (
          <Summary cart={cart}>
            <div className="mt-4 text-center">
              <button ref={customerRef} type="button" onClick={openAssign} className={primaryButton}>Assign Customer</button>
              {customer ? <p className="mt-2 text-sm text-primary">All plans assigned to <strong>{customer.firstName} {customer.lastName}</strong></p> : null}
            </div>
          </Summary>
        ) : null}
        <AssignCustomerDialog open={assignOpen} onClose={() => setAssignOpen(false)} onAssigned={assign} />
        <AddressDialog
          open={addressOpen}
          zip={addressZip}
          addresses={addresses}
          customerId={customer?.id || ""}
          onClose={() => setAddressOpen(false)}
          onSaved={async () => { if (customer) await loadAddresses(customer.id); }}
          onDelete={removeAddress}
          onUse={(address) => {
            const postal = text(address.raw.postal_code || address.raw.pincode);
            if (addressZip && postal && addressZip !== postal) {
              toast.error(`Entered pincode (${addressZip}) does not match selected address postal code (${postal}).`);
              return;
            }
            setAddressId(address.id);
            setAddressOpen(false);
          }}
        />
        <label className="block text-sm font-medium text-ink">Comment
          <textarea maxLength={100} value={comment} onChange={(event) => setComment(event.target.value.slice(0, 100))} placeholder="Add a comment" className={`${fieldClass} mt-1 h-24 py-2`} />
          <span className="mt-1 block text-xs text-muted">{comment.length}/100</span>
        </label>
        {askNationality || cart?.nationalityRequired ? (
          <div className="rounded-2xl border border-line bg-surface px-4 py-3">
            <p id="nationality-question" className="text-sm font-semibold text-ink">Is the customer residing in the country of their nationality?</p>
            <div className="mt-3 flex flex-wrap gap-2" role="radiogroup" aria-labelledby="nationality-question">
              {([true, false] as const).map((value) => (
                <label key={String(value)} className={`inline-flex h-10 cursor-pointer items-center gap-2 rounded-full border px-4 text-sm font-semibold ${nationality === value ? "border-primary bg-mint text-primary" : "border-line bg-white text-navy"}`}>
                  <input type="radio" name="nationality" className="h-4 w-4 accent-primary" checked={nationality === value} onChange={() => setNationality(value)} />
                  {value ? "Yes" : "No"}
                </label>
              ))}
            </div>
          </div>
        ) : null}
        {restriction ? <p className="text-sm text-danger">{restriction}</p> : null}
        {customer ? <p className="text-center text-sm text-ink">Assigned all Packages to <span className="font-semibold text-primary">{customer.firstName} {customer.lastName}</span></p> : null}
        {reason ? <p className="text-center text-sm text-danger">{reason}</p> : null}
        {!reason ? (
          <div className={`flex flex-col justify-center gap-3 sm:flex-row ${services.length ? "" : "sm:pr-36"}`}>
            <button type="button" disabled={Boolean(paying)} onClick={() => void pay("payment_gateway")} className={`${ghostButton} sm:min-w-64`}>
              <Icon name="share" className="mr-2 h-4 w-4" />
              {paying === "payment_gateway" ? "Sending…" : "Proceed with Payment Link"}
            </button>
            <button type="button" disabled={Boolean(paying) || lowBalance} onClick={() => void pay("wallet")} className={`${primaryButton} sm:min-w-64`}>
              <Icon name="wallet" className="mr-2 h-4 w-4" />
              {paying === "wallet" ? "Processing…" : "Proceed with Wallet Payment"}
            </button>
          </div>
        ) : null}
      </div>
      {services.length ? (
        <aside className="h-fit rounded-3xl border border-line bg-surface p-4 lg:sticky lg:top-4">
          <h2 className="font-semibold text-ink">Add More Services</h2>
          <div className="mt-3 max-h-[calc(100dvh-8rem)] space-y-3 overflow-y-auto pr-1">
            {services.map((service) => (
              <button key={service.name} type="button" onClick={() => openAddon(service)} className="flex w-full items-center gap-3 rounded-2xl border border-line p-3 text-left">
                <img src={service.image} alt="" className="h-12 w-12 object-contain" />
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold text-ink">{service.name}</span>
                  {service.description ? <span className="block text-xs text-muted">{service.description}</span> : null}
                </span>
                <Icon name="chevron-right" className="h-4 w-4 text-muted" />
              </button>
            ))}
          </div>
        </aside>
      ) : null}
    </div>
  );
}

function Summary({ cart, children }: { cart: CheckoutCart; children?: ReactNode }) {
  const rows = [
    cart.summary.esim != null ? ["eSIM subtotal", cart.summary.esim] : null,
    cart.summary.airport > 0 ? ["Airport Services", cart.summary.airport] : null,
    cart.summary.psim > 0 ? ["pSIM Cost", cart.summary.psim] : null,
    cart.summary.shipping > 0 ? ["Shipping", cart.summary.shipping] : null,
    ["Sub total", cart.summary.net],
    ["Tax", cart.summary.tax],
    ["Customer will pay", cart.summary.total],
  ].filter(Boolean) as [string, number][];
  return (
    <div className="rounded-3xl border border-line bg-surface p-4 text-sm">
      {rows.map(([label, amount]) => <p key={label} className="flex justify-between py-1 tabular-nums"><span>{label}</span><span className={label === "Customer will pay" ? "font-semibold text-primary" : ""}>{moneyAmount(amount, cart.currency)}</span></p>)}
      {children}
    </div>
  );
}

const blankAddress = { first_name: "", last_name: "", street_address_1: "", city: "", state: "", country: "", phone: "", postal_code: "" };

function AddressDialog({
  open,
  addresses,
  customerId,
  onClose,
  onSaved,
  onDelete,
  onUse,
}: {
  open: boolean;
  zip: string;
  addresses: Address[];
  customerId: string;
  onClose: () => void;
  onSaved: () => Promise<void>;
  onDelete: (address: Address) => Promise<void>;
  onUse: (address: Address) => void;
}) {
  const [mode, setMode] = useState<"list" | "form">("list");
  const [selected, setSelected] = useState("");
  const [editing, setEditing] = useState("");
  const [form, setForm] = useState(blankAddress);
  const [error, setError] = useState("");
  const [countries, setCountries] = useState<CustomerCountryOption[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    const timer = window.setTimeout(() => {
      setMode("list");
      setError("");
      if (countries.length) return;
      fetch("/api/customers/countries")
        .then((response) => response.ok ? response.json() : [])
        .then((data) => { if (Array.isArray(data)) setCountries(data as CustomerCountryOption[]); })
        .catch(() => undefined);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [open, countries.length]);

  function startAdd() {
    setEditing("");
    setForm(blankAddress);
    setError("");
    setMode("form");
  }

  function startEdit(address: Address) {
    setEditing(address.id);
    setForm({
      first_name: text(address.raw.first_name),
      last_name: text(address.raw.last_name),
      street_address_1: text(address.raw.street_address_1 || address.raw.address),
      city: text(address.raw.city),
      state: text(address.raw.state),
      country: text(address.raw.country),
      phone: text(address.raw.phone),
      postal_code: text(address.raw.postal_code || address.raw.pincode),
    });
    setError("");
    setMode("form");
  }

  async function save() {
    const required: [keyof typeof form, string][] = [
      ["first_name", "First name is required."],
      ["last_name", "Last name is required."],
      ["street_address_1", "Street address is required."],
      ["city", "City is required."],
      ["state", "State is required."],
      ["country", "Country is required."],
      ["postal_code", "Pincode is required."],
      ["phone", "Mobile number is required."],
    ];
    const missing = required.find(([key]) => !form[key].trim());
    if (missing) {
      setError(missing[1]);
      return;
    }
    if (!/^[a-zA-Z0-9\s]+$/.test(form.street_address_1) || !/^[a-zA-Z0-9\s]+$/.test(form.city) || !/^[a-zA-Z0-9\s]+$/.test(form.state)) {
      setError("Special characters are not allowed.");
      return;
    }
    if (!/^[A-Za-z0-9\s-]{3,10}$/.test(form.postal_code)) {
      setError("Enter a valid pincode (3–10 alphanumeric characters).");
      return;
    }
    setSaving(true);
    try {
      await portalRequest("/api/buy-sims", {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resource: "address", customer_id: customerId, address_id: editing, ...form }),
      });
      toast.success(editing ? "Address updated" : "Address added");
      await onSaved();
      setMode("list");
    } catch (err) {
      setError(requestErrorMessage(err, "Could not save the address."));
    } finally {
      setSaving(false);
    }
  }

  const chosen = addresses.find((item) => item.id === selected);

  return (
    <Modal open={open} title={mode === "form" ? `${editing ? "Update" : "Add"} Address` : "Select Address"} onClose={onClose} footer={mode === "list" ? (
      <div className="flex justify-center gap-2">
        <button type="button" onClick={startAdd} className={ghostButton}>Add new address</button>
        <button type="button" disabled={!chosen} onClick={() => { if (chosen) onUse(chosen); }} className={primaryButton}>Proceed</button>
      </div>
    ) : (
      <button type="button" disabled={saving} onClick={() => void save()} className={primaryButton}>{saving ? "Saving…" : `${editing ? "Update" : "Add"} Address`}</button>
    )}>
      {error ? <p className="mb-3 text-sm text-danger">{error}</p> : null}
      {mode === "list" ? (
        <div className="space-y-2">
          {addresses.length ? addresses.map((address) => (
            <div key={address.id} className={`flex items-start justify-between gap-3 rounded-2xl border p-3 ${selected === address.id ? "border-primary bg-mint" : "border-line"}`}>
              <button type="button" onClick={() => setSelected(address.id)} className="min-w-0 flex-1 text-left">
                <span className="block font-semibold text-ink">{text(address.raw.first_name)} {text(address.raw.last_name)}</span>
                <span className="text-sm text-muted">{address.label}</span>
              </button>
              <span className="flex gap-2">
                <button type="button" onClick={() => startEdit(address)} className="text-sm font-semibold text-primary">Edit</button>
                <button type="button" onClick={() => void onDelete(address)} className="text-sm font-semibold text-danger">Delete</button>
              </span>
            </div>
          )) : <p className="py-8 text-center text-sm text-muted">No Addresses Found</p>}
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-sm text-muted">First Name<input value={form.first_name} onChange={(event) => setForm({ ...form, first_name: event.target.value })} placeholder="First Name" className={`${fieldClass} mt-1`} /></label>
          <label className="text-sm text-muted">Last Name<input value={form.last_name} onChange={(event) => setForm({ ...form, last_name: event.target.value })} placeholder="Last Name" className={`${fieldClass} mt-1`} /></label>
          <label className="text-sm text-muted sm:col-span-2">Street Address<input value={form.street_address_1} onChange={(event) => setForm({ ...form, street_address_1: event.target.value })} placeholder="Street Address" className={`${fieldClass} mt-1`} /></label>
          <label className="text-sm text-muted">City<input value={form.city} onChange={(event) => setForm({ ...form, city: event.target.value })} placeholder="City" className={`${fieldClass} mt-1`} /></label>
          <label className="text-sm text-muted">State<input value={form.state} onChange={(event) => setForm({ ...form, state: event.target.value })} placeholder="State" className={`${fieldClass} mt-1`} /></label>
          <label className="text-sm text-muted">Country
            <select value={form.country} onChange={(event) => setForm({ ...form, country: event.target.value })} className={`${fieldClass} mt-1`}>
              <option value="">Select Country</option>
              {countries.map((country) => <option key={country.iso2} value={country.iso2}>{country.name}</option>)}
            </select>
          </label>
          <label className="text-sm text-muted">Pincode<input value={form.postal_code} onChange={(event) => setForm({ ...form, postal_code: event.target.value })} placeholder="Pincode" className={`${fieldClass} mt-1`} /></label>
          <label className="text-sm text-muted">Mobile Number<input value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} placeholder="Mobile Number" className={`${fieldClass} mt-1`} /></label>
        </div>
      )}
    </Modal>
  );
}
