"use client";

/* Modulo Tesouraria - Designer V1.2 F4 04. */

import { Icon } from "../Icon";
import { TESOURARIA_KPIS, TESOURARIA_TRANSACOES } from "../data";

const TIPO_COLOR = {
  entrada: { bg: "rgba(34,197,94,0.12)",  fg: "#16a34a", label: "Entrada" },
  saida:   { bg: "rgba(239,68,68,0.10)",  fg: "#dc2626", label: "Saída"   },
};

const STATUS_COLOR = {
  aprovado: { bg: "rgba(34,197,94,0.12)",  fg: "#16a34a" },
  pendente: { bg: "rgba(245,158,11,0.12)", fg: "#d97706" },
};

function fmtMoney(n) {
  const abs = Math.abs(n);
  const sign = n < 0 ? "− " : "";
  if (abs >= 1e6) return `${sign}R$ ${(abs / 1e6).toFixed(2).replace(".", ",")}M`;
  if (abs >= 1e3) return `${sign}R$ ${(abs / 1e3).toFixed(1).replace(".", ",")}k`;
  return `${sign}R$ ${abs.toLocaleString("pt-BR")}`;
}

export function Tesouraria() {
  return (
    <div className="bg-page-grad min-h-full">
      <div className="max-w-[1400px] mx-auto px-8 py-7">
        <div className="flex items-end justify-between mb-5">
          <div>
            <div className="text-[11px] t-fg-dim tracking-[0.18em] uppercase font-semibold">Tesouraria</div>
            <h1 className="text-[28px] font-display font-bold t-fg-strong mt-1 leading-none">Conta partidária · UB-SP</h1>
            <div className="text-[13px] t-fg-muted mt-1.5">CRC-SP · CNPJ 12.345.678/0001-90 · auditoria mensal · prestação TSE anual</div>
          </div>
          <div className="flex gap-2">
            <button className="btn-ghost" type="button"><Icon name="Download" size={13} />Extrato OFX</button>
            <button className="btn-primary" type="button"><Icon name="Plus" size={13} />Nova transação</button>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-3 mb-6">
          {TESOURARIA_KPIS.map((k) => (
            <div key={k.l} className="rounded-md p-4" style={{ background: "var(--bg-card)", border: "1px solid var(--rule)" }}>
              <div className="text-[9.5px] t-fg-faint uppercase tracking-[0.16em] font-bold">{k.l}</div>
              <div className="text-[24px] font-bold tabular-nums leading-none mt-1.5 t-fg-strong">{k.v}</div>
              <div
                className="text-[10.5px] mt-1"
                style={{
                  color:
                    k.ok === true  ? "var(--mz-ok, #22c55e)" :
                    k.ok === false ? "var(--mz-danger, #ef4444)" :
                    "var(--fg-muted)",
                }}
              >
                {k.d}
              </div>
            </div>
          ))}
        </div>

        <h2 className="text-[15px] font-bold t-fg-strong mb-3">Últimas transações</h2>

        <div className="rounded-lg overflow-hidden" style={{ background: "var(--bg-card)", border: "1px solid var(--rule)" }}>
          <div
            className="grid items-center gap-3 px-4 py-2.5 text-[10px] t-fg-faint tracking-[0.10em] uppercase font-bold border-b"
            style={{ gridTemplateColumns: "60px 90px 1fr 110px 100px 90px 60px", borderColor: "var(--rule)", background: "var(--bg-card-2)" }}
          >
            <span>Data</span>
            <span>Tipo</span>
            <span>Descrição</span>
            <span>Categoria</span>
            <span>Status</span>
            <span className="text-right">Valor</span>
            <span></span>
          </div>
          {TESOURARIA_TRANSACOES.map((t) => {
            const tc = TIPO_COLOR[t.tipo] || TIPO_COLOR.entrada;
            const sc = STATUS_COLOR[t.status] || STATUS_COLOR.pendente;
            return (
              <div
                key={t.id}
                className="grid items-center gap-3 px-4 py-3 border-b last:border-0 text-[12px]"
                style={{ gridTemplateColumns: "60px 90px 1fr 110px 100px 90px 60px", borderColor: "var(--rule)" }}
              >
                <span className="t-fg-faint tabular-nums">{t.data}</span>
                <span
                  className="text-[10px] font-bold px-2 py-[2px] rounded text-center"
                  style={{ background: tc.bg, color: tc.fg }}
                >
                  {tc.label}
                </span>
                <div className="min-w-0">
                  <div className="t-fg-strong font-semibold truncate">{t.descricao}</div>
                  <div className="text-[9.5px] t-fg-faint" style={{ fontFamily: "JetBrains Mono, monospace" }}>{t.id}</div>
                </div>
                <span className="t-fg-muted text-[11px]">{t.categoria}</span>
                <span
                  className="text-[10px] font-bold tracking-wider px-2 py-[2px] rounded text-center uppercase"
                  style={{ background: sc.bg, color: sc.fg }}
                >
                  {t.status}
                </span>
                <span
                  className="text-right font-bold tabular-nums"
                  style={{ color: t.tipo === "saida" ? "var(--mz-danger, #ef4444)" : "var(--mz-ok, #22c55e)" }}
                >
                  {fmtMoney(t.valor)}
                </span>
                <button className="btn-ghost text-[10px]" style={{ padding: "4px 8px" }} type="button">›</button>
              </div>
            );
          })}
        </div>

        <div
          className="mt-6 rounded-lg p-4 flex items-center gap-3 text-[12px] t-fg-muted"
          style={{ background: "var(--bg-card-2)", border: "1px dashed var(--rule)" }}
        >
          <Icon name="Sparkles" size={14} />
          <span>
            <b className="t-fg-strong">ETL pendente:</b> integração Open Banking (Itaú/BB) + categorização IA + reconciliação extrato.
            Designer V1.2 entregou layout completo · backend de Tesouraria a construir.
          </span>
        </div>
      </div>
    </div>
  );
}
