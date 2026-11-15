import type { EntryType } from "../contracts";
export function EntryTabs({
  value,
  editing,
  onChange,
}: {
  value: EntryType;
  editing: boolean;
  onChange: (type: EntryType) => void;
}) {
  const labels: [EntryType, string][] = [
    ["expense", "Despesa"],
    ["income", "Receita"],
    ["card", "Cartão"],
    ["reimbursement", "Reembolso"],
    ["transfer", "Transferência"],
  ];
  return (
    <div role="tablist" aria-label="Tipo de lançamento" className="entry-tabs">
      {labels.map(([type, label], i) => (
        <button
          type="button"
          key={type}
          role="tab"
          id={`entry-tab-${type}`}
          aria-selected={value === type}
          aria-controls="entry-panel"
          tabIndex={value === type ? 0 : -1}
          disabled={editing && type !== value}
          onClick={() => onChange(type)}
          onKeyDown={(e) => {
            if (editing) return;
            if (["ArrowLeft", "ArrowRight", "Home", "End"].includes(e.key)) {
              e.preventDefault();
              const index =
                e.key === "Home"
                  ? 0
                  : e.key === "End"
                    ? 4
                    : (i + (e.key === "ArrowRight" ? 1 : 4)) % 5;
              onChange(labels[index][0]);
              document.getElementById(`entry-tab-${labels[index][0]}`)?.focus();
            }
          }}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
