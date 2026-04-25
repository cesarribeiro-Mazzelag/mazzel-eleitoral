"use client";

/* Campanha 2026 · Tela 9 · Afiliados (gestao partidaria).
 * Adaptado de Plataforma-v2.html Tela9Afiliados.
 * 6 sub-abas: Filiacao · Financeiro · Treinamento · Comunicacao · Demografia · Saude. */

import { useState } from "react";
import { Icon } from "../../Icon";
import { Card, ProgressBar } from "./primitives";

const KPIS = {
  total: 47382,
  ativos: 38219,
  inativos: 9163,
  novos30d: 892,
  churn30d: 214,
  diretoriosAtivos: 182,
  diretoriosTotais: 204,
};

const FILIADOS = [
  { nome: "Carlos Eduardo Silva",      cpf: "***.***.***-12", cidade: "Salvador",       status: "ativo",    desde: "2019-03", pago: true,  treinamentos: 4, tags: ["Liderança","Jovem"] },
  { nome: "Maria das Graças Oliveira", cpf: "***.***.***-34", cidade: "Feira de S.",    status: "ativo",    desde: "2021-07", pago: true,  treinamentos: 2, tags: ["Mulher","Diretoria local"] },
  { nome: "João Pedro Santos",         cpf: "***.***.***-56", cidade: "Ilhéus",         status: "inativo",  desde: "2016-11", pago: false, treinamentos: 0, tags: [] },
  { nome: "Ana Beatriz Costa",         cpf: "***.***.***-78", cidade: "Vitória da C.",  status: "ativo",    desde: "2023-01", pago: true,  treinamentos: 5, tags: ["Jovem","Tech"] },
  { nome: "Roberto Almeida",           cpf: "***.***.***-90", cidade: "Barreiras",      status: "ativo",    desde: "2018-05", pago: false, treinamentos: 1, tags: ["Rural"] },
  { nome: "Fernanda Lima",             cpf: "***.***.***-11", cidade: "Salvador",       status: "suspenso", desde: "2020-02", pago: false, treinamentos: 0, tags: ["Investigação"] },
  { nome: "Pedro Henrique Rocha",      cpf: "***.***.***-22", cidade: "Juazeiro",       status: "ativo",    desde: "2022-09", pago: true,  treinamentos: 3, tags: ["Jovem"] },
  { nome: "Luciana Barbosa",           cpf: "***.***.***-33", cidade: "Porto Seguro",   status: "ativo",    desde: "2017-06", pago: true,  treinamentos: 6, tags: ["Mulher","Liderança"] },
];

const REPASSES = [
  { mes: "Jan/26", fundoPart: 1842000, fundoEsp:  620000, doacoes: 185400, diretorios: 204, total: 2647400 },
  { mes: "Dez/25", fundoPart: 1842000, fundoEsp:       0, doacoes: 212100, diretorios: 204, total: 2054100 },
  { mes: "Nov/25", fundoPart: 1842000, fundoEsp:       0, doacoes: 148700, diretorios: 204, total: 1990700 },
  { mes: "Out/25", fundoPart: 1842000, fundoEsp: 1240000, doacoes: 412800, diretorios: 204, total: 3494800 },
  { mes: "Set/25", fundoPart: 1842000, fundoEsp:       0, doacoes: 198200, diretorios: 203, total: 2040200 },
  { mes: "Ago/25", fundoPart: 1842000, fundoEsp:       0, doacoes: 176500, diretorios: 203, total: 2018500 },
];

const TREINAMENTOS = [
  { curso: "Escola de Líderes · Módulo I",  inscritos: 312, concluintes: 287, nps: 87, prox: "15/Abr" },
  { curso: "Marketing Político Digital",    inscritos: 208, concluintes: 174, nps: 82, prox: "22/Abr" },
  { curso: "Oratória para Candidatos",      inscritos: 156, concluintes: 142, nps: 91, prox: "03/Mai" },
  { curso: "Legislação Eleitoral 2026",     inscritos: 429, concluintes: 381, nps: 78, prox: "10/Mai" },
  { curso: "Fundraising e Compliance",      inscritos:  94, concluintes:  81, nps: 85, prox: "18/Mai" },
];

const COMUNICACOES = [
  { assunto: "Convite Congresso Estadual 2026", canal: "E-mail + WhatsApp", enviados: 47382, aberturas: 28429, cliques:  9874, quando: "há 2 dias" },
  { assunto: "Boleto mensal Jan/26",            canal: "E-mail + SMS",      enviados: 47382, aberturas: 38217, cliques: 31254, quando: "há 5 dias" },
  { assunto: "Curso novo: Escola de Líderes",   canal: "WhatsApp",          enviados: 12043, aberturas:  8921, cliques:  3184, quando: "há 8 dias" },
  { assunto: "Campanha Filie-se · Q1",          canal: "E-mail + Push",     enviados: 47382, aberturas: 22104, cliques:  4821, quando: "há 12 dias" },
];

