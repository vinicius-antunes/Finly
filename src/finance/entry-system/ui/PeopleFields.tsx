import { Button } from "@/components/ui/button";
import { FormField, MoneyInput, today } from "./fields";
import { newPerson, type PersonDraft } from "./draft";
export function PeopleFields({
  people,
  onChange,
  standalone = false,
  error,
}: {
  people: PersonDraft[];
  onChange: (v: PersonDraft[]) => void;
  standalone?: boolean;
  error?: string;
}) {
  const patch = (i: number, v: Partial<PersonDraft>) =>
    onChange(people.map((p, j) => (i === j ? { ...p, ...v } : p)));
  return (
    <div>
      {people.map((p, i) => (
        <section className="entry-subcard" key={p.id}>
          <h3>{standalone ? "Responsável" : "Responsável " + (i + 1)}</h3>
          <div className="entry-grid">
            <FormField label="Nome da pessoa (opcional)">
              {(a) => (
                <input
                  {...a}
                  value={p.name}
                  placeholder="Identificação pendente"
                  onChange={(e) => patch(i, { name: e.target.value })}
                />
              )}
            </FormField>
            {!standalone && (
              <FormField label="Valor devido por esta pessoa">
                {(a) => (
                  <MoneyInput
                    {...a}
                    value={p.amount}
                    onChange={(amount) => patch(i, { amount })}
                  />
                )}
              </FormField>
            )}
            <FormField label="Modalidade do reembolso">
              {(a) => (
                <select
                  {...a}
                  value={p.mode}
                  onChange={(e) => {
                    if (
                      p.rows.length &&
                      !confirm(
                        "Alterar a modalidade e descartar o cronograma preenchido?",
                      )
                    )
                      return;
                    patch(i, {
                      mode: e.target.value as PersonDraft["mode"],
                      rows: [],
                    });
                  }}
                >
                  <option value="single">Recebimento único</option>
                  <option value="installments">
                    Acompanhar parcelas da compra
                  </option>
                  <option value="custom">Cronograma personalizado</option>
                </select>
              )}
            </FormField>
            {p.mode === "single" && !standalone && (
              <>
                <FormField label="Data prevista do reembolso">
                  {(a) => (
                    <input
                      {...a}
                      type="date"
                      value={p.date}
                      onChange={(e) => patch(i, { date: e.target.value })}
                    />
                  )}
                </FormField>
                <FormField label="Competência do reembolso">
                  {(a) => (
                    <input
                      {...a}
                      type="month"
                      value={p.period}
                      onChange={(e) => patch(i, { period: e.target.value })}
                    />
                  )}
                </FormField>
              </>
            )}
          </div>
          {p.mode === "custom" && (
            <>
              <div>
                {p.rows.map((r, j) => (
                  <div className="entry-subcard" key={r.id}>
                    <div className="entry-grid">
                      <FormField label={`Valor previsto ${j + 1}`}>
                        {(a) => (
                          <MoneyInput
                            {...a}
                            value={r.amount}
                            onChange={(amount) =>
                              patch(i, {
                                rows: p.rows.map((x, k) =>
                                  j === k ? { ...x, amount } : x,
                                ),
                              })
                            }
                          />
                        )}
                      </FormField>
                      <FormField label={`Competência prevista ${j + 1}`}>
                        {(a) => (
                          <input
                            {...a}
                            type="month"
                            value={r.period}
                            onChange={(e) =>
                              patch(i, {
                                rows: p.rows.map((x, k) =>
                                  j === k
                                    ? { ...x, period: e.target.value }
                                    : x,
                                ),
                              })
                            }
                          />
                        )}
                      </FormField>
                      <FormField label={`Data prevista ${j + 1} (opcional)`}>
                        {(a) => (
                          <input
                            {...a}
                            type="date"
                            value={r.date}
                            onChange={(e) =>
                              patch(i, {
                                rows: p.rows.map((x, k) =>
                                  j === k ? { ...x, date: e.target.value } : x,
                                ),
                              })
                            }
                          />
                        )}
                      </FormField>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() =>
                        patch(i, { rows: p.rows.filter((_, k) => j !== k) })
                      }
                    >
                      Remover previsão {j + 1}
                    </Button>
                  </div>
                ))}
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={() =>
                  patch(i, {
                    rows: [
                      ...p.rows,
                      {
                        id: crypto.randomUUID(),
                        amount: "",
                        date: "",
                        period: today().slice(0, 7),
                      },
                    ],
                  })
                }
              >
                Adicionar previsão
              </Button>
            </>
          )}
          {!standalone && (
            <Button
              type="button"
              variant="ghost"
              onClick={() => onChange(people.filter((_, j) => i !== j))}
            >
              Remover responsável {i + 1}
            </Button>
          )}
        </section>
      ))}
      {!standalone && (
        <Button
          type="button"
          variant="outline"
          onClick={() => onChange([...people, newPerson()])}
        >
          Adicionar responsável
        </Button>
      )}
      {error && (
        <p
          role="alert"
          className="field-error"
          data-field="people"
          tabIndex={-1}
        >
          {error}
        </p>
      )}
    </div>
  );
}
