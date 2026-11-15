import { useId, type ReactNode, type InputHTMLAttributes } from "react";
import { Input } from "@/components/ui/input";

import { parseMoney, formatMoney } from "./money";
export { parseMoney, decimal, today } from "./money";
export function MoneyInput({
  value,
  onChange,
  ...props
}: Omit<InputHTMLAttributes<HTMLInputElement>, "value" | "onChange"> & {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <Input
      {...props}
      inputMode="decimal"
      placeholder="R$ 0,00"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onBlur={(e) => {
        try {
          if (e.target.value.trim())
            onChange(formatMoney(parseMoney(e.target.value)));
        } catch {
          /* retain invalid input for correction */
        }
      }}
    />
  );
}
export function FormField({
  label,
  error,
  children,
  wide = false,
  name,
}: {
  label: string;
  error?: string;
  wide?: boolean;
  name?: string;
  children: (props: {
    id: string;
    "aria-invalid": boolean;
    "aria-describedby"?: string;
    "data-field"?: string;
  }) => ReactNode;
}) {
  const id = useId();
  return (
    <div className={"entry-field" + (wide ? " entry-wide" : "")}>
      <label htmlFor={id}>{label}</label>
      {children({
        id,
        "aria-invalid": !!error,
        "aria-describedby": error ? id + "-error" : undefined,
        "data-field": name,
      })}
      {error && (
        <p id={id + "-error"} className="field-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
