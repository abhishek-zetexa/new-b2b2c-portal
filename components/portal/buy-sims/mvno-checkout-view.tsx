"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { CountryIso2 } from "react-international-phone";
import { toast } from "react-toastify";
import { AssignCustomerDialog } from "@/components/portal/buy-sims/assign-customer-dialog";
import { CountrySearchSelect } from "@/components/portal/customer-form-modal";
import { Dialog, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { TextField } from "@/components/ui/form-field";
import { Icon } from "@/components/ui/icon";
import { PhoneField } from "@/components/ui/phone-field";
import { moneyAmount } from "@/lib/buy-sims";
import type { CustomerCountryOption, CustomerRecord } from "@/lib/customers";
import { phoneError } from "@/lib/field-rules";
import { asList, asRecord, num, PortalRequestError, portalRequest, requestErrorMessage, text, type JsonRecord } from "@/lib/portal-fetch";
import { fieldClass, ghostButton, primaryButton } from "@/components/portal/buy-sims/shared";

const phoneCountries: CountryIso2[] = ["in", "gb", "us"];
const cartRequests = new Map<string, Promise<JsonRecord>>();

type Address = {
  id: string;
  firstName: string;
  lastName: string;
  street: string;
  city: string;
  state: string;
  country: string;
  postal: string;
  phone: string;
  label: string;
};

type StepId = "customer" | "address" | "service" | "date";

export function MvnoCheckoutView({ packageId }: { packageId: string }) {
  const router = useRouter();
  const [lines, setLines] = useState<JsonRecord[]>([]);
  const [price, setPrice] = useState<JsonRecord | null>(null);
  const [charges, setCharges] = useState<JsonRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [missing, setMissing] = useState(false);
  const [error, setError] = useState("");
  const [simType, setSimType] = useState("esim");
  const [deviceChecked, setDeviceChecked] = useState(false);
  const [devicesOpen, setDevicesOpen] = useState(false);
  const [brands, setBrands] = useState<JsonRecord[]>([]);
  const [devices, setDevices] = useState<string[]>([]);
  const [brandId, setBrandId] = useState("");
  const [deviceQuery, setDeviceQuery] = useState("");
  const [assignOpen, setAssignOpen] = useState(false);
  const [customer, setCustomer] = useState<CustomerRecord | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [country, setCountry] = useState("");
  const [phone, setPhone] = useState("");
  const [dialCode, setDialCode] = useState("");
  const [countries, setCountries] = useState<CustomerCountryOption[]>([]);
  const [formError, setFormError] = useState("");
  const [step, setStep] = useState<StepId>("customer");
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [shippingId, setShippingId] = useState("");
  const [billingId, setBillingId] = useState("");
  const [sameAddress, setSameAddress] = useState(true);
  const [addressTarget, setAddressTarget] = useState<"shipping" | "billing" | null>(null);
  const [states, setStates] = useState<{ name: string; code: string }[]>([]);
  const [stateQuery, setStateQuery] = useState("");
  const [stateOpen, setStateOpen] = useState(false);
  const [statesError, setStatesError] = useState("");
  const [stateCode, setStateCode] = useState("");
  const [stateName, setStateName] = useState("");
  const [street, setStreet] = useState("");
  const [city, setCity] = useState("");
  const [postal, setPostal] = useState("");
  const [zip, setZip] = useState("");
  const [zipOptions, setZipOptions] = useState<string[]>([]);
  const [coverageMessage, setCoverageMessage] = useState("");
  const [serviceOk, setServiceOk] = useState(false);
  const [serviceChecked, setServiceChecked] = useState(false);
  const [travelDate, setTravelDate] = useState("");
  const [travelSaved, setTravelSaved] = useState(false);
  const [savingDate, setSavingDate] = useState(false);
  const [comment, setComment] = useState("");
  const [paying, setPaying] = useState("");
  const [chargesOpen, setChargesOpen] = useState(false);

  const line = lines[0];
  const cartId = text(line?.cart_id);
  const countryData = asRecord(line?.counry_data);
  const requiredLocal = line?.required_local_address === true;
  const steps: { id: StepId; label: string; short: string }[] = [
    { id: "customer", label: "Assign Customer", short: "Assign" },
    { id: "address", label: simType === "psim" ? "Shipping & Billing" : "Billing address", short: "Address" },
    ...(requiredLocal ? [{ id: "service" as const, label: "Local address", short: "Service" }] : []),
    { id: "date", label: "Travel Date", short: "Date" },
  ];
  const stepIndex = Math.max(0, steps.findIndex((item) => item.id === step));

  useEffect(() => {
    ensureCountries(setCountries);
    return () => {
      sessionStorage.removeItem("customer_id");
    };
  }, []);

  useEffect(() => {
    let active = true;
    const timer = window.setTimeout(() => {
      setLoading(true);
      setError("");
      setMissing(false);
    }, 0);
    const request = cartRequests.get(packageId) ?? portalRequest<JsonRecord>("/api/buy-sims", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ resource: "mvno-cart", package_id: packageId, quantity: 1 }),
    });
    cartRequests.set(packageId, request);
    request.catch(() => cartRequests.delete(packageId));
    request.then((payload) => {
      if (!active) return;
      const data = asRecord(payload.data);
      if (payload.success === false || !data || !asList(data.cart_lines).length) {
        if (payload.success === false && text(payload.message) && !/not found|invalid|unavailable/i.test(text(payload.message))) setError(text(payload.message));
        else setMissing(true);
        return;
      }
      applyPayload(payload, setLines, setPrice, setCharges, setSimType);
    }).catch((err) => {
      if (!active) return;
      const status = err instanceof PortalRequestError ? err.status : 0;
      if (status === 404) setMissing(true);
      else setError(requestErrorMessage(err, "Could not load this plan."));
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [packageId]);

  useEffect(() => {
    if (!devicesOpen || brands.length) return;
    portalRequest<JsonRecord>("/api/buy-sims?resource=brands").then((payload) => {
      const list = asList(payload.data ?? payload).filter((item) => item.status === true || item.status === "true").reverse();
      setBrands(list);
      const first = text(list[0]?.brand_id);
      if (first) setBrandId(first);
    }).catch(() => setBrands([]));
  }, [devicesOpen, brands.length]);

  useEffect(() => {
    if (!brandId) return;
    const query = deviceQuery.trim();
    if (query.length > 0 && query.length < 3) return;
    const timer = window.setTimeout(() => {
      const path = query.length >= 3
        ? `/api/buy-sims?resource=device-search&brand_id=${encodeURIComponent(brandId)}&user_query=${encodeURIComponent(query)}`
        : `/api/buy-sims?resource=devices&brand_id=${encodeURIComponent(brandId)}`;
      portalRequest<JsonRecord>(path)
        .then((payload) => setDevices(asList(payload.data ?? payload).map((item) => text(item.device_name || item.name)).filter(Boolean)))
        .catch(() => setDevices([]));
    }, query.length >= 3 ? 300 : 0);
    return () => window.clearTimeout(timer);
  }, [brandId, deviceQuery]);

  useEffect(() => {
    const iso3 = text(countryData?.country_iso3);
    if (!requiredLocal || !iso3) return;
    let ignore = false;
    portalRequest<JsonRecord>(`/api/buy-sims?resource=states&iso3_code=${encodeURIComponent(iso3)}`)
      .then((payload) => {
        if (ignore) return;
        const list = stateRows(payload);
        setStates(list);
        setStatesError(list.length ? "" : "No matching state found");
      })
      .catch(() => {
        if (ignore) return;
        setStates([]);
        setStatesError("Could not load states.");
      });
    return () => {
      ignore = true;
    };
  }, [requiredLocal, countryData]);

  useEffect(() => {
    if (zip.trim().length < 2 || !stateCode) return;
    const timer = window.setTimeout(() => {
      portalRequest<JsonRecord>(`/api/buy-sims?resource=zip-search&state_code=${encodeURIComponent(stateCode)}&search=${encodeURIComponent(zip.trim())}`)
        .then((payload) => setZipOptions(zipValues(payload)))
        .catch(() => setZipOptions([]));
    }, 300);
    return () => window.clearTimeout(timer);
  }, [zip, stateCode]);

  useEffect(() => {
    const value = zip.trim();
    if (value.length < 4) return;
    const iso3 = text(countryData?.country_iso3);
    if (!iso3) return;
    const timer = window.setTimeout(() => {
      setServiceOk(false);
      setServiceChecked(false);
      portalRequest<JsonRecord>(`/api/buy-sims?resource=coverage&zipcode=${encodeURIComponent(value)}&iso3_code=${encodeURIComponent(iso3)}`)
        .then((payload) => {
          if (payload.success === false) throw new Error(text(payload.message) || "Service unavailable for this ZIP code.");
          const data = asRecord(payload.data) ?? payload;
          const nextCity = text(data.city);
          const nextPostal = text(data.postal_code || data.zip_code || data.zipcode || data.zip);
          const nextState = text(data.state);
          if (nextCity) setCity(nextCity);
          if (nextPostal) setPostal(nextPostal);
          if (!stateCode && nextState) setStateName(nextState);
          setCoverageMessage(text(payload.message));
          setServiceOk(true);
        })
        .catch((err) => {
          setServiceOk(false);
          const status = err instanceof PortalRequestError ? err.status : 0;
          setCoverageMessage(status >= 500 ? "Invalid ZIP code or server error." : "Service unavailable for this ZIP code.");
        });
    }, 400);
    return () => window.clearTimeout(timer);
  }, [zip, countryData]);

  function assign(next: CustomerRecord) {
    sessionStorage.setItem("customer_id", next.id);
    setCustomer(next);
    setFirstName(next.firstName);
    setLastName(next.lastName);
    setEmail(next.email);
    setCountry(next.countryCode.toLowerCase());
    setPhone(next.phone);
    setConfirmed(false);
    setShippingId("");
    setBillingId("");
    if (simType === "psim") setDeviceChecked(true);
    void loadAddresses(next.id);
  }

  useEffect(() => {
    const first = addresses[0]?.id;
    if (!first) return;
    const timer = window.setTimeout(() => {
      setShippingId((current) => current || first);
      setBillingId((current) => current || first);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [addresses]);

  async function loadAddresses(customerId: string) {
    const payload = await portalRequest<JsonRecord>(`/api/buy-sims?resource=addresses&customer_id=${encodeURIComponent(customerId)}`);
    const list = asList(payload.data).map(mapAddress).filter((item) => item.id);
    const keepOrFirst = (current: string) => (current && list.some((item) => item.id === current) ? current : list[0]?.id || "");
    setAddresses(list);
    setShippingId(keepOrFirst);
    setBillingId(keepOrFirst);
  }

  async function changeSim(next: string) {
    const previous = simType;
    setSimType(next);
    if (next === "psim") setDeviceChecked(true);
    try {
      const result = await portalRequest<JsonRecord>("/api/buy-sims", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resource: "mvno-sim-type", cart_id: cartId, sim_type: next }),
      });
      if (result.success === false) throw new Error(text(result.message) || "Could not update the SIM type.");
      applyPayload(result, setLines, setPrice, setCharges, setSimType);
      toast.success(text(result.message) || "Sim type updated successfully");
    } catch (err) {
      setSimType(previous);
      toast.error(requestErrorMessage(err, "Could not update the SIM type."));
    }
  }

  async function confirmCustomer() {
    if (!customer) {
      toast.error("Please Assign Customer.");
      return;
    }
    const phoneIssue = phoneError(phone, dialCode);
    if (!firstName.trim() || !lastName.trim() || !email.trim() || !country || phoneIssue) {
      setFormError(phoneIssue || "Enter the customer name, country, and a valid phone number.");
      return;
    }
    setFormError("");
    try {
      const result = await portalRequest<JsonRecord>("/api/buy-sims", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resource: "customer-info",
          customer_id: customer.id,
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          email,
          phone: phone.startsWith("+") ? phone : `${dialCode}${phone.replace(/\D/g, "")}`,
          country,
        }),
      });
      if (result.success === false) throw new Error(text(result.message) || "Failed to update customer info.");
      toast.success("Customer info updated successfully.");
      setConfirmed(true);
      setStep("address");
    } catch (err) {
      toast.error(requestErrorMessage(err, "Failed to update customer info."));
    }
  }

  async function chooseState(next: { name: string; code: string }) {
    setStateCode(next.code);
    setStateName(next.name);
    setStateQuery("");
    setStateOpen(false);
    setServiceOk(false);
    setServiceChecked(false);
    setCoverageMessage("");
    try {
      const payload = await portalRequest<JsonRecord>(`/api/buy-sims?resource=state-zips&state_code=${encodeURIComponent(next.code)}`);
      const list = zipValues(payload);
      setZipOptions(list);
      if (list[0]) setZip(list[0]);
    } catch (err) {
      toast.error(requestErrorMessage(err, "Could not load ZIP codes."));
    }
  }

  async function checkService() {
    if (!customer) {
      toast.error("Please assign the customer before selecting an address.");
      return;
    }
    try {
      const result = await portalRequest<JsonRecord>("/api/buy-sims", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resource: "mvno-service",
          cart_id: cartId,
          service_address_1: street,
          service_city: city,
          service_postal_code: postal,
          service_state: stateCode || stateName,
          service_country_code: text(line?.country),
        }),
      });
      if (result.success === false) throw new Error(text(result.message) || "Failed to check service. Please try again.");
      const data = asRecord(result.data);
      if (data?.customer_price) setPrice(asRecord(data.customer_price));
      if (data?.other_charges) setCharges(asList(data.other_charges));
      setServiceChecked(true);
      toast.success("Service check successful!");
      setStep("date");
    } catch (err) {
      setServiceChecked(false);
      toast.error(requestErrorMessage(err, "Failed to check service. Please try again."));
    }
  }

  async function saveDate() {
    if (!travelDate || savingDate) return;
    setSavingDate(true);
    try {
      const result = await portalRequest<JsonRecord>("/api/buy-sims", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resource: "mvno-date", cart_id: cartId, travel_date: travelDate }),
      });
      if (result.success === false) throw new Error(text(result.message) || "Failed to save travel date. Please try again.");
      setTravelSaved(true);
      toast.success("Travel date saved successfully!");
    } catch (err) {
      setTravelSaved(false);
      toast.error(requestErrorMessage(err, "Failed to save travel date. Please try again."));
    } finally {
      setSavingDate(false);
    }
  }

  async function pay(method: "wallet" | "payment_gateway") {
    if (paying || !customer || !canPay()) return;
    const shippingAddressId = simType === "psim" ? shippingId : billingId;
    const billingAddressId = simType === "psim" && !sameAddress ? billingId : shippingAddressId;
    setPaying(method);
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), 30000);
    try {
      const result = await portalRequest<JsonRecord>("/api/buy-sims", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resource: "mvno-order",
          cart_id: cartId,
          customer_id: customer.id,
          billing_address_id: billingAddressId,
          shipping_address_id: shippingAddressId,
          payment_method: method,
          reseller_note: comment,
        }),
        signal: controller.signal,
      });
      if (result.success === false) throw new Error(text(result.message) || "The order was not placed.");
      sessionStorage.setItem("buy-sims-order", JSON.stringify({
        method,
        email: customer.email,
        payload: asRecord(result.data) ?? result,
      }));
      sessionStorage.removeItem("customer_id");
      toast.success(method === "wallet" ? "Order placed successfully!" : "Payment link created successfully!");
      router.push("/checkout/success");
    } catch (err) {
      const aborted = err instanceof DOMException && err.name === "AbortError";
      const status = err instanceof PortalRequestError ? err.status : 0;
      toast.error(aborted
        ? "Server is taking too long. Please try again later."
        : status === 500
          ? "Server issue, please try again in a few minutes."
          : err instanceof TypeError || status === 0
            ? "Network error — check your connection."
            : requestErrorMessage(err, "The order was not placed. Your cart is unchanged."));
    } finally {
      window.clearTimeout(timer);
      setPaying("");
    }
  }

  function canPay() {
    const shippingOk = simType === "psim"
      ? addressReady(addresses.find((item) => item.id === shippingId)) && (sameAddress || addressReady(addresses.find((item) => item.id === billingId)))
      : addressReady(addresses.find((item) => item.id === billingId));
    const serviceReady = !requiredLocal || (serviceChecked && Boolean(street.trim() && city.trim() && postal.trim() && (stateCode || stateName) && serviceOk));
    return Boolean(line) && confirmed && travelSaved && shippingOk && serviceReady && (simType !== "esim" || deviceChecked);
  }

  if (loading) return <div className="mx-auto h-40 max-w-3xl animate-pulse rounded-3xl bg-surface" />;
  if (missing) {
    return (
      <div className="mx-auto max-w-xl rounded-3xl border border-line bg-surface px-6 py-12 text-center">
        <h1 className="text-2xl font-semibold text-ink">This plan is no longer available.</h1>
        <Link href="/buy-sims" className={`${primaryButton} mt-4`}>Back to Buy SIMs</Link>
      </div>
    );
  }
  if (error) {
    return (
      <div className="mx-auto max-w-xl rounded-3xl border border-line bg-surface px-6 py-12 text-center">
        <p className="text-sm text-danger">{error}</p>
        <Link href="/buy-sims" className={`${primaryButton} mt-4`}>Back to Buy SIMs</Link>
      </div>
    );
  }

  const currency = text(line?.currency || price?.currency || "USD");
  const shipping = addresses.find((item) => item.id === shippingId);
  const billing = addresses.find((item) => item.id === (simType === "psim" && sameAddress ? shippingId : billingId));
  const visibleStates = states.filter((item) => item.name.toLowerCase().includes(stateQuery.trim().toLowerCase()));

  return (
    <div className="mx-auto w-full max-w-3xl space-y-4">
      <Link href="/buy-sims" className="inline-flex items-center gap-2 text-sm font-semibold text-primary"><Icon name="arrow" className="h-4 w-4 rotate-180" /> Buy SIMs</Link>
      <article className="rounded-3xl border border-line bg-surface p-4">
        <div className="flex items-center gap-3">
          {text(line?.country_flag_url) ? <img src={text(line?.country_flag_url)} alt="" className="h-8 w-8 rounded-full object-cover" /> : null}
          <h1 className="truncate text-xl font-semibold text-ink" title={text(line?.display_name)}>{text(line?.display_name) || "Local plan"}</h1>
        </div>
        <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-ink">
          <li>{line?.is_unlimited_data ? "Unlimited" : text(line?.data) || "—"}</li>
          <li>{line?.is_unlimited_text ? "Unlimited" : text(line?.text) || "—"}</li>
          <li>{line?.is_unlimited_minutes ? "Unlimited" : text(line?.talk) || "—"}</li>
          <li>{text(line?.period_days)} Days</li>
        </ul>
        <label className="mt-4 block text-sm text-muted">SIM type
          <select value={simType} onChange={(event) => void changeSim(event.target.value)} className={`${fieldClass} mt-1 max-w-xs`}>
            <option value="esim">eSIM</option>
            <option value="psim">pSIM</option>
          </select>
        </label>
        {simType === "esim" ? (
          <div className="mt-4 rounded-2xl border border-line p-3 text-sm">
            <label className="flex items-start gap-2">
              <input type="checkbox" checked={deviceChecked} onChange={(event) => setDeviceChecked(event.target.checked)} className="mt-1" />
              <span>Before purchasing, ensure your customer&apos;s device supports eSIM and is unlocked. Ask them to dial *#06# and check for an EID.</span>
            </label>
            <button type="button" onClick={() => setDevicesOpen((value) => !value)} className="mt-2 font-semibold text-primary">Check Compatible Device List</button>
            {devicesOpen ? (
              <div className="mt-3 space-y-2">
                <div className="flex gap-2 overflow-x-auto">
                  {brands.map((brand) => {
                    const id = text(brand.brand_id);
                    return <button key={id} type="button" onClick={() => { setBrandId(id); setDeviceQuery(""); }} className={id === brandId ? primaryButton : ghostButton}>{text(brand.brand_name || brand.name)}</button>;
                  })}
                </div>
                <input value={deviceQuery} onChange={(event) => setDeviceQuery(event.target.value)} placeholder="Search Devices.." className={fieldClass} />
                <ul className="grid max-h-40 grid-cols-2 gap-1 overflow-y-auto text-sm text-ink">
                  {devices.map((device) => <li key={device}>{device}</li>)}
                </ul>
              </div>
            ) : null}
          </div>
        ) : null}
      </article>

      <ol className="flex gap-2 overflow-x-auto">
        {steps.map((item, index) => {
          const done = index < stepIndex;
          return (
            <li key={item.id}>
              <button type="button" disabled={index > stepIndex} onClick={() => { if (index <= stepIndex) setStep(item.id); }} className="flex items-center gap-2 text-sm font-semibold disabled:opacity-40">
                <span className={`grid h-7 w-7 place-items-center rounded-full ${done || index === stepIndex ? "bg-primary text-on-primary" : "border border-line text-muted"}`}>{done ? <Icon name="check" className="h-4 w-4" /> : index + 1}</span>
                <span className="hidden sm:inline">{item.label}</span>
                <span className="sm:hidden">{item.short}</span>
              </button>
            </li>
          );
        })}
      </ol>

      {step === "customer" ? (
        <section className="rounded-3xl border border-line bg-surface p-4">
          {!customer ? (
            <div className="py-6 text-center">
              <h2 className="text-lg font-semibold text-ink">No Customer Assigned</h2>
              <p className="mt-2 text-sm text-muted">Please select an existing customer or create a new customer to proceed with the order.</p>
              <button type="button" onClick={() => setAssignOpen(true)} className={`${primaryButton} mt-4`}>Assign / Create Customer</button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold text-ink">Customer Details</h2>
                <button type="button" onClick={() => setAssignOpen(true)} className={ghostButton}>Change Customer</button>
              </div>
              {formError ? <p className="text-sm text-danger">{formError}</p> : null}
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="text-sm text-muted">First name<input value={firstName} onChange={(event) => setFirstName(event.target.value)} className={`${fieldClass} mt-1`} /></label>
                <label className="text-sm text-muted">Last name<input value={lastName} onChange={(event) => setLastName(event.target.value)} className={`${fieldClass} mt-1`} /></label>
                <label className="text-sm text-muted sm:col-span-2">Email<input value={email} readOnly className={`${fieldClass} mt-1`} /></label>
              </div>
              <CountrySearchSelect
                id="mvno-nationality"
                label="Nationality"
                required
                value={country}
                countries={countries}
                loadingCountries={countries.length === 0}
                onChange={(iso2) => setCountry(iso2.toLowerCase())}
              />
              <PhoneField
                id="mvno-phone"
                label="Phone"
                required
                value={phone}
                countryIso2={country}
                preferred={phoneCountries}
                onChange={(next) => {
                  setPhone(next.international);
                  setDialCode(next.dialCode);
                  setCountry(next.iso2);
                }}
              />
              <button type="button" onClick={() => void confirmCustomer()} className={primaryButton}>Confirm Info</button>
            </div>
          )}
        </section>
      ) : null}

      {step === "address" ? (
        <section className="rounded-3xl border border-line bg-surface p-4 text-sm">
          {simType === "psim" ? (
            <>
              <AddressChoice label="Shipping address" selected={shipping} onOpen={() => { if (!customer) { toast.error("Please assign the customer before selecting an address."); return; } setAddressTarget("shipping"); }} />
              <label className="mt-3 flex items-center gap-2">
                <input type="checkbox" checked={sameAddress} onChange={(event) => setSameAddress(event.target.checked)} />
                Billing address and shipping address are same
              </label>
              {sameAddress ? null : <AddressChoice label="Billing address" selected={addresses.find((item) => item.id === billingId)} onOpen={() => setAddressTarget("billing")} />}
            </>
          ) : <AddressChoice label="Billing address" selected={billing} onOpen={() => { if (!customer) { toast.error("Please assign the customer before selecting an address."); return; } setAddressTarget("billing"); }} />}
          <button type="button" disabled={simType === "psim" ? !addressReady(shipping) || (!sameAddress && !addressReady(addresses.find((item) => item.id === billingId))) : !addressReady(billing)} onClick={() => setStep(requiredLocal ? "service" : "date")} className={`${primaryButton} mt-4`}>Next</button>
        </section>
      ) : null}

      {step === "service" ? (
        <section className="space-y-3 rounded-3xl border border-line bg-surface p-4 text-sm">
          <p>Please choose which state you are going to reside in {text(countryData?.country_name)}</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="relative">
              <span className="text-muted">State</span>
              <button type="button" onClick={() => { setStateQuery(""); setStateOpen((open) => !open); }} className={`${fieldClass} mt-1 flex items-center justify-between text-left`}>
                <span className={stateName ? "text-ink" : "text-muted"}>{stateName || "Select state"}</span>
                <span aria-hidden="true">▾</span>
              </button>
              {stateOpen ? (
                <div className="absolute z-20 mt-1 w-full rounded-2xl border border-line bg-surface p-2 shadow-lg">
                  <input value={stateQuery} onChange={(event) => setStateQuery(event.target.value)} placeholder="Search State..." className={fieldClass} autoFocus />
                  <ul className="mt-2 max-h-48 overflow-y-auto">
                    {visibleStates.map((item) => (
                      <li key={item.code}>
                        <button type="button" onClick={() => void chooseState(item)} className={`block w-full rounded-xl px-2 py-1.5 text-left ${stateCode === item.code ? "bg-mint text-primary" : "text-ink hover:bg-page"}`}>{item.name}</button>
                      </li>
                    ))}
                    {visibleStates.length ? null : <li className="px-2 py-1.5 text-muted">{statesError || "No matching state found"}</li>}
                  </ul>
                </div>
              ) : null}
            </div>
            <label className="text-muted">ZIP code
              <input value={zip} onChange={(event) => { setZip(event.target.value); setServiceOk(false); setCoverageMessage(""); }} className={`${fieldClass} mt-1`} list="mvno-zips" autoComplete="off" />
              <datalist id="mvno-zips">{zipOptions.map((item) => <option key={item} value={item} />)}</datalist>
            </label>
          </div>
          <p className="text-muted">Please provide zipcode to check the service availability.</p>
          {coverageMessage ? <p className={serviceOk ? "text-primary" : "text-danger"}>{coverageMessage}</p> : null}
          <label className="block text-muted">Address<input value={street} onChange={(event) => setStreet(event.target.value)} className={`${fieldClass} mt-1`} /></label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-muted">City<input value={city} onChange={(event) => setCity(event.target.value)} className={`${fieldClass} mt-1`} /></label>
            <label className="text-muted">Postal code<input value={postal} onChange={(event) => setPostal(event.target.value)} className={`${fieldClass} mt-1`} /></label>
          </div>
          <button type="button" disabled={!serviceOk || !street.trim() || !city.trim() || !postal.trim() || !stateCode} onClick={() => void checkService()} className={primaryButton}>Next</button>
        </section>
      ) : null}

      {step === "date" ? (
        <section className="rounded-3xl border border-line bg-surface p-4 text-sm">
          <h2 className="font-semibold text-ink">Travel Date</h2>
          <p className="mt-2 text-muted">Your local SIM will be activated based on your selected travel date. If your travel date is today, your SIM will be activated within 1–2 hours. If your travel date is in the future, your SIM will be activated 24 hours before your selected travel date. Once the activation is complete, a confirmation email will be sent to your registered email address.</p>
          <input type="date" min={localToday()} value={travelDate} onChange={(event) => { setTravelDate(event.target.value); setTravelSaved(false); }} className={`${fieldClass} mt-3 max-w-xs`} />
          <button type="button" disabled={!travelDate || savingDate} onClick={() => void saveDate()} className={`${primaryButton} mt-3`}>{savingDate ? "Saving…" : "Save travel date"}</button>
        </section>
      ) : null}

      <section className="rounded-3xl border border-line bg-surface p-4 text-sm">
        <PriceRow label="Plan Price" amount={num(price?.customer_total_net_amount)} currency={currency} />
        <PriceRow label="SIM Cost" amount={num(price?.sim_cost)} currency={currency} />
        <PriceRow label="Shipping Cost" amount={num(price?.shipment_cost)} currency={currency} />
        <PriceRow label="Processing Fee" amount={num(price?.customer_processing_fee)} currency={currency} />
        <PriceRow label="Taxes" amount={num(price?.customer_tax_amount)} currency={currency} />
        <p className="flex justify-between py-1 tabular-nums">
          <span>Other Tax <button type="button" onClick={() => setChargesOpen(true)} className="font-semibold text-primary">Info</button></span>
          <span>{moneyAmount(num(price?.customer_other_charges), currency)}</span>
        </p>
        <p className="flex justify-between py-1 font-semibold text-primary tabular-nums"><span>Customer will pay</span><span>{moneyAmount(num(price?.customer_total_amount), currency)}</span></p>
      </section>

      <label className="block text-sm text-muted">Comment
        <textarea maxLength={100} value={comment} onChange={(event) => setComment(event.target.value.slice(0, 100))} className={`${fieldClass} mt-1 h-24 py-2`} />
        <span className="text-xs">{comment.length}/100</span>
      </label>
      {paying ? <p className="text-sm text-muted">Processing… this may take up to 30 seconds.</p> : null}
      <div className="flex flex-col gap-2 sm:flex-row">
        <button type="button" disabled={Boolean(paying) || !canPay()} onClick={() => void pay("payment_gateway")} className={`${ghostButton} flex-1`}>Generate Payment Link</button>
        <button type="button" disabled={Boolean(paying) || !canPay()} onClick={() => void pay("wallet")} className={`${primaryButton} flex-1`}>{paying === "wallet" ? "Processing…" : "Pay via Wallet"}</button>
      </div>

      <AssignCustomerDialog open={assignOpen} bindCheckout={false} onClose={() => setAssignOpen(false)} onAssigned={(next) => { assign(next); ensureCountries(setCountries); }} />
      <Dialog open={Boolean(addressTarget)} onOpenChange={(open) => { if (!open) setAddressTarget(null); }}>
        {addressTarget && customer ? (
          <AddressBook
            customerId={customer.id}
            customer={customer}
            addresses={addresses}
            selectedId={addressTarget === "shipping" ? shippingId : billingId}
            onReload={() => loadAddresses(customer.id)}
            onUse={(address) => {
              if (addressTarget === "shipping") setShippingId(address.id);
              else setBillingId(address.id);
              setAddressTarget(null);
            }}
          />
        ) : null}
      </Dialog>
      <Dialog open={chargesOpen} onOpenChange={setChargesOpen}>
        <DialogHeader><DialogTitle>Other charges</DialogTitle></DialogHeader>
        <ul className="space-y-1 text-sm text-ink">
          {charges.length ? charges.map((item, index) => <li key={`${text(item.name)}-${index}`}>{text(item.name)}: {text(item.amount)}</li>) : <li>No other charges.</li>}
        </ul>
      </Dialog>
    </div>
  );
}

