"use client";

import { useEffect, useLayoutEffect, useRef, useState, type FormEvent } from "react";
import { Modal } from "@/components/ui/modal";
import { Icon } from "@/components/ui/icon";
import { CheckField, FieldLabel, FieldMessage, SelectField, TextField } from "@/components/ui/form-field";
import { optionalPhoneError, phoneError, requiredText, websiteError } from "@/lib/field-rules";
import { PhoneField } from "@/components/ui/phone-field";

const msaAgreementUrl =
  "https://zetexa-dev-media-files.s3.ap-south-1.amazonaws.com/Zetexa/MSA/Zetexa_Master_Service_Agreement.pdf";

const imageExtensions = new Set([
  "png",
  "jpg",
  "jpeg",
  "gif",
  "webp",
  "bmp",
  "svg",
  "heic",
  "heif",
  "avif",
  "tif",
  "tiff",
  "ico",
  "jfif",
]);

type ChosenFile = { name: string; problem: string };

const blankFile: ChosenFile = { name: "", problem: "" };

function fileProblem(file: File) {
  const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
  const excel =
    ["xls", "xlsx", "xlsm", "xlsb", "xlt", "xltx", "xltm"].includes(extension) ||
    /excel|spreadsheetml/.test(file.type);
  if (excel) return "Excel files are not accepted. Use a PDF or an image.";
  const pdf = extension === "pdf" || file.type === "application/pdf";
  const image = file.type.startsWith("image/") || imageExtensions.has(extension);
  if (!pdf && !image) return "Use a PDF or an image. Excel files are not accepted.";
  return "";
}

const steps = ["Company", "Address", "Bank Info", "Documents"] as const;

type EkycDialogProps = {
  open: boolean;
  onClose: () => void;
};

