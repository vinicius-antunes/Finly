import {
  useEffect,
  useId,
  useRef,
  useState,
  type InputHTMLAttributes,
  type ChangeEvent,
} from "react";
import {
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Button } from "./button";
import "./month-picker.css";
const months = [
  "Jan",
  "Fev",
  "Mar",
  "Abr",
  "Mai",
  "Jun",
  "Jul",
  "Ago",
  "Set",
  "Out",
  "Nov",
  "Dez",
];
const full = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];
/** Period strings stay YYYY-MM; no UTC/date conversion is used for selection. */
export function MonthPicker({
  value,
  defaultValue,
  onChange,
  min = "2000-01",
  max = "2099-12",
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  const [local, setLocal] = useState(String(defaultValue ?? "")),
    [year, setYear] = useState(new Date().getFullYear()),
    [open, setOpen] = useState(false);
  const selected = String(value ?? local),
    id = useId(),
    panel = useRef<HTMLDivElement>(null),
    input = useRef<HTMLInputElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) return;
    const escape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopImmediatePropagation();
        panel.current?.hidePopover();
        trigger.current?.focus();
      }
    };
    window.addEventListener("keydown", escape, true);
    return () => window.removeEventListener("keydown", escape, true);
  }, [open]);
  const allowed = (v: string) => v >= String(min) && v <= String(max);
  function choose(v: string) {
    if (v && !allowed(v)) return;
    setLocal(v);
    if (input.current) {
      const setter = Object.getOwnPropertyDescriptor(
        HTMLInputElement.prototype,
        "value",
      )!.set!;
      setter.call(input.current, v);
      onChange?.({
        target: input.current,
        currentTarget: input.current,
      } as ChangeEvent<HTMLInputElement>);
    }
    panel.current?.hidePopover();
    trigger.current?.focus();
  }
  return (
    <span className="month-picker">
      <input
        {...props}
        id={undefined}
        aria-label={undefined}
        aria-labelledby={undefined}
        ref={input}
        type="month"
        min={min}
        max={max}
        value={selected}
        onChange={onChange}
        className="month-native"
        tabIndex={-1}
        aria-hidden="true"
        onInvalid={() => {
          trigger.current?.focus();
          panel.current?.showPopover();
        }}
      />
      <Button
        ref={trigger}
        id={props.id}
        type="button"
        variant="outline"
        disabled={props.disabled}
        aria-label={props["aria-label"]}
        aria-labelledby={props["aria-labelledby"]}
        aria-describedby={props["aria-describedby"]}
        aria-invalid={props["aria-invalid"]}
        aria-haspopup="dialog"
        aria-expanded={open}
        popoverTarget={id}
        onClick={() =>
          setYear(
            /^\d{4}-\d{2}$/.test(selected)
              ? Number(selected.slice(0, 4))
              : new Date().getFullYear(),
          )
        }
        className="month-trigger"
      >
        <CalendarDays aria-hidden="true" />
        <span>
          {selected
            ? `${full[Number(selected.slice(5)) - 1]} de ${selected.slice(0, 4)}`
            : "Selecionar mês"}
        </span>
        <ChevronDown aria-hidden="true" />
      </Button>
      <div
        id={id}
        ref={panel}
        popover="auto"
        role="dialog"
        aria-label="Selecionar mês e ano"
        className="month-panel"
        onToggle={(e) => {
          const shown = e.newState === "open";
          setOpen(shown);
          if (shown) {
            const r = trigger.current!.getBoundingClientRect();
            Object.assign(panel.current!.style, {
              left: `${Math.max(8, Math.min(r.left, innerWidth - 296))}px`,
              top: `${Math.max(8, Math.min(r.bottom + 6, innerHeight - 316))}px`,
            });
            panel
              .current!.querySelector<HTMLButtonElement>(
                '[aria-pressed="true"],.month-grid button:not(:disabled)',
              )
              ?.focus();
          }
        }}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            e.stopPropagation();
            e.preventDefault();
            panel.current?.hidePopover();
            trigger.current?.focus();
          }
          const nodes = Array.from(
            panel.current!.querySelectorAll<HTMLButtonElement>(
              ".month-grid button",
            ),
          );
          let i = nodes.indexOf(document.activeElement as HTMLButtonElement);
          const delta = (
            {
              ArrowRight: 1,
              ArrowLeft: -1,
              ArrowDown: 3,
              ArrowUp: -3,
            } as Record<string, number>
          )[e.key];
          if (i >= 0 && delta) {
            e.preventDefault();
            i = Math.max(0, Math.min(11, i + delta));
            if (!nodes[i].disabled) nodes[i].focus();
          }
        }}
      >
        <div className="month-year">
          <Button
            type="button"
            variant="ghost"
            aria-label="Ano anterior"
            disabled={year <= Number(String(min).slice(0, 4))}
            onClick={() => setYear(year - 1)}
          >
            <ChevronLeft />
          </Button>
          <strong aria-live="polite">{year}</strong>
          <Button
            type="button"
            variant="ghost"
            aria-label="Próximo ano"
            disabled={year >= Number(String(max).slice(0, 4))}
            onClick={() => setYear(year + 1)}
          >
            <ChevronRight />
          </Button>
        </div>
        <div className="month-grid">
          {months.map((m, i) => {
            const v = `${year}-${String(i + 1).padStart(2, "0")}`;
            return (
              <Button
                key={m}
                type="button"
                variant="ghost"
                disabled={!allowed(v)}
                aria-label={`${full[i]} de ${year}`}
                aria-pressed={selected === v}
                onClick={() => choose(v)}
              >
                {m}
              </Button>
            );
          })}
        </div>
        <div className="month-footer">
          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              const d = new Date();
              choose(
                `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
              );
            }}
          >
            Mês atual
          </Button>
          {!props.required && (
            <Button type="button" variant="ghost" onClick={() => choose("")}>
              Limpar
            </Button>
          )}
        </div>
      </div>
    </span>
  );
}
export function PeriodInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return props.type === "month" ? (
    <MonthPicker {...props} />
  ) : (
    <input {...props} />
  );
}