function AddressChoice({ label, selected, onOpen }: { label: string; selected?: Address; onOpen: () => void }) {
  return (
    <div className="mt-3">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-ink">{label}</h2>
        <button type="button" onClick={onOpen} className={ghostButton}>{selected ? "Change" : "Select or add"}</button>
      </div>
      {selected ? <p className="mt-2 text-muted">{[selected.street, selected.city, selected.state, selected.postal, selected.phone].filter(Boolean).join(", ")}</p> : <p className="mt-2 text-muted">No address selected.</p>}
    </div>
  );
}

function AddressBook({ customerId, customer, addresses, selectedId, onReload, onUse }: { customerId: string; customer: CustomerRecord; addresses: Address[]; selectedId: string; onReload: () => Promise<void>; onUse: (address: Address) => void }) {
  const [mode, setMode] = useState<"list" | "form">("list");
  const [picked, setPicked] = useState(selectedId || addresses[0]?.id || "");
  const [editing, setEditing] = useState("");
  const [form, setForm] = useState(blankAddressForm(customer));
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [countryOptions, setCountryOptions] = useState<CustomerCountryOption[]>([]);
  const [loadingCountries, setLoadingCountries] = useState(true);

  useEffect(() => {
    fetch("/api/customers/countries")
      .then((response) => response.ok ? response.json() : [])
      .then((data) => { if (Array.isArray(data)) setCountryOptions(data as CustomerCountryOption[]); })
      .catch(() => undefined)
      .finally(() => setLoadingCountries(false));
  }, []);

  useEffect(() => {
    if (!countryOptions.length || !form.country) return;
    const match = countryOptions.find((item) => item.iso2.toLowerCase() === form.country.toLowerCase() || item.name.toLowerCase() === form.country.toLowerCase());
    if (!match || match.iso2 === form.country) return;
    const timer = window.setTimeout(() => setForm((current) => ({ ...current, country: match.iso2 })), 0);
    return () => window.clearTimeout(timer);
  }, [countryOptions, form.country]);

  async function save() {
    if (!form.first_name || !form.last_name || !form.street_address_1 || !form.city || !form.state || !form.country || !form.postal_code || !form.phone) {
      setError("Street, city, state, postal code, and phone are required.");
      return;
    }
    setSaving(true);
    try {
      await portalRequest("/api/buy-sims", {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resource: "address", customer_id: customerId, address_id: editing, ...form }),
      });
      await onReload();
      setMode("list");
    } catch (err) {
      setError(requestErrorMessage(err, "Could not save the address."));
    } finally {
      setSaving(false);
    }
  }

  async function remove(address: Address) {
    await portalRequest(`/api/buy-sims?address_id=${encodeURIComponent(address.id)}`, { method: "DELETE" });
    await onReload();
  }

  return (
    <div>
      <DialogHeader><DialogTitle>{mode === "form" ? (editing ? "Update Address" : "Add Address") : "Select Address"}</DialogTitle></DialogHeader>
      {error ? <p className="mb-2 text-sm text-danger">{error}</p> : null}
      {mode === "list" ? (
        <div className="space-y-2">
          {addresses.map((address) => (
            <div key={address.id} className={`flex items-start justify-between gap-3 rounded-2xl border p-3 ${picked === address.id ? "border-primary bg-mint" : "border-line"}`}>
              <button type="button" onClick={() => setPicked(address.id)} className="min-w-0 flex-1 text-left">
                <span className="block font-semibold text-ink">{[address.firstName, address.lastName].filter(Boolean).join(" ") || "Address"}</span>
                <span className="mt-1 block text-sm text-muted">{[address.street, address.city, address.state, address.postal].filter(Boolean).join(", ")}</span>
                {address.phone ? <span className="mt-0.5 block text-sm text-muted">{address.phone}</span> : null}
              </button>
              <span className="flex shrink-0 gap-3 pt-0.5">
                <button type="button" className="text-sm font-semibold text-primary" onClick={() => { setEditing(address.id); setForm(addressForm(address, customer)); setMode("form"); }}>Edit</button>
                <button type="button" className="text-sm font-semibold text-danger" onClick={() => void remove(address)}>Delete</button>
              </span>
            </div>
          ))}
          {!addresses.length ? <p className="py-8 text-center text-sm text-muted">No Addresses Found</p> : null}
          <div className="flex justify-center gap-2 pt-2">
            <button type="button" onClick={() => { setEditing(""); setForm(blankAddressForm(customer)); setMode("form"); }} className={ghostButton}>Add new address</button>
            <button type="button" disabled={!addresses.some((item) => item.id === picked)} onClick={() => { const address = addresses.find((item) => item.id === picked); if (address) onUse(address); }} className={primaryButton}>Proceed</button>
          </div>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          <TextField id="mvno-address-first" label="First Name" required value={form.first_name} onChange={(value) => setForm({ ...form, first_name: value })} />
          <TextField id="mvno-address-last" label="Last Name" required value={form.last_name} onChange={(value) => setForm({ ...form, last_name: value })} />
          <div className="sm:col-span-2">
            <TextField id="mvno-address-street" label="Street Address" required value={form.street_address_1} onChange={(value) => setForm({ ...form, street_address_1: value })} />
          </div>
          <TextField id="mvno-address-city" label="City" required value={form.city} onChange={(value) => setForm({ ...form, city: value })} />
          <TextField id="mvno-address-state" label="State" required value={form.state} onChange={(value) => setForm({ ...form, state: value })} />
          <TextField id="mvno-address-postal" label="Postal Code" required value={form.postal_code} onChange={(value) => setForm({ ...form, postal_code: value })} />
          <CountrySearchSelect
            id="mvno-address-country"
            label="Country"
            required
            value={form.country}
            countries={countryOptions}
            loadingCountries={loadingCountries}
            onChange={(iso2) => setForm({ ...form, country: iso2 })}
          />
          <PhoneField
            id="mvno-address-phone"
            label="Phone"
            required
            value={form.phone}
            countryIso2={form.country}
            preferred={phoneCountries}
            onChange={(next) => setForm({ ...form, phone: next.international || next.national })}
          />
          <button type="button" disabled={saving} onClick={() => void save()} className={`${primaryButton} sm:col-span-2`}>{saving ? "Saving…" : "Save address"}</button>
        </div>
      )}
    </div>
  );
}

