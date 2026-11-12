"use client";

import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { TextField } from "@/components/ui/form-field";
import { Icon } from "@/components/ui/icon";
import { PageLoader } from "@/components/ui/wave-loader";
import { asRecord, PortalRequestError, portalRequest, text, type JsonRecord } from "@/lib/portal-fetch";

type BankDetails = {
  panNumber: string;
  accountNumber: string;
  ifscCode: string;
  swiftCode: string;
  branch: string;
};

type ProfileDocument = {
  key: string;
  label: string;
};

type ProfileModel = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  mobileNumber: string;
  resellerId: string;
  companyName: string;
  taxNumber: string;
  website: string;
  cin: string;
  companyCountry: string;
  bank: BankDetails | null;
  documents: ProfileDocument[];
};

const emptyProfile: ProfileModel = {
  id: "",
  firstName: "",
  lastName: "",
  email: "",
  mobileNumber: "",
  resellerId: "",
  companyName: "",
  taxNumber: "",
  website: "",
  cin: "",
  companyCountry: "",
  bank: null,
  documents: [],
};

const documentLabels: Record<string, string> = {
  CIN_DOCUMENT: "CIN Document",
  GST_CERTIFICATION: "GST Certification",
  NDA: "NDA",
  MSA: "MSA",
  REGISTRATION_CERTIFICATE: "Registration Certificate",
  TAX_ID: "Tax ID",
};

const documentOrder = Object.keys(documentLabels);

function documentLabel(key: string) {
  return documentLabels[key] || key.toLowerCase().replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function mapDocuments(value: unknown): ProfileDocument[] {
  const record = asRecord(value);
  if (!record) return [];
  const keys = [
    ...documentOrder.filter((key) => typeof record[key] === "string" && record[key].trim()),
    ...Object.keys(record).filter(
      (key) => !documentOrder.includes(key) && typeof record[key] === "string" && record[key].trim(),
    ),
  ];
  return keys.map((key) => ({ key, label: documentLabel(key) }));
}

function titleCase(value: string) {
  return value.toLowerCase().replace(/(^|\s)\S/g, (letter) => letter.toUpperCase());
}

function mapProfile(data: JsonRecord): ProfileModel {
  const bankRecord = asRecord(data.bank_details);
  const showBank = Boolean(data.bank_details);
  return {
    id: text(data.id),
    firstName: text(data.first_name),
    lastName: text(data.last_name),
    email: text(data.email),
    mobileNumber: text(data.mobile_number),
    resellerId: text(data.reseller_id),
    companyName: text(data.company_name),
    taxNumber: text(data.tax_number),
    website: text(data.company_website),
    cin: text(data.cin),
    companyCountry: text(data.company_country),
    documents: mapDocuments(data.documents),
    bank: showBank
      ? {
          panNumber: text(bankRecord?.pan_number),
          accountNumber: text(bankRecord?.account_number),
          ifscCode: text(bankRecord?.ifsc_code),
          swiftCode: text(bankRecord?.swift_code),
          branch: text(bankRecord?.branch),
        }
      : null,
  };
}

function ReadonlyField({ id, label, value }: { id: string; label: string; value: string }) {
  return <TextField id={id} label={label} value={value} readOnly autoComplete="off" onChange={() => undefined} />;
}

function ProfileAvatar() {
  return (
    <span className="grid h-20 w-20 shrink-0 place-items-center rounded-full bg-primary text-on-primary" aria-hidden="true">
      <svg viewBox="0 0 48 48" className="h-10 w-10 fill-current">
        <circle cx="24" cy="16" r="8" />
        <path d="M8 42c2.2-10 7.6-14 16-14s13.8 4 16 14" />
      </svg>
    </span>
  );
}

function filenameFrom(response: Response, key: string) {
  const match = response.headers.get("Content-Disposition")?.match(/filename="([^"]+)"/);
  return match?.[1] || `${key.toLowerCase()}.pdf`;
}

async function downloadDocument(key: string) {
  const response = await fetch(`/api/profile/documents?key=${encodeURIComponent(key)}`, { cache: "no-store" });
  if (response.status === 401) {
    window.location.assign("/login");
    return;
  }
  if (!response.ok) throw new Error("Document is unavailable.");
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filenameFrom(response, key);
  link.click();
  URL.revokeObjectURL(url);
}

