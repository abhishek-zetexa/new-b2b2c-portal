"use client";

import { useState, type FormEvent } from "react";
import { Modal } from "@/components/ui/modal";
import { SelectField, TextField } from "@/components/ui/form-field";
import { PhoneField } from "@/components/ui/phone-field";
import { WaveLoader } from "@/components/ui/wave-loader";
import { emailError, nationalDigits, phoneError } from "@/lib/field-rules";
import {
  extractAgentFieldErrors,
  type AgentRecord,
  type CreateAgentPayload,
  type UpdateAgentPayload,
} from "@/lib/agents";

export function AgentFormModal({
  open,
  agent,
  onClose,
  onSuccess,
  onUnauthorized,
}: {
  open: boolean;
  agent: AgentRecord | null;
  onClose: () => void;
  onSuccess: (message: string) => void;
  onUnauthorized: () => void;
}) {
  const isEdit = Boolean(agent);
  const initialPhone = agent?.phone
    ? `${agent.phoneCountryCode || "+91"}${agent.phone}`
    : "";

  const [firstName, setFirstName] = useState(agent?.firstName ?? "");
  const [lastName, setLastName] = useState(agent?.lastName ?? "");
  const [email, setEmail] = useState(agent?.email ?? "");
  const [status, setStatus] = useState(agent?.status || "ACTIVE");
  const [phone, setPhone] = useState(initialPhone);
  const [phoneDial, setPhoneDial] = useState(agent?.phoneCountryCode || "+91");
  const [description, setDescription] = useState(agent?.description ?? "");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState("");
  const [busy, setBusy] = useState(false);

  function clearError(key: string) {
    setFormError("");
    setErrors((current) => (current[key] ? { ...current, [key]: "" } : current));
  }

  function validate(): Record<string, string> {
    const next: Record<string, string> = {};

    if (!isEdit) {
      const trimmedFirst = firstName.trim();
      if (!trimmedFirst) {
        next.firstName = "First Name is required.";
      } else if (trimmedFirst.length < 3) {
        next.firstName = "Should be more than 2 characters.";
      }

      if (!lastName.trim()) {
        next.lastName = "Last Name is required.";
      }

      const trimmedEmail = email.trim().toLowerCase();
      if (!trimmedEmail) {
        next.email = "Email is required.";
      } else if (emailError(trimmedEmail)) {
        next.email = "Email format is Incorrect.";
      }
    }

    if (!status.trim()) {
      next.status = "Status is required.";
    }

    if (!phoneDial.trim()) {
      next.phone = "Country code is required.";
    } else {
      const phoneIssue = phoneError(phone, phoneDial);
      if (phoneIssue) {
        next.phone = phoneIssue;
      }
    }

    return next;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;

    const issues = validate();
    setErrors(issues);
    if (Object.values(issues).some(Boolean)) {
      setFormError("Kindly fix the highlighted fields.");
      return;
    }

    setBusy(true);
    setFormError("");

    const national = nationalDigits(phone, phoneDial);
    const body: CreateAgentPayload | UpdateAgentPayload =
      isEdit && agent
        ? {
            agent_id: agent.agentId,
            phone: national,
            phone_country_code: phoneDial.trim(),
            status: status.trim().toUpperCase(),
            description: description.trim(),
          }
        : {
            agent_first_name: firstName.trim(),
            agent_last_name: lastName.trim(),
            email: email.trim().toLowerCase(),
            phone: national,
            phone_country_code: phoneDial.trim(),
            status: status.trim().toUpperCase(),
            description: description.trim(),
          };

    try {
      const response = await fetch("/api/agents", {
        method: isEdit ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(body),
      });

      if (response.status === 401) {
        onUnauthorized();
        return;
      }

      const data = (await response.json().catch(() => ({}))) as {
        success?: boolean;
        message?: string;
        errors?: unknown;
      };

      if (!response.ok || data.success === false) {
        const apiFieldErrors = extractAgentFieldErrors(data);
        if (Object.keys(apiFieldErrors).length > 0) {
          setErrors((current) => ({ ...current, ...apiFieldErrors }));
        }
        setFormError(
          data.message ||
            (isEdit ? "Failed to update agent." : "Failed to create agent."),
        );
        setBusy(false);
        return;
      }

      onSuccess(
        data.message ||
          (isEdit ? "Agent updated successfully" : "Agent created successfully"),
      );
    } catch {
      setFormError("Cannot reach the agent service. Try again in a moment.");
      setBusy(false);
    }
  }

  return (
    <Modal
      open={open}
      title={isEdit ? "Update Agent" : "Create Agent"}
      onClose={() => {
        if (!busy) onClose();
      }}
      footer={
        <div className="flex w-full items-center justify-end gap-3">
          <button
            type="button"
            disabled={busy}
            onClick={onClose}
            className="inline-flex h-11 cursor-pointer items-center justify-center rounded-full border border-line bg-surface px-5 text-sm font-semibold text-ink transition hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="agent-form"
            disabled={busy}
            aria-busy={busy || undefined}
            className="inline-flex h-11 min-w-28 cursor-pointer items-center justify-center gap-2 rounded-full bg-primary px-6 text-sm font-semibold text-on-primary transition hover:bg-primary-hover disabled:cursor-wait"
          >
            {busy ? <WaveLoader size="sm" label="Saving" /> : isEdit ? "Update" : "Create"}
          </button>
        </div>
      }
    >
      {formError ? (
        <div
          role="alert"
          className="mb-4 rounded-2xl border border-danger/25 bg-danger/5 px-4 py-3 text-sm font-medium text-danger"
        >
          {formError}
        </div>
      ) : null}

      <form
        id="agent-form"
        noValidate
        className="grid gap-4 sm:grid-cols-2"
        onSubmit={handleSubmit}
      >
        <TextField
          id="agent-first-name"
          label="First Name"
          required
          disabled={isEdit || busy}
          value={firstName}
          error={errors.firstName}
          placeholder="Enter First Name"
          onChange={(next) => {
            setFirstName(next);
            clearError("firstName");
          }}
        />
        <TextField
          id="agent-last-name"
          label="Last Name"
          required
          disabled={isEdit || busy}
          value={lastName}
          error={errors.lastName}
          placeholder="Enter Last Name"
          onChange={(next) => {
            setLastName(next);
            clearError("lastName");
          }}
        />
        <TextField
          id="agent-email"
          label="Email Id"
          type="email"
          inputMode="email"
          required
          disabled={isEdit || busy}
          value={email}
          error={errors.email}
          placeholder="Enter Email"
          onChange={(next) => {
            setEmail(next);
            clearError("email");
          }}
        />
        <SelectField
          id="agent-status"
          label="Status"
          required
          disabled={busy}
          value={status}
          error={errors.status}
          onChange={(next) => {
            setStatus(next);
            clearError("status");
          }}
        >
          <option value="">Status</option>
          <option value="ACTIVE">ACTIVE</option>
          <option value="INACTIVE">INACTIVE</option>
        </SelectField>
        <PhoneField
          id="agent-phone"
          label="Mobile Number"
          required
          disabled={busy}
          value={phone}
          error={errors.phone}
          placeholder="Enter number"
          onChange={(next) => {
            setPhone(next.international);
            setPhoneDial(next.dialCode);
            clearError("phone");
          }}
        />
        <TextField
          id="agent-description"
          label="Description"
          disabled={busy}
          value={description}
          error={errors.description}
          placeholder="Enter description"
          onChange={(next) => {
            setDescription(next);
            clearError("description");
          }}
        />
      </form>
    </Modal>
  );
}