function PriceRow({ label, amount, currency }: { label: string; amount: number; currency: string }) {
  return <p className="flex justify-between py-1 tabular-nums"><span>{label}</span><span>{moneyAmount(amount, currency)}</span></p>;
}

function applyPayload(
  payload: JsonRecord,
  setLines: (lines: JsonRecord[]) => void,
  setPrice: (price: JsonRecord | null) => void,
  setCharges: (charges: JsonRecord[]) => void,
  setSimType: (value: string) => void,
) {
  const data = asRecord(payload.data) ?? payload;
  const nextLines = asList(data.cart_lines);
  if (nextLines.length) {
    setLines(nextLines);
    const sim = text(nextLines[0]?.sim_type).toLowerCase();
    if (sim === "esim" || sim === "psim") setSimType(sim);
  }
  const nextPrice = asRecord(data.customer_price);
  if (nextPrice) setPrice(nextPrice);
  if (Array.isArray(data.other_charges)) setCharges(asList(data.other_charges));
}

function blankAddressForm(customer?: CustomerRecord | null) {
  return {
    first_name: customer?.firstName || "",
    last_name: customer?.lastName || "",
    street_address_1: "",
    city: "",
    state: "",
    country: customer?.countryCode || "",
    postal_code: "",
    phone: customer?.phone || customer?.phoneNational || "",
  };
}

