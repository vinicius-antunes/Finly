import { useState, type ReactNode } from "react";
import {
  Layers,
  Repeat,
  MoreHorizontal,
  ShoppingBag,
  Home,
  Gamepad2,
  Car,
  Heart,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { money, type State, type Entry } from "./model";
import { OperationsManager } from "./entry-system/ui/OperationsManager";
import { ReceiptManager } from "./receipts/ReceiptFields";
import { linked, type Target } from "./receipts/model";
import "./installments.css";
import { installmentPayment, pendingInstallments } from "./installment-summary";
function CategoryIcon({ name = "" }: { name?: string }) {
  const Icon = /jogo|lazer/i.test(name)
    ? Gamepad2
    : /casa|moradia/i.test(name)
      ? Home
      : /transporte|carro/i.test(name)
        ? Car
        : /saúde|saude/i.test(name)
          ? Heart
          : ShoppingBag;
  return <Icon aria-hidden="true" />;
}
export function InstallmentsWorkspace({
  state: s,
  period,
  onCommit,
  onEdit,
  onLegacyRows,
  onDeleteGroup,
  onNew,
}: {
  state: State;
  period: string;
  onCommit: (s: State) => boolean;
  onEdit: (id: string) => void;
  onLegacyRows: (rows: Entry[]) => ReactNode;
  onDeleteGroup: (id: string) => void;
  onNew: (recurring: boolean) => void;
}) {
  const [tab, setTab] = useState<"purchases" | "recurrences">("purchases"),
    [search, setSearch] = useState(""),
    [filter, setFilter] = useState("all"),
    [monthOnly, setMonthOnly] = useState(false),
    [receipt, setReceipt] = useState<Target>();
  const l = s.entryLedger,
    today = new Date().toLocaleDateString("sv-SE");
  const purchases = (l?.purchases ?? [])
    .filter((p) => p.installmentIds.length > 0)
    .map((p) => {
      const ops = p.installmentIds
        .map((id) => l!.operations.find((o) => o.id === id)!)
        .filter(Boolean);
      const payments = ops.map((o) => installmentPayment(s, o));
      const complete = payments.filter(
        (b, i) => b.known && b.remaining === 0 && !ops[i].cancelled,
      ).length;
      return {
        p,
        ops,
        payments,
        complete,
        status: p.cancelled
          ? "cancelled"
          : complete === ops.length && ops.length > 0
            ? "completed"
            : "active",
        name: ops[0]?.description ?? "Compra sem descrição",
      };
    });
  const groups = Array.from(
    new Set(
      s.transactions
        .filter((o) => o.legacyKind === "credit" && o.groupId)
        .map((o) => o.groupId!),
    ),
  ).map((id) => ({ id, rows: s.transactions.filter((o) => o.groupId === id) }));
  const matches = (name: string, status: string) =>
    name.toLocaleLowerCase().includes(search.toLocaleLowerCase()) &&
    (filter === "all" || filter === status);
  const shown = purchases.filter(
    (x) =>
      matches(x.name, x.status) &&
      (!monthOnly || x.ops.some((o) => o.period === period)),
  );
  const recs = (l?.recurrences ?? []).map((r) => ({
    ...r,
    displayStatus:
      r.status === "cancelled"
        ? "cancelled"
        : r.endsOn && r.endsOn < today
          ? "ended"
          : r.status,
  }));
  const shownR = recs.filter(
    (r) =>
      matches(r.description ?? "", r.displayStatus) &&
      (!monthOnly ||
        r.occurrences.some(
          (x) =>
            l!.operations.find((o) => o.id === x.operationId)?.period ===
            period,
        )),
  );
  const active = purchases.filter((x) => x.status === "active");
  const pending = s.entryLedger
    ? pendingInstallments(
        s,
        new Set(active.flatMap((x) => x.ops.map((o) => o.id))),
      )
    : { minimum: 0, maximum: 0 };
  const monthly = (l?.operations ?? []).filter(
    (o) => o.recurrenceId && !o.cancelled && o.period === period,
  );
  const manager = (purchaseId?: string, recurrenceId?: string) => (
    <OperationsManager
      state={s}
      period={period}
      screen="installments"
      purchaseId={purchaseId}
      recurrenceId={recurrenceId}
      onCommit={onCommit}
      onEdit={onEdit}
      onNewTransfer={() => {}}
    />
  );
  const legacyVisible = groups.filter(
    (g) =>
      matches(g.rows[0]?.description ?? "", "uncertain") &&
      (!monthOnly || g.rows.some((o) => o.period === period)),
  );
  return (
    <section className="installments-workspace">
      <div
        onKeyDown={(e) => {
          if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
            e.preventDefault();
            const next = tab === "purchases" ? "recurrences" : "purchases";
            setTab(next);
            setFilter("all");
            setSearch("");
            document.getElementById(`tab-${next}`)?.focus();
          }
        }}
        role="tablist"
        aria-label="Parcelas e recorrências"
        className="contract-tabs"
      >
        {(
          [
            ["purchases", "Parcelamentos"],
            ["recurrences", "Recorrências"],
          ] as const
        ).map(([id, name]) => (
          <Button
            key={id}
            role="tab"
            id={`tab-${id}`}
            aria-controls={`panel-${id}`}
            aria-selected={tab === id}
            variant={tab === id ? "default" : "outline"}
            onClick={() => {
              setTab(id);
              setFilter("all");
              setSearch("");
            }}
          >
            {name}
          </Button>
        ))}
      </div>
      <div role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`}>
        <div className="contract-indicators">
          {(tab === "purchases"
            ? [
                ["Compras ativas", String(active.length)],
                [
                  "Parcelas restantes",
                  String(
                    active.reduce(
                      (n, x) =>
                        n +
                        x.ops.filter(
                          (o, i) =>
                            !o.cancelled &&
                            (!x.payments[i].known ||
                              x.payments[i].remaining > 0),
                        ).length,
                      0,
                    ),
                  ),
                ],
                [
                  "Total pendente",
                  pending.minimum === pending.maximum
                    ? money(pending.minimum)
                    : `${money(pending.minimum)} a ${money(pending.maximum)}`,
                ],
              ]
            : [
                [
                  "Recorrências ativas",
                  String(
                    recs.filter((r) => r.displayStatus === "active").length,
                  ),
                ],
                [
                  "Despesas previstas no mês",
                  money(
                    monthly
                      .filter((o) => o.type === "expense" || o.type === "card")
                      .reduce((n, o) => n + o.amountCents, 0),
                  ),
                ],
                ["Ocorrências previstas no mês", String(monthly.length)],
              ]
          ).map(([name, value]) => (
            <div key={name}>
              <span>{name}</span>
              <strong>{value}</strong>
            </div>
          ))}
        </div>
        <p className="muted">
          {tab === "purchases"
            ? "Indicadores contratuais de todos os parcelamentos identificados, sem cancelados; independem dos filtros e do mês. Valores restantes referem-se às parcelas, sem entrada. Intervalos indicam pagamento compartilhado de fatura sem rateio por compra. Registros antigos ficam fora dos totais por não terem pagamento individual verificável. Pagamentos parciais de fatura não são rateados entre parcelas."
            : "Ativas: situação atual, independente do mês. Previsões: ocorrências já geradas no mês selecionado, incluindo despesas e receitas separadas; não representam pagamentos."}
        </p>
        {tab === "recurrences" && (
          <p>
            Receitas previstas em {period}:{" "}
            {money(
              monthly
                .filter(
                  (o) => o.type === "income" || o.type === "reimbursement",
                )
                .reduce((n, o) => n + o.amountCents, 0),
            )}
          </p>
        )}
        <div className="contract-filters">
          <label>
            Pesquisar {tab === "purchases" ? "compra" : "recorrência"}
            <input value={search} onChange={(e) => setSearch(e.target.value)} />
          </label>
          <label>
            Situação
            <select
              aria-label="Situação"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            >
              <option value="all">Todas</option>
              {(tab === "purchases"
                ? [
                    ["active", "Ativos"],
                    ["completed", "Concluídos"],
                    ["cancelled", "Cancelados"],
                    ["uncertain", "Classificação incerta"],
                  ]
                : [
                    ["active", "Ativas"],
                    ["paused", "Pausadas"],
                    ["cancelled", "Canceladas"],
                    ["ended", "Encerradas"],
                  ]
              ).map(([v, t]) => (
                <option key={v} value={v}>
                  {t}
                </option>
              ))}
            </select>
          </label>
          <label>
            <input
              type="checkbox"
              checked={monthOnly}
              onChange={(e) => setMonthOnly(e.target.checked)}
            />
            Com ocorrência em {period}
          </label>
        </div>
        <p className="muted">
          {monthOnly
            ? "Exibindo o contrato inteiro quando possui ocorrência no mês selecionado."
            : "Exibindo todos os períodos, inclusive anteriores e futuros."}
        </p>
        {tab === "purchases" ? (
          <>
            {shown.map(({ p, ops, payments, complete, status, name }) => (
              <article className="contract-card" key={p.id}>
                <header>
                  <CategoryIcon
                    name={
                      l?.categories.find((c) => c.id === ops[0]?.categoryId)
                        ?.name
                    }
                  />
                  <div>
                    <h2>{name}</h2>
                    <p>
                      {l?.categories.find((c) => c.id === ops[0]?.categoryId)
                        ?.name ?? "Categoria não informada"}{" "}
                      ·{" "}
                      {l?.cards.find((c) => c.id === ops[0]?.cardId)?.name ??
                        "Cartão não informado"}{" "}
                      ·{" "}
                      {p.responsibility === "shared"
                        ? "Compartilhada"
                        : p.responsibility === "other"
                          ? "De outra pessoa"
                          : p.responsibility === "personal"
                            ? "Pessoal"
                            : "Responsabilidade não informada"}
                    </p>
                  </div>
                  <strong>{money(p.contractedCents)}</strong>
                </header>
                <p>
                  {ops.length} parcelas ·{" "}
                  {new Set(ops.map((o) => o.amountCents)).size === 1
                    ? money(ops[0].amountCents) + " por parcela"
                    : "Valores personalizados"}{" "}
                  ·{" "}
                  {status === "cancelled"
                    ? "Cancelada"
                    : status === "completed"
                      ? "Concluída"
                      : "Ativa"}
                </p>
                <progress
                  max={ops.length || 1}
                  value={complete}
                  aria-label={`Progresso de ${name}`}
                />
                <p>
                  {complete} de {ops.length} parcelas pagas
                  {payments.some((p) => !p.known)
                    ? " · Pagamento individual indisponível para fatura parcial"
                    : ""}
                </p>
                <p>
                  {p.goalId ? "Planejamento vinculado · " : ""}
                  {l?.agreements?.some((a) => a.purchaseId === p.id)
                    ? "Reembolsos vinculados"
                    : ""}
                </p>
                <details id={`purchase-details-${p.id}`}>
                  <summary>Ver parcelas e detalhes</summary>
                  <p>
                    Original: {money(p.originalCents)} · Contratado:{" "}
                    {money(p.contractedCents)} · Diferença contratual:{" "}
                    {money(p.contractedCents - p.originalCents)}.{" "}
                    {p.goalId &&
                      `Planejamento: ${s.planning?.goals.find((g) => g.id === p.goalId)?.name ?? p.goalId}`}
                  </p>
                  {p.downPaymentEntryId && (
                    <p>
                      Entrada:{" "}
                      {money(
                        l!.operations.find(
                          (o) => o.id === p.downPaymentEntryId,
                        )!.amountCents,
                      )}{" "}
                      · pagamentos registrados preservados.
                    </p>
                  )}
                  <p>
                    Parcelas pagas: {complete} · Pendentes ou sem quitação
                    individual:{" "}
                    {ops.filter((o) => !o.cancelled).length - complete} ·
                    Restante das parcelas:{" "}
                    {(() => {
                      const b = pendingInstallments(
                        s,
                        new Set(p.installmentIds),
                      );
                      return b.minimum === b.maximum
                        ? money(b.minimum)
                        : `${money(b.minimum)} a ${money(b.maximum)}`;
                    })()}
                  </p>
                  <div className="contract-table">
                    <table>
                      <thead>
                        <tr>
                          {[
                            "Parcela",
                            "Mês de referência",
                            "Valor",
                            "Situação",
                            "Pago",
                            "Restante",
                            "Ações",
                          ].map((t) => (
                            <th key={t}>{t}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {ops.map((o, i) => (
                          <tr key={o.id}>
                            <td>
                              {o.installmentNumber ?? "?"} /{" "}
                              {o.installmentCount ?? ops.length}
                            </td>
                            <td>{o.period}</td>
                            <td>{money(o.amountCents)}</td>
                            <td>
                              {o.cancelled
                                ? "Cancelada"
                                : !payments[i].known
                                  ? "Fatura parcial"
                                  : payments[i].remaining === 0
                                    ? "Paga"
                                    : payments[i].paid
                                      ? "Parcial"
                                      : "Pendente"}
                            </td>
                            <td>
                              {payments[i].known
                                ? money(payments[i].paid)
                                : "Indeterminado"}
                            </td>
                            <td>
                              {payments[i].known
                                ? money(payments[i].remaining)
                                : "Indeterminado"}
                            </td>
                            <td>
                              <Button
                                variant="ghost"
                                onClick={() => onEdit(o.id)}
                              >
                                Editar parcela
                              </Button>
                              <Button
                                variant="ghost"
                                onClick={() =>
                                  setReceipt({ kind: "operation", id: o.id })
                                }
                              >
                                Comprovantes (
                                {
                                  linked(s, { kind: "operation", id: o.id })
                                    .length
                                }
                                )
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <h3>Reembolsos vinculados</h3>
                  {l?.agreements
                    ?.filter((a) => a.purchaseId === p.id)
                    .map((a) => (
                      <p key={a.id}>
                        {a.terms.personLabel} · {a.operationIds.length}{" "}
                        previsões vinculadas
                      </p>
                    ))}
                  <Button
                    variant="outline"
                    onClick={() => setReceipt({ kind: "purchase", id: p.id })}
                  >
                    Comprovantes da compra (
                    {linked(s, { kind: "purchase", id: p.id }).length})
                  </Button>
                  <h3>Histórico preservado</h3>
                  {l?.corrections
                    .filter((c) => p.installmentIds.includes(c.operationId))
                    .map((c) => (
                      <p key={c.id}>
                        {c.at} · {c.reason}
                      </p>
                    ))}
                  {p.revisions?.map((r) => (
                    <p key={r.id}>
                      {r.at} · {r.reason} · anterior {money(r.previousCents)}
                    </p>
                  ))}
                  {l?.invoicePayments
                    .filter((pay) =>
                      l.invoices.some(
                        (inv) =>
                          inv.id === pay.invoiceId &&
                          inv.installmentIds.some((id) =>
                            p.installmentIds.includes(id),
                          ),
                      ),
                    )
                    .map((pay) => (
                      <p key={pay.id}>
                        {pay.date} · pagamento da fatura (não rateado):{" "}
                        {money(pay.amountCents)}{" "}
                        {pay.reversesId ? "· estorno" : ""}
                      </p>
                    ))}
                </details>
                <details className="contract-actions">
                  <summary aria-label={`Ações de ${name}`}>
                    <MoreHorizontal /> Ações
                  </summary>
                  <Button
                    variant="ghost"
                    onClick={() => {
                      const d = document.getElementById(
                        `purchase-details-${p.id}`,
                      ) as HTMLDetailsElement;
                      d.open = true;
                      d.scrollIntoView({ block: "nearest" });
                    }}
                  >
                    Visualizar detalhes e histórico
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => setReceipt({ kind: "purchase", id: p.id })}
                  >
                    Consultar comprovantes
                  </Button>
                  {manager(p.id)}
                </details>
              </article>
            ))}
            {legacyVisible.map((g) => (
              <article className="contract-card" key={"legacy:" + g.id}>
                <header>
                  <Layers />
                  <h2>{g.rows[0]?.description}</h2>
                </header>
                <p>
                  Registro anterior · classificação e pagamento individual não
                  disponíveis. Não incluído nos indicadores contratuais.
                </p>
                <details>
                  <summary>Consultar registros e vínculos</summary>
                  {onLegacyRows(g.rows)}
                </details>
                <details className="contract-actions">
                  <summary>
                    <MoreHorizontal /> Ações
                  </summary>
                  <Button
                    variant="destructive"
                    onClick={() => onDeleteGroup(g.id)}
                  >
                    Excluir grupo
                  </Button>
                </details>
              </article>
            ))}
            {!shown.length && !legacyVisible.length && (
              <div className="empty-state">
                <h2>Nenhum parcelamento encontrado.</h2>
                <p>Cadastre uma compra ou ajuste os filtros.</p>
                <Button onClick={() => onNew(false)}>
                  Cadastrar compra parcelada
                </Button>
              </div>
            )}
          </>
        ) : (
          <>
            {shownR.map((r) => {
              const next = r.occurrences
                .filter(
                  (x) =>
                    x.scheduledOn >= today &&
                    !l!.operations.find((o) => o.id === x.operationId)
                      ?.cancelled,
                )
                .sort((a, b) => a.scheduledOn.localeCompare(b.scheduledOn))[0];
              return (
                <article className="contract-card" key={r.id}>
                  <header>
                    <Repeat />
                    <div>
                      <h2>{r.description ?? "Recorrência sem descrição"}</h2>
                      <p>
                        {r.operationType === "income"
                          ? "Receita"
                          : r.operationType === "reimbursement"
                            ? "Reembolso"
                            : "Despesa"}{" "}
                        ·{" "}
                        {l?.categories.find((c) => c.id === r.categoryId)
                          ?.name ?? "Categoria não informada"}
                      </p>
                    </div>
                    <strong>{money(r.amountCents)}</strong>
                  </header>
                  <p>
                    {r.frequency === "annual" ? "Anual" : "Mensal"} ·{" "}
                    {
                      {
                        active: "Ativa",
                        paused: "Pausada",
                        cancelled: "Cancelada",
                        ended: "Encerrada",
                      }[r.displayStatus]
                    }{" "}
                    ·{" "}
                    {l?.cards.find((c) => c.id === r.cardId)?.name ??
                      l?.accounts.find((a) => a.id === r.accountId)?.name ??
                      "Origem não informada"}
                  </p>
                  <p>
                    Próxima ocorrência gerada:{" "}
                    {next?.scheduledOn ?? "Nenhuma disponível"} · Término:{" "}
                    {r.endsOn ?? "não definido"}
                  </p>
                  <details className="contract-actions">
                    <summary>
                      <MoreHorizontal /> Ocorrências, histórico e ações
                    </summary>
                    {manager(undefined, r.id)}
                    {r.events?.map((e) => (
                      <p key={e.id}>
                        {e.effectiveOn} · {e.kind}{" "}
                        {e.amountCents !== undefined
                          ? money(e.amountCents)
                          : ""}
                      </p>
                    ))}
                  </details>
                </article>
              );
            })}
            {!shownR.length && (
              <div className="empty-state">
                <h2>Nenhuma recorrência encontrada.</h2>
                <p>Cadastre uma recorrência ou ajuste os filtros.</p>
                <Button onClick={() => onNew(true)}>
                  Cadastrar recorrência
                </Button>
              </div>
            )}
          </>
        )}
      </div>
      {receipt && (
        <ReceiptManager
          state={s}
          target={receipt}
          onCommit={onCommit}
          onClose={() => setReceipt(undefined)}
        />
      )}
    </section>
  );
}
