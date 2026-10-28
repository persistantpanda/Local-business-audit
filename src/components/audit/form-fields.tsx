"use client";

import { useId, type ReactNode } from "react";

const inputClass =
  "mt-1.5 h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-slate-900 outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-100 aria-[invalid=true]:border-fail";

function FieldShell({ id, label, hint, error, children }: { id: string; label: string; hint?: string; error?: string; children: ReactNode }) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-slate-700">
        {label}
      </label>
      {children}
      {hint && !error && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
      {error && (
        <p className="mt-1 text-xs font-medium text-fail" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

interface TextFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  type?: "text" | "tel" | "url" | "date";
  autoComplete?: string;
  placeholder?: string;
  hint?: string;
  error?: string;
  max?: string;
  maxLength?: number;
}

export function TextField({ label, value, onChange, type = "text", error, hint, maxLength = 200, ...rest }: TextFieldProps) {
  const id = useId();
  return (
    <FieldShell id={id} label={label + (rest.required ? "" : " (optional)")} hint={hint} error={error}>
      <input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={Boolean(error)}
        maxLength={maxLength}
        className={inputClass}
        {...rest}
      />
    </FieldShell>
  );
}

interface NumberFieldProps {
  label: string;
  value: number | null;
  onChange: (value: number | null) => void;
  min?: number;
  max?: number;
  step?: number;
  hint?: string;
  error?: string;
  suffix?: string;
}

export function NumberField({ label, value, onChange, min = 0, max, step = 1, hint, error, suffix }: NumberFieldProps) {
  const id = useId();
  return (
    <FieldShell id={id} label={label} hint={hint ?? "Leave blank if you're not sure."} error={error}>
      <div className="relative">
        <input
          id={id}
          type="number"
          inputMode={step < 1 ? "decimal" : "numeric"}
          value={value ?? ""}
          min={min}
          max={max}
          step={step}
          onChange={(e) => onChange(e.target.value === "" ? null : Number(e.target.value))}
          aria-invalid={Boolean(error)}
          className={`${inputClass} ${suffix ? "pr-12" : ""}`}
        />
        {suffix && <span className="pointer-events-none absolute right-3 top-1/2 mt-[3px] -translate-y-1/2 text-sm text-slate-400">{suffix}</span>}
      </div>
    </FieldShell>
  );
}

export type TriValue = "yes" | "no" | "unknown";

interface ChoiceFieldProps<T extends string> {
  label: string;
  value: T;
  onChange: (value: T) => void;
  options: { value: T; label: string }[];
  hint?: string;
}

/** Segmented control — large tap targets that work well on phones. */
export function ChoiceField<T extends string>({ label, value, onChange, options, hint }: ChoiceFieldProps<T>) {
  const id = useId();
  return (
    <fieldset>
      <legend className="block text-sm font-medium text-slate-700">{label}</legend>
      <div className="mt-1.5 grid auto-cols-fr grid-flow-col gap-1 rounded-lg bg-slate-100 p-1">
        {options.map((o) => (
          <label
            key={o.value}
            className={`flex min-h-10 cursor-pointer items-center justify-center rounded-md px-2 text-center text-sm font-medium transition has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-brand-500 ${
              value === o.value ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <input type="radio" name={id} value={o.value} checked={value === o.value} onChange={() => onChange(o.value)} className="sr-only" />
            {o.label}
          </label>
        ))}
      </div>
      {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
    </fieldset>
  );
}

const TRI_OPTIONS: { value: TriValue; label: string }[] = [
  { value: "yes", label: "Yes" },
  { value: "no", label: "No" },
  { value: "unknown", label: "Not sure" },
];

export function TriField(props: Omit<ChoiceFieldProps<TriValue>, "options">) {
  return <ChoiceField {...props} options={TRI_OPTIONS} />;
}

export function SelectField<T extends string>({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: T;
  onChange: (value: T) => void;
  options: readonly T[];
}) {
  const id = useId();
  return (
    <FieldShell id={id} label={label}>
      <select id={id} value={value} onChange={(e) => onChange(e.target.value as T)} className={inputClass}>
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </FieldShell>
  );
}

export function FormSection({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
      <h2 className="text-base font-semibold text-slate-900">{title}</h2>
      {description && <p className="mt-1 text-sm text-slate-500">{description}</p>}
      <div className="mt-5 grid gap-5 sm:grid-cols-2">{children}</div>
    </section>
  );
}