function addressForm(address: Address, customer?: CustomerRecord | null) {
  return {
    first_name: address.firstName || customer?.firstName || "",
    last_name: address.lastName || customer?.lastName || "",
    street_address_1: address.street,
    city: address.city,
    state: address.state,
    country: address.country || customer?.countryCode || "",
    postal_code: address.postal,
    phone: address.phone || customer?.phone || customer?.phoneNational || "",
  };
}

function mapAddress(item: JsonRecord): Address {
  const street = text(item.street_address_1 || item.address);
  const city = text(item.city);
  const state = text(item.state);
  const postal = text(item.postal_code || item.pincode);
  const phone = addressPhone(item);
  const firstName = text(item.first_name);
  const lastName = text(item.last_name);
  return {
    id: text(item.id || item.address_id),
    firstName,
    lastName,
    street,
    city,
    state,
    country: text(item.country || item.country_iso2),
    postal,
    phone,
    label: [firstName, lastName, street, city, state, postal, phone].filter(Boolean).join(", "),
  };
}

function addressPhone(item: JsonRecord) {
  const details = asRecord(item.phone_details);
  const full = text(details?.full_number);
  if (full.startsWith("+") && !/none/i.test(full)) return full;
  const national = text(details?.phone || item.phone).replace(/[^\d]/g, "");
  const dial = text(details?.country_code || item.country_code).replace(/^\+/, "").replace(/[^\d]/g, "");
  if (national && dial && !/none/i.test(national)) return `+${dial}${national}`;
  const raw = text(item.phone || item.phone_number);
  return !raw || /none/i.test(raw) ? "" : raw;
}

