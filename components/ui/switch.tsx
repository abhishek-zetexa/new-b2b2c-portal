"use client";

export function Switch({
  checked,
  onCheckedChange,
  id,
  disabled = false,
  label,
  ariaLabel,
}: {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  id?: string;
  disabled?: boolean;
  label?: string;
  ariaLabel?: string;
}) {
  return (
    <label htmlFor={id} className={`inline-flex items-center gap-2.5 cursor-pointer ${disabled ? "opacity-50 pointer-events-none" : ""}`}>
      <button
        type="button"
        id={id}
        role="switch"
        aria-checked={checked}
        aria-label={ariaLabel || label}
        disabled={disabled}
        onClick={() => onCheckedChange(!checked)}
        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
          checked ? "bg-primary" : "bg-line"
        }`}
      >
        <span
          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-surface shadow-md ring-0 transition duration-200 ease-in-out ${
            checked ? "translate-x-5" : "translate-x-0"
          }`}
        />
      </button>
      {label ? <span className="text-sm font-medium text-ink select-none">{label}</span> : null}
    </label>
  );
}