const DEMOGRAFIA = {
  genero:      [{ k: "Masculino", v: 58 }, { k: "Feminino", v: 41 }, { k: "Não-binário", v: 1 }],
  idade:       [{ k: "18-24", v: 12 }, { k: "25-34", v: 22 }, { k: "35-44", v: 28 }, { k: "45-54", v: 20 }, { k: "55+", v: 18 }],
  regiao:      [{ k: "Capital", v: 41 }, { k: "Int. Sul", v: 18 }, { k: "Int. Norte", v: 14 }, { k: "Recôncavo", v: 17 }, { k: "Oeste", v: 10 }],
  escolaridade:[{ k: "Superior compl.", v: 32 }, { k: "Superior incompl.", v: 18 }, { k: "Médio compl.", v: 34 }, { k: "Médio incompl.", v: 12 }, { k: "Fundamental", v: 4 }],
};

const SAUDE_META = [
  { rotulo: "Taxa de inadimplência",        valor: "9,3%",  sub: "meta <8%",           tone: "warn" },
  { rotulo: "Engajamento 30d",              valor: "62%",   sub: "abriu/clicou algo",  tone: "ok" },
  { rotulo: "NPS interno",                  valor: "71",    sub: "sobre o diretório",  tone: "ok" },
  { rotulo: "Diretórios ativos",            valor: `${KPIS.diretoriosAtivos}/${KPIS.diretoriosTotais}`, sub: "≥ 1 evento no mês", tone: "ok" },
];

const TABS = [
  { k: "filiacao",    l: "Filiação" },
  { k: "financeiro",  l: "Financeiro" },
  { k: "treinamento", l: "Treinamento" },
  { k: "comunicacao", l: "Comunicação" },
  { k: "demografia",  l: "Demografia" },
  { k: "saude",       l: "Saúde" },
];