function addressReady(address?: Address) {
  return Boolean(address && address.street && address.city && address.state && address.postal && address.phone);
}

function stateRows(payload: JsonRecord) {
  const data = asRecord(payload.data);
  const source = Array.isArray(payload.states) ? payload.states : Array.isArray(data?.states) ? data.states : asList(payload.data ?? payload);
  return source.map((item) => ({ name: text(asRecord(item)?.state_name || asRecord(item)?.name), code: text(asRecord(item)?.state_code || asRecord(item)?.code) })).filter((item) => item.name && item.code);
}

function zipValues(payload: JsonRecord) {
  const data = asRecord(payload.data);
  const source = Array.isArray(payload.zip_codes) ? payload.zip_codes : Array.isArray(data?.zip_codes) ? data.zip_codes : Array.isArray(payload.data) ? payload.data : asList(payload.data ?? payload);
  return source.map((item) => typeof item === "string" ? item : text(asRecord(item)?.zip_code || asRecord(item)?.zipcode || asRecord(item)?.postal_code || asRecord(item)?.zip || asRecord(item)?.name)).filter(Boolean);
}

function localToday() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

function ensureCountries(setCountries: (countries: CustomerCountryOption[]) => void) {
  fetch("/api/customers/countries")
    .then((response) => response.ok ? response.json() : [])
    .then((data) => { if (Array.isArray(data)) setCountries(data as CustomerCountryOption[]); })
    .catch(() => undefined);
}
