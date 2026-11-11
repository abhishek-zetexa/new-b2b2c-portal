"use client";

import { ReactNode, SelectHTMLAttributes, useCallback, useId, useState } from "react";
import { Icon } from "@/components/ui/icon";

export function useShownFields() {
  const [shown, setShown] = useState<ReadonlySet<string>>(() => new Set());

  const show = useCallback((...names: string[]) => {
    setShown((current) => {
      const next = new Set(current);
      let changed = false;
      for (const name of names) {
        if (!next.has(name)) {
          next.add(name);
          changed = true;
        }
      }
      return changed ? next : current;
    });
  }, []);

  const message = useCallback(
    (name: string, text: string) => (shown.has(name) ? text : ""),
    [shown],
  );

  return { show, message };
}

export function FieldMessage({ id, children }: { id?: string; children?: string }) {
  if (!children) return null;
  return (
    <p id={id} role="alert" className="mt-1.5 text-xs font-medium leading-5 text-danger">
      {children}
    </p>
  );
}

export function FieldLabel({ htmlFor, required, children }: { htmlFor: string; required?: boolean; children: ReactNode }) {
  return (
    <label htmlFor={htmlFor} className="block text-sm font-medium text-ink">
      {children}
      {required ? <span className="text-primary"> *</span> : null}
    </label>
  );
}

type TextFieldProps = {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  error?: string;
  required?: boolean;
  type?: string;
  inputMode?: "text" | "email" | "tel" | "numeric";
  autoComplete?: string;
  placeholder?: string;
  maxLength?: number;
  disabled?: boolean;
  className?: string;
};

function fieldPlaceholder(label: string, placeholder?: string) {
  if (placeholder?.trim()) return placeholder;
  const text = label.trim();
  if (!text) return undefined;
  return `Enter ${text.charAt(0).toLowerCase()}${text.slice(1)}`;
}

export function TextField({
  id,
  label,
  value,
  onChange,
  onBlur,
  error = "",
  required,
  type = "text",
  inputMode,
  autoComplete,
  placeholder,
  maxLength,
  disabled,
  className = "",
}: TextFieldProps) {
  const errorId = error ? `${id}-error` : undefined;
  return (
    <div>
      <FieldLabel htmlFor={id} required={required}>{label}</FieldLabel>
      <input
        id={id}
        name={id}
        type={type}
        inputMode={inputMode}
        autoComplete={autoComplete}
        placeholder={fieldPlaceholder(label, placeholder)}
        maxLength={maxLength}
        value={value}
        disabled={disabled}
        aria-required={required || undefined}
        aria-invalid={error ? true : undefined}
        aria-describedby={errorId}
        onBlur={onBlur}
        onChange={(event) => onChange(event.target.value)}
        className={`field mt-2 ${disabled ? "cursor-not-allowed opacity-60" : ""} ${className}`}
      />
      <FieldMessage id={errorId}>{error}</FieldMessage>
    </div>
  );
}

type SelectFieldProps = {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  error?: string;
  required?: boolean;
  disabled?: boolean;
  children: ReactNode;
} & Pick<SelectHTMLAttributes<HTMLSelectElement>, "autoComplete">;

export function SelectField({
  id,
  label,
  value,
  onChange,
  onBlur,
  error = "",
  required,
  disabled,
  autoComplete,
  children,
}: SelectFieldProps) {
  const errorId = error ? `${id}-error` : undefined;
  return (
    <div>
      <FieldLabel htmlFor={id} required={required}>{label}</FieldLabel>
      <div className="relative mt-2">
        <select
          id={id}
          name={id}
          value={value}
          disabled={disabled}
          data-empty={!value ? "true" : undefined}
          autoComplete={autoComplete}
          aria-required={required || undefined}
          aria-invalid={error ? true : undefined}
          aria-describedby={errorId}
          onBlur={onBlur}
          onChange={(event) => onChange(event.target.value)}
          style={{
            WebkitAppearance: "none",
            appearance: "none",
            paddingRight: "2.75rem",
            lineHeight: 1.5,
            color: value ? undefined : "color-mix(in srgb, var(--ink) 45%, transparent)",
          }}
          className={`field appearance-none [&_option]:bg-surface [&_option]:text-ink ${
            disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer"
          }`}
        >
          {children}
        </select>
        <Icon
          name="chevron"
          className="pointer-events-none absolute top-1/2 right-4 h-4 w-4 -translate-y-1/2 text-muted"
        />
      </div>
      <FieldMessage id={errorId}>{error}</FieldMessage>
    </div>
  );
}

export function CheckField({
  id,
  label,
  checked,
  onChange,
  error = "",
}: {
  id?: string;
  label: ReactNode;
  checked: boolean;
  onChange: (checked: boolean) => void;
  error?: string;
}) {
  const generatedId = useId();
  const fieldId = id ?? generatedId;
  const errorId = error ? `${fieldId}-error` : undefined;
  return (
    <div>
      <label htmlFor={fieldId} className="flex items-start gap-2 text-sm text-muted">
        <input
          id={fieldId}
          type="checkbox"
          checked={checked}
          aria-invalid={error ? true : undefined}
          aria-describedby={errorId}
          onChange={(event) => onChange(event.target.checked)}
          className="mt-1 accent-[var(--teal)]"
        />
        <span>{label}</span>
      </label>
      <FieldMessage id={errorId}>{error}</FieldMessage>
    </div>
  );
}