export function EkycDialog({ open, onClose }: EkycDialogProps) {
  const [step, setStep] = useState(0);
  const [company, setCompany] = useState("");
  const [country, setCountry] = useState("");
  const [website, setWebsite] = useState("");
  const [phone, setPhone] = useState("");
  const [phoneDial, setPhoneDial] = useState("");
  const [alternate, setAlternate] = useState("");
  const [alternateDial, setAlternateDial] = useState("");
  const [taxId, setTaxId] = useState("");
  const [pan, setPan] = useState("");
  const [cin, setCin] = useState("");
  const [street, setStreet] = useState("");
  const [locality, setLocality] = useState("");
  const [stateName, setStateName] = useState("");
  const [city, setCity] = useState("");
  const [postal, setPostal] = useState("");
  const [accountName, setAccountName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [accountType, setAccountType] = useState("");
  const [bankName, setBankName] = useState("");
  const [bankCode, setBankCode] = useState("");
  const [branch, setBranch] = useState("");
  const [cinFile, setCinFile] = useState<ChosenFile>(blankFile);
  const [panFile, setPanFile] = useState<ChosenFile>(blankFile);
  const [gstFile, setGstFile] = useState<ChosenFile>(blankFile);
  const [signedMsa, setSignedMsa] = useState<ChosenFile>(blankFile);
  const [msaAccepted, setMsaAccepted] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [countries, setCountries] = useState<string[]>([]);
  const [height, setHeight] = useState<number | null>(null);
  const slidesRef = useRef<Array<HTMLElement | null>>([]);

  useEffect(() => {
    if (!open || countries.length) return;
    const controller = new AbortController();
    fetch("/api/countries", { signal: controller.signal })
      .then((response) => (response.ok ? response.json() : []))
      .then((data: unknown) => {
        if (!Array.isArray(data)) return;
        const names = data
          .map((item) =>
            item && typeof item === "object" && "name" in item ? String(item.name) : "",
          )
          .filter(Boolean);
        setCountries(names);
      })
      .catch(() => undefined);
    return () => controller.abort();
  }, [open, countries.length]);

  useLayoutEffect(() => {
    const node = slidesRef.current[step];
    if (!node) return;
    const measure = () => setHeight(node.offsetHeight);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, [step, open]);

  function close() {
    setStep(0);
    setErrors({});
    onClose();
  }

  function companyIssues() {
    return {
      company: requiredText(company, "Enter your company name."),
      country: requiredText(country, "Select the country where your business is based."),
      website: websiteError(website),
      phone: phoneError(phone, phoneDial),
      alternate: optionalPhoneError(alternate, alternateDial),
    };
  }

  function addressIssues() {
    return {
      street: requiredText(street, "Enter the street."),
      stateName: requiredText(stateName, "Enter the state."),
      city: requiredText(city, "Enter the city."),
      postal: requiredText(postal, "Enter the postal code."),
    };
  }

  function bankIssues() {
    return {};
  }

  function pick(setter: (file: ChosenFile) => void, key: string) {
    return (file: ChosenFile) => {
      setter(file);
      setErrors((current) => ({ ...current, [key]: file.problem }));
    };
  }

  function documentIssues() {
    return {
      cinFile: cinFile.problem || requiredText(cinFile.name, "CIN document is required."),
      panFile: panFile.problem || requiredText(panFile.name, "Pan card is required."),
      gstFile: gstFile.problem || requiredText(gstFile.name, "GST certification is required."),
      msa: msaAccepted ? "" : "You must accept the MSA Agreement.",
      signedMsa:
        signedMsa.problem ||
        requiredText(signedMsa.name, "Signed MSA Agreement PDF is required."),
    };
  }

  function saveStep(event: FormEvent<HTMLFormElement>, index: number) {
    event.preventDefault();
    const issues = [companyIssues, addressIssues, bankIssues, documentIssues][index]();
    setErrors(issues);
    if (Object.values(issues).some(Boolean)) return;
    if (index < steps.length - 1) setStep(index + 1);
  }

  return (
    <Modal
      open={open}
      title="EKYC Verification"
      onClose={close}
      footer={
        <div className="flex w-full items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => setStep((current) => Math.max(0, current - 1))}
            className={`cursor-pointer text-sm font-semibold text-muted hover:text-ink ${
              step === 0 ? "invisible" : ""
            }`}
          >
            Back
          </button>
          <button
            type="submit"
            form={`ekyc-step-${step}`}
            className="cursor-pointer rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-on-primary hover:bg-primary-hover"
          >
            Save
          </button>
        </div>
      }
    >
      <p className="rounded-2xl bg-mint px-4 py-3 text-center text-sm font-medium text-primary">
        Please finish your eKYC to start selling Zetexa services.
      </p>
      <ol className="relative mt-6 grid grid-cols-4">
        <span className="absolute top-4 right-[12.5%] left-[12.5%] h-px bg-line" aria-hidden="true">
          <span
            className="block h-full bg-primary transition-[width] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none"
            style={{ width: `${(step / (steps.length - 1)) * 100}%` }}
          />
        </span>
        {steps.map((label, index) => {
          const current = index === step;
          const done = index < step;
          return (
            <li key={label} className="relative">
              <button
                type="button"
                onClick={() => setStep(index)}
                aria-current={current ? "step" : undefined}
                className="flex w-full cursor-pointer flex-col items-center gap-2 text-xs font-medium"
              >
                <span
                  className={`grid h-8 w-8 place-items-center rounded-full transition-colors duration-300 ${
                    current
                      ? "bg-primary text-on-primary"
                      : done
                        ? "bg-mint text-primary"
                        : "border border-line bg-white text-muted"
                  }`}
                >
                  {index + 1}
                </span>
                <span className={current ? "text-primary" : "text-muted"}>{label}</span>
              </button>
            </li>
          );
        })}
      </ol>

      <div
        className="step-viewport mt-6"
        style={{ height: height ?? "auto", overflowX: "clip", overflowY: "visible" }}
      >
        <div className="step-track" style={{ transform: `translateX(-${step * 100}%)` }}>
          <section
            ref={(node) => {
              slidesRef.current[0] = node;
            }}
            className="w-full shrink-0 basis-full px-0.5"
            aria-hidden={step !== 0}
            inert={step !== 0}
          >
            <form
              id="ekyc-step-0"
              className="grid gap-4 sm:grid-cols-2"
              onSubmit={(event) => saveStep(event, 0)}
            >
              <TextField id="ekyc-company" label="Company Name" required value={company} onChange={setCompany} error={errors.company} placeholder="Enter company name" />
              <SelectField id="ekyc-country" label="Company Country" required value={country} onChange={setCountry} error={errors.country}>
                <option value="">Select a country</option>
                {countries.map((name) => (
                  <option key={name} value={name}>{name}</option>
                ))}
              </SelectField>
              <TextField id="ekyc-website" label="Company Website" value={website} onChange={setWebsite} error={errors.website} placeholder="www.example.com" />
              <PhoneField
                id="ekyc-phone"
                label="Phone number"
                required
                value={phone}
                error={errors.phone}
                onChange={(next) => {
                  setPhone(next.international);
                  setPhoneDial(next.dialCode);
                }}
              />
              <PhoneField
                id="ekyc-alternate"
                label="Alternate Phone number"
                value={alternate}
                error={errors.alternate}
                onChange={(next) => {
                  setAlternate(next.international);
                  setAlternateDial(next.dialCode);
                }}
              />
              <TextField id="ekyc-tax" label="Company Tax ID" value={taxId} onChange={setTaxId} placeholder="Enter Company Tax ID" />
              <TextField id="ekyc-pan" label="PAN Number" value={pan} onChange={setPan} placeholder="Enter PAN Number" />
              <TextField id="ekyc-cin" label="Company Identification Number (CIN)" value={cin} onChange={setCin} placeholder="Enter CIN Number" />
            </form>
          </section>

          <section
            ref={(node) => {
              slidesRef.current[1] = node;
            }}
            className="w-full shrink-0 basis-full px-0.5"
            aria-hidden={step !== 1}
            inert={step !== 1}
          >
            <form
              id="ekyc-step-1"
              className="grid gap-4 sm:grid-cols-2"
              onSubmit={(event) => saveStep(event, 1)}
            >
              <TextField id="ekyc-street" label="Street" required value={street} onChange={setStreet} error={errors.street} placeholder="Enter Street" />
              <TextField id="ekyc-locality" label="Locality" value={locality} onChange={setLocality} placeholder="Enter Locality" />
              <TextField id="ekyc-state" label="State" required value={stateName} onChange={setStateName} error={errors.stateName} placeholder="Enter State" />
              <TextField id="ekyc-city" label="City" required value={city} onChange={setCity} error={errors.city} placeholder="Enter city" />
              <TextField id="ekyc-postal" label="Postal code" required value={postal} onChange={setPostal} error={errors.postal} placeholder="Enter Postal code" />
            </form>
          </section>

          <section
            ref={(node) => {
              slidesRef.current[2] = node;
            }}
            className="w-full shrink-0 basis-full px-0.5"
            aria-hidden={step !== 2}
            inert={step !== 2}
          >
            <form
              id="ekyc-step-2"
              className="grid gap-4 sm:grid-cols-2"
              onSubmit={(event) => saveStep(event, 2)}
            >
              <TextField id="ekyc-account-name" label="Account Name" value={accountName} onChange={setAccountName} placeholder="Enter Account Name" />
              <TextField id="ekyc-account-number" label="Account Number" value={accountNumber} onChange={setAccountNumber} placeholder="Enter Account Number" />
              <SelectField id="ekyc-account-type" label="Account Type" value={accountType} onChange={setAccountType}>
                <option value="">Choose your Account type</option>
                <option value="Current">Current</option>
                <option value="Savings">Savings</option>
                <option value="Checking">Checking</option>
              </SelectField>
              <TextField id="ekyc-bank-name" label="Bank Name" value={bankName} onChange={setBankName} placeholder="Enter Bank Name" />
              <TextField id="ekyc-ifsc" label="IFSC/SWIFT/IBAN Code" value={bankCode} onChange={setBankCode} placeholder="Enter IFSC Code" />
              <TextField id="ekyc-branch" label="Branch" value={branch} onChange={setBranch} placeholder="Enter Branch" />
            </form>
          </section>

          <section
            ref={(node) => {
              slidesRef.current[3] = node;
            }}
            className="w-full shrink-0 basis-full px-0.5"
            aria-hidden={step !== 3}
            inert={step !== 3}
          >
            <form
              id="ekyc-step-3"
              className="grid gap-4 sm:grid-cols-2"
              onSubmit={(event) => saveStep(event, 3)}
            >
              <FileField
                id="ekyc-cin-file"
                label="CIN Document"
                required
                fileName={cinFile.name}
                error={errors.cinFile}
                onPick={pick(setCinFile, "cinFile")}
              />
              <FileField
                id="ekyc-pan-file"
                label="Pan Card"
                required
                fileName={panFile.name}
                error={errors.panFile}
                onPick={pick(setPanFile, "panFile")}
              />
              <FileField
                id="ekyc-gst-file"
                label="GST Certification"
                required
                fileName={gstFile.name}
                error={errors.gstFile}
                onPick={pick(setGstFile, "gstFile")}
              />
              <div className="rounded-2xl border border-line p-4 sm:col-span-2">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="flex items-center gap-2 text-base font-semibold text-ink">
                    <Icon name="orders" className="h-5 w-5 text-primary" />
                    MSA Agreement
                  </p>
                  <a
                    href={msaAgreementUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex cursor-pointer rounded-full border border-line px-4 py-2 text-sm font-semibold text-ink hover:border-primary hover:text-primary"
                  >
                    View MSA Agreement
                  </a>
                </div>
                <div className="mt-4 border-t border-line pt-4">
                  <CheckField
                    id="msa-accepted"
                    checked={msaAccepted}
                    onChange={setMsaAccepted}
                    error={errors.msa}
                    label="I agree with MSA Agreement Terms and Conditions and Privacy Policy"
                  />
                </div>
                <div className="mt-4">
                  <FileField
                    id="ekyc-signed-msa"
                    label="Upload Signed MSA Agreement PDF"
                    action="Upload Signed PDF"
                    fileName={signedMsa.name}
                    error={errors.signedMsa}
                    onPick={pick(setSignedMsa, "signedMsa")}
                  />
                </div>
              </div>
            </form>
          </section>
        </div>
      </div>
    </Modal>
  );
}

function FileField({
  id,
  label,
  required,
  fileName,
  error = "",
  action = "Choose File",
  onPick,
}: {
  id: string;
  label: string;
  required?: boolean;
  fileName: string;
  error?: string;
  action?: string;
  onPick: (file: ChosenFile) => void;
}) {
  const errorId = error ? `${id}-error` : undefined;
  return (
    <div>
      <FieldLabel htmlFor={id} required={required}>{label}</FieldLabel>
      <label
        className={`mt-2 flex cursor-pointer items-center gap-3 rounded-2xl border border-dashed px-3 py-3 ${
          error
            ? "border-danger bg-white"
            : "border-[color-mix(in_srgb,var(--navy)_42%,var(--teal))] bg-soft hover:border-primary"
        }`}
      >
        <span className="inline-flex shrink-0 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-on-primary">
          {action}
        </span>
        <span className={`min-w-0 truncate text-sm ${fileName ? "text-ink" : "text-muted"}`}>
          {fileName || "No file chosen"}
        </span>
        <input
          id={id}
          type="file"
          accept="image/*,.pdf,application/pdf"
          className="sr-only"
          aria-required={required || undefined}
          aria-invalid={error ? true : undefined}
          aria-describedby={errorId}
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (!file) {
              onPick(blankFile);
              return;
            }
            onPick({ name: file.name, problem: fileProblem(file) });
            event.target.value = "";
          }}
        />
      </label>
      <FieldMessage id={errorId}>{error}</FieldMessage>
    </div>
  );
}