export function ProfileView() {
  const [profile, setProfile] = useState<ProfileModel>(emptyProfile);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    fetch("/assets/json/countries.json", { signal: controller.signal, cache: "no-store" }).catch(() => undefined);
    return () => controller.abort();
  }, []);

  useEffect(() => {
    let ignore = false;
    portalRequest<JsonRecord>("/api/profile")
      .then((res) => {
        if (ignore) return;
        const data = asRecord(asRecord(res)?.profile_data);
        setProfile(data ? mapProfile(data) : emptyProfile);
      })
      .catch((err) => {
        if (ignore || (err instanceof PortalRequestError && err.status === 401)) return;
        console.error(err);
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });
    return () => {
      ignore = true;
    };
  }, []);

  if (loading) return <PageLoader />;

  const title = [titleCase(profile.firstName), titleCase(profile.lastName)].filter(Boolean).join(" ");
  const india = profile.companyCountry === "India";

  return (
    <div className="mx-auto min-w-0 max-w-6xl space-y-5">
      <h1 className="text-2xl font-semibold tracking-tight text-ink sm:text-3xl">Profile</h1>

      <section className="rounded-3xl border border-line bg-surface p-5 shadow-[var(--shadow)] sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <ProfileAvatar />
          <div className="min-w-0">
            <h2 className="flex items-center gap-2 text-xl font-semibold text-ink">
              {title ? <span className="truncate">{title}</span> : null}
              <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-primary text-on-primary" title="Verified">
                <Icon name="check" className="h-3 w-3" />
              </span>
            </h2>
            <p className="mt-2 flex items-center gap-2 text-sm text-muted">
              <Icon name="chat" className="h-4 w-4 shrink-0 text-primary" />
              <span className="min-w-0 break-all">{profile.email}</span>
            </p>
            <p className="mt-2 text-sm text-ink">
              <span className="text-muted">Agent Code</span>{" "}
              <span className="font-semibold">{profile.id}</span>
            </p>
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-line bg-surface p-5 shadow-[var(--shadow)] sm:p-6">
        <h2 className="text-lg font-semibold text-ink">Agent Profile</h2>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <ReadonlyField id="first-name" label="First Name" value={profile.firstName} />
          <ReadonlyField id="last-name" label="Last Name" value={profile.lastName} />
          <ReadonlyField id="email" label="Email" value={profile.email} />
          <ReadonlyField id="mobile-number" label="Mobile number" value={profile.mobileNumber} />
          <ReadonlyField id="reseller-id" label="Reseller ID" value={profile.resellerId} />
          <ReadonlyField id="agent-company-name" label="Company Name" value={profile.companyName} />
        </div>
      </section>

      <section className="rounded-3xl border border-line bg-surface p-5 shadow-[var(--shadow)] sm:p-6">
        <h2 className="text-lg font-semibold text-ink">Company Details</h2>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <ReadonlyField id="company-name" label="Company Name" value={profile.companyName} />
          <ReadonlyField id="tax-number" label="Tax Number" value={profile.taxNumber} />
          <ReadonlyField id="website" label="Website" value={profile.website} />
          <ReadonlyField id="cin" label="Company Identification Number(CIN)" value={profile.cin} />
        </div>
      </section>

      {profile.documents.length ? (
        <section className="min-w-0 rounded-3xl border border-line bg-surface p-5 shadow-[var(--shadow)] sm:p-6">
          <h2 className="text-lg font-semibold text-ink">Documents</h2>
          <ul className="mt-5 grid min-w-0 grid-cols-1 gap-3">
            {profile.documents.map((document) => (
              <li key={document.key} className="flex min-w-0 items-center justify-between gap-3 rounded-2xl border border-line bg-page px-4 py-3">
                <span className="flex min-w-0 items-center gap-3">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-mint text-primary">
                    <Icon name="file-text" className="h-4 w-4" />
                  </span>
                  <span className="truncate text-sm font-semibold text-ink">{document.label}</span>
                </span>
                <button
                  type="button"
                  disabled={downloading === document.key}
                  onClick={() => {
                    setDownloading(document.key);
                    downloadDocument(document.key)
                      .catch(() => toast.error("Document is unavailable."))
                      .finally(() => setDownloading((current) => (current === document.key ? "" : current)));
                  }}
                  className="inline-flex h-10 shrink-0 items-center gap-2 rounded-full border border-line bg-surface px-4 text-sm font-semibold text-ink transition hover:border-primary hover:text-primary disabled:opacity-50"
                >
                  <Icon name="download" className="h-4 w-4" />
                  {downloading === document.key ? "Downloading..." : "Download"}
                </button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {profile.bank ? (
        <section className="rounded-3xl border border-line bg-surface p-5 shadow-[var(--shadow)] sm:p-6">
          <h2 className="text-lg font-semibold text-ink">Company Bank Details</h2>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            {profile.bank.panNumber.trim() ? (
              <ReadonlyField id="pan-number" label="Pan Number" value={profile.bank.panNumber} />
            ) : null}
            <ReadonlyField id="account-number" label="Account Number" value={profile.bank.accountNumber} />
            {india ? <ReadonlyField id="ifsc-code" label="IFSC Code" value={profile.bank.ifscCode} /> : null}
            {india ? null : <ReadonlyField id="swift-code" label="SWIFT Code" value={profile.bank.swiftCode} />}
            <ReadonlyField id="branch" label="Branch" value={profile.bank.branch} />
          </div>
        </section>
      ) : null}
    </div>
  );
}