function fmtMoney(n) {
  if (n >= 1e6) return `R$ ${(n / 1e6).toFixed(1).replace(".", ",")}M`;
  if (n >= 1e3) return `R$ ${(n / 1e3).toFixed(0)}k`;
  return `R$ ${Number(n).toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function StatusChip({ status }) {
  const map = {
    ativo:    { cls: "chip-green", label: "ativo" },
    inativo:  { cls: "chip-muted", label: "inativo" },
    suspenso: { cls: "chip-red",   label: "suspenso" },
  };
  const s = map[status] || map.inativo;
  return <span className={`chip ${s.cls}`} style={{ height: 18, fontSize: 9.5 }}>{s.label}</span>;
}

function Tile({ label, value, sub, color }) {
  return (
    <Card>
      <div className="text-[10px] t-fg-dim uppercase tracking-wider font-semibold mb-1">{label}</div>
      <div className="text-[26px] font-black tnum font-display" style={{ color: color || "var(--fg-strong)" }}>{value}</div>
      <div className="text-[10px] t-fg-muted mt-0.5">{sub}</div>
    </Card>
  );
}

function DistribBar({ data, color }) {
  return (
    <div className="space-y-2">
      {data.map((d) => (
        <div key={d.k} className="flex items-center gap-3 text-[11.5px]">
          <div className="w-[140px] t-fg truncate">{d.k}</div>
          <div className="flex-1">
            <ProgressBar value={d.v} color={color || "var(--accent-blue-strong)"} height={8} />
          </div>
          <div className="w-10 text-right tnum font-bold t-fg-strong">{d.v}%</div>
        </div>
      ))}
    </div>
  );
}

export function Tela9Afiliados() {
  const [tab, setTab] = useState("filiacao");

  return (
    <div className="p-6 space-y-5" style={{ maxWidth: 1680, margin: "0 auto" }}>
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-[22px] font-black font-display t-fg-strong">Afiliados</h1>
          <div className="text-[12px] t-fg-muted mt-0.5">
            Gestão partidária · base de {KPIS.total.toLocaleString("pt-BR")} filiados
          </div>
        </div>
        <div className="flex gap-2">
          <button className="btn-ghost" type="button"><Icon name="Download" size={11} />Exportar base</button>
          <button className="btn-primary" type="button"><Icon name="Plus" size={11} />Novo filiado</button>
        </div>
      </div>

      {/* KPIs topo */}
      <div className="grid grid-cols-4 gap-3">
        <Tile label="Total"            value={KPIS.total.toLocaleString("pt-BR")} sub={`${KPIS.ativos.toLocaleString("pt-BR")} ativos`} />
        <Tile label="Novos 30d"        value={`+${KPIS.novos30d}`} sub={`churn ${KPIS.churn30d}`} color="var(--ok)" />
        <Tile label="Taxa de retenção" value="94,2%" sub="+0,8pp mês" color="var(--ok)" />
        <Tile label="Diretórios"       value={`${KPIS.diretoriosAtivos}/${KPIS.diretoriosTotais}`} sub="ativos/totais" />
      </div>

      <div className="flex gap-1 text-sm" style={{ borderBottom: "1px solid var(--rule)" }}>
        {TABS.map((t) => (
          <button
            key={t.k}
            onClick={() => setTab(t.k)}
            className="px-4 py-2"
            style={{
              borderBottom: `2px solid ${tab === t.k ? "var(--accent-blue-strong)" : "transparent"}`,
              color: tab === t.k ? "var(--fg-strong)" : "var(--fg-muted)",
              fontWeight: 600,
            }}
            type="button"
          >
            {t.l}
          </button>
        ))}
      </div>

      {tab === "filiacao" && (
        <Card title="Base de filiados" sub={`${FILIADOS.length} recentes · ${KPIS.total.toLocaleString("pt-BR")} no total`} noPadding>
          <div
            className="grid items-center gap-3 px-4 py-2"
            style={{
              gridTemplateColumns: "1fr 140px 120px 90px 100px 90px 80px",
              background: "var(--bg-card-2)",
              fontWeight: 600,
              color: "var(--fg-dim)",
              fontSize: 10.5,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              borderBottom: "1px solid var(--rule)",
            }}
          >
            <div>Nome</div>
            <div>CPF</div>
            <div>Cidade</div>
            <div>Status</div>
            <div>Desde</div>
            <div>Pago</div>
            <div className="text-right">Cursos</div>
          </div>
          {FILIADOS.map((f, i) => (
            <div
              key={i}
              className="grid items-center gap-3 px-4 py-2.5 text-[12px]"
              style={{
                gridTemplateColumns: "1fr 140px 120px 90px 100px 90px 80px",
                borderBottom: "1px solid var(--rule)",
              }}
            >
              <div>
                <div className="font-semibold t-fg-strong">{f.nome}</div>
                <div className="text-[10px] t-fg-dim">{f.tags.join(" · ")}</div>
              </div>
              <div className="t-fg-muted tnum">{f.cpf}</div>
              <div className="t-fg-muted">{f.cidade}</div>
              <div><StatusChip status={f.status} /></div>
              <div className="t-fg-muted tnum">{f.desde}</div>
              <div>
                <span
                  className={`chip ${f.pago ? "chip-green" : "chip-red"}`}
                  style={{ height: 18, fontSize: 9.5 }}
                >
                  {f.pago ? "em dia" : "atraso"}
                </span>
              </div>
              <div className="text-right tnum font-bold t-fg-strong">{f.treinamentos}</div>
            </div>
          ))}
        </Card>
      )}

      {tab === "financeiro" && (
        <Card title="Repasses e arrecadação" sub="Fundo Partidário · Fundo Especial · Doações · Diretórios" noPadding>
          <div
            className="grid items-center gap-3 px-4 py-2"
            style={{
              gridTemplateColumns: "100px 1fr 1fr 1fr 100px 1fr",
              background: "var(--bg-card-2)",
              fontWeight: 600,
              color: "var(--fg-dim)",
              fontSize: 10.5,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              borderBottom: "1px solid var(--rule)",
            }}
          >
            <div>Mês</div>
            <div className="text-right">Fundo Part.</div>
            <div className="text-right">Fundo Esp.</div>
            <div className="text-right">Doações</div>
            <div className="text-right">Diretórios</div>
            <div className="text-right">Total</div>
          </div>
          {REPASSES.map((r, i) => (
            <div
              key={i}
              className="grid items-center gap-3 px-4 py-2.5 text-[12px] tnum"
              style={{
                gridTemplateColumns: "100px 1fr 1fr 1fr 100px 1fr",
                borderBottom: "1px solid var(--rule)",
              }}
            >
              <div className="font-semibold t-fg-strong">{r.mes}</div>
              <div className="text-right t-fg">{fmtMoney(r.fundoPart)}</div>
              <div className="text-right t-fg">{fmtMoney(r.fundoEsp)}</div>
              <div className="text-right t-fg">{fmtMoney(r.doacoes)}</div>
              <div className="text-right t-fg-muted">{r.diretorios}</div>
              <div className="text-right font-bold t-fg-strong">{fmtMoney(r.total)}</div>
            </div>
          ))}
        </Card>
      )}

      {tab === "treinamento" && (
        <div className="grid grid-cols-2 gap-3">
          {TREINAMENTOS.map((c, i) => {
            const pct = Math.round((c.concluintes / c.inscritos) * 100);
            const npsColor = c.nps >= 80 ? "var(--ok)" : c.nps >= 70 ? "var(--warn)" : "var(--danger)";
            return (
              <Card key={i}>
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <div className="text-[10px] uppercase tracking-wider t-fg-dim">Curso</div>
                    <div className="font-semibold text-[13px] mt-0.5 t-fg-strong">{c.curso}</div>
                  </div>
                  <span className="chip chip-muted" style={{ height: 18, fontSize: 9 }}>{c.prox}</span>
                </div>
                <div className="flex items-center gap-3 text-[11px] t-fg-muted mb-2">
                  <span>{c.inscritos} inscritos</span>
                  <span>·</span>
                  <span>{c.concluintes} concluintes</span>
                  <span>·</span>
                  <span style={{ color: npsColor }}>NPS {c.nps}</span>
                </div>
                <ProgressBar value={pct} color="var(--accent-blue-strong)" height={6} />
                <div className="text-right mt-1 text-[10px] tnum t-fg-muted">{pct}% concluintes</div>
              </Card>
            );
          })}
        </div>
      )}

      {tab === "comunicacao" && (
        <Card title="Campanhas de comunicação" sub="E-mail · WhatsApp · SMS · Push" noPadding>
          <div
            className="grid items-center gap-3 px-4 py-2"
            style={{
              gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr 100px",
              background: "var(--bg-card-2)",
              fontWeight: 600,
              color: "var(--fg-dim)",
              fontSize: 10.5,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              borderBottom: "1px solid var(--rule)",
            }}
          >
            <div>Assunto</div>
            <div>Canal</div>
            <div className="text-right">Enviados</div>
            <div className="text-right">Aberturas</div>
            <div className="text-right">Cliques</div>
            <div className="text-right">Quando</div>
          </div>
          {COMUNICACOES.map((c, i) => {
            const aberturaPct = Math.round((c.aberturas / c.enviados) * 100);
            const cliquePct = Math.round((c.cliques / c.enviados) * 100);
            return (
              <div
                key={i}
                className="grid items-center gap-3 px-4 py-2.5 text-[12px]"
                style={{
                  gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr 100px",
                  borderBottom: "1px solid var(--rule)",
                }}
              >
                <div className="font-semibold t-fg-strong">{c.assunto}</div>
                <div className="t-fg-muted">{c.canal}</div>
                <div className="text-right tnum t-fg">{c.enviados.toLocaleString("pt-BR")}</div>
                <div className="text-right tnum t-fg">
                  {c.aberturas.toLocaleString("pt-BR")} <span className="t-fg-dim">· {aberturaPct}%</span>
                </div>
                <div className="text-right tnum t-fg">
                  {c.cliques.toLocaleString("pt-BR")} <span className="t-fg-dim">· {cliquePct}%</span>
                </div>
                <div className="text-right t-fg-muted text-[11px]">{c.quando}</div>
              </div>
            );
          })}
        </Card>
      )}

      {tab === "demografia" && (
        <div className="grid grid-cols-2 gap-4">
          <Card title="Gênero" sub="Distribuição da base">
            <DistribBar data={DEMOGRAFIA.genero} color="var(--tenant-primary)" />
          </Card>
          <Card title="Faixa etária" sub="Distribuição etária">
            <DistribBar data={DEMOGRAFIA.idade} color="var(--accent-blue-strong)" />
          </Card>
          <Card title="Região" sub="Concentração territorial">
            <DistribBar data={DEMOGRAFIA.regiao} color="var(--ok)" />
          </Card>
          <Card title="Escolaridade" sub="Grau de instrução">
            <DistribBar data={DEMOGRAFIA.escolaridade} color="var(--warn)" />
          </Card>
        </div>
      )}

      {tab === "saude" && (
        <div className="grid grid-cols-4 gap-3">
          {SAUDE_META.map((m, i) => {
            const color =
              m.tone === "ok"     ? "var(--ok)" :
              m.tone === "warn"   ? "var(--warn)" :
              m.tone === "danger" ? "var(--danger)" : "var(--fg-strong)";
            return <Tile key={i} label={m.rotulo} value={m.valor} sub={m.sub} color={color} />;
          })}
        </div>
      )}
    </div>
  );
}
