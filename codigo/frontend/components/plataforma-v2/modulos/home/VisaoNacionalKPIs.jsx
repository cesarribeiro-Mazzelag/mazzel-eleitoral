"use client";

/**
 * VisaoNacionalKPIs - Secao "Visao Nacional" para a home da plataforma V2.
 *
 * Busca /dashboard/visao-geral?anos=2024 e ?anos=2022 em paralelo.
 * Exibe: blocos de eleicao por ciclo (tabela por cargo) + KPIs de presenca
 * nacional (eleitos, municipios, estados, partidos) + top estados/top partidos
 * em graficos de barra horizontais.
 *
 * Usa o token via localStorage (padrao da plataforma) pelo fetchJson do api.js.
 */

import { useEffect, useState, useCallback } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from "recharts";
import { fetchJson } from "../../api";

// ── Helpers ──────────────────────────────────────────────────────────────────

function fmtNum(n) {
  if (n == null) return "-";
  return Number(n).toLocaleString("pt-BR");
}

function fmtPct(n) {
  if (n == null) return "-";
  return `${Number(n).toFixed(1).replace(".", ",")}%`;
}

// ── Cores e labels de cargo ───────────────────────────────────────────────────

const CORES_CARGO = {
  "PRESIDENTE":         "#7C3AED",
  "GOVERNADOR":         "#5B21B6",
  "SENADOR":            "#0369A1",
  "DEPUTADO FEDERAL":   "#0891B2",
  "DEPUTADO ESTADUAL":  "#0E7490",
  "DEPUTADO DISTRITAL": "#0F766E",
  "PREFEITO":           "#B45309",
  "VEREADOR":           "#1D4ED8",
};

const LABEL_CARGO = {
  "PRESIDENTE":         "Presidente",
  "GOVERNADOR":         "Governador",
  "SENADOR":            "Senador",
  "DEPUTADO FEDERAL":   "Dep. Federal",
  "DEPUTADO ESTADUAL":  "Dep. Estadual",
  "DEPUTADO DISTRITAL": "Dep. Distrital",
  "PREFEITO":           "Prefeito",
  "VEREADOR":           "Vereador",
};

// ── Linha de cargo ────────────────────────────────────────────────────────────

function LinhaCargo({ cargo, eleitos, candidatos }) {
  const cor   = CORES_CARGO[cargo] ?? "#6B7280";
  const label = LABEL_CARGO[cargo] ?? cargo;
  const taxa  = candidatos > 0 ? (eleitos / candidatos) * 100 : 0;

  return (
    <tr className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50 transition-colors">
      <td className="py-2.5 px-4">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: cor }} />
          <span className="text-[12px] font-semibold t-fg-strong">{label}</span>
        </div>
      </td>
      <td className="py-2.5 px-4 text-right">
        <span className="text-[13px] font-black t-fg-strong">{fmtNum(eleitos)}</span>
      </td>
      <td className="py-2.5 px-4 text-right">
        <span className="text-[11px] t-fg-dim">{fmtNum(candidatos)}</span>
      </td>
      <td className="py-2.5 px-4 text-right">
        <span
          className="text-[11px] font-semibold"
          style={{ color: taxa > 20 ? "#16A34A" : taxa > 10 ? "#B45309" : "#6B7280" }}
        >
          {taxa.toFixed(1).replace(".", ",")}%
        </span>
      </td>
      <td className="py-2.5 px-3 w-[80px]">
        <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "var(--rule)" }}>
          <div
            className="h-full rounded-full"
            style={{ width: `${Math.min(taxa, 100)}%`, background: cor }}
          />
        </div>
      </td>
    </tr>
  );
}

// ── Bloco de eleicao (cabecalho colorido + tabela) ────────────────────────────

function BlocoEleicao({ ano, tipo, dados, loading }) {
  const isMunicipal = tipo === "municipal";
  const gradiente   = isMunicipal
    ? "linear-gradient(135deg, #92400e 0%, #b45309 100%)"
    : "linear-gradient(135deg, #4c1d95 0%, #6d28d9 100%)";

  const bn      = dados?.big_numbers ?? {};
  const porCargo = dados?.por_cargo ?? [];

  return (
    <div className="t-bg-card ring-soft rounded-xl overflow-hidden flex flex-col">
      {/* cabecalho */}
      <div className="px-5 py-4" style={{ background: gradiente }}>
        <div className="text-[10px] text-white/60 uppercase tracking-widest font-bold mb-0.5">
          {isMunicipal ? "Eleicoes Municipais" : "Eleicoes Gerais"}
        </div>
        <div className="text-[26px] font-display font-bold text-white leading-none mb-3">{ano}</div>
        {loading ? (
          <div className="flex gap-4 animate-pulse">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white/10 rounded-lg w-20 h-9" />
            ))}
          </div>
        ) : (
          <div className="flex flex-wrap gap-x-5 gap-y-1">
            <StatHeader label="Eleitos"       value={fmtNum(bn.total_eleitos)} />
            <div className="w-px h-7 bg-white/20 self-center" />
            <StatHeader label="Candidatos"    value={fmtNum(bn.total_candidatos)} />
            <div className="w-px h-7 bg-white/20 self-center" />
            <StatHeader label="Taxa de eleicao" value={fmtPct(bn.taxa_eleicao)} />
          </div>
        )}
      </div>

      {/* tabela de cargos */}
      <div className="flex-1 overflow-x-auto">
        {loading ? (
          <div className="p-4 space-y-2 animate-pulse">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-8 rounded-lg" style={{ background: "var(--rule)" }} />
            ))}
          </div>
        ) : porCargo.length > 0 ? (
          <table className="w-full">
            <thead>
              <tr className="border-b" style={{ borderColor: "var(--rule)" }}>
                {["Cargo", "Eleitos", "Candidatos", "Taxa", ""].map((h, i) => (
                  <th
                    key={i}
                    className={`py-2 px-4 text-[10px] font-bold uppercase tracking-wider t-fg-dim ${i > 0 && i < 4 ? "text-right" : "text-left"}`}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {porCargo.map((c) => (
                <LinhaCargo key={c.cargo} {...c} />
              ))}
            </tbody>
          </table>
        ) : (
          <p className="text-center t-fg-dim text-[12px] py-8">
            Sem dados para {ano}
          </p>
        )}
      </div>

      {/* rodape com estatisticas */}
      {!loading && (bn.total_eleitos ?? 0) > 0 && (
        <div
          className="px-4 py-2.5 border-t flex flex-wrap gap-x-4 gap-y-0.5 text-[11px] t-fg-dim"
          style={{ borderColor: "var(--rule)" }}
        >
          {(bn.municipios_com_eleito ?? 0) > 0 && (
            <span>
              <strong className="t-fg-strong">{fmtNum(bn.municipios_com_eleito)}</strong> municipios com eleitos
            </span>
          )}
          {(bn.pct_mulheres_eleitas ?? 0) > 0 && (
            <span>
              <strong className="t-fg-strong">{fmtPct(bn.pct_mulheres_eleitas)}</strong> mulheres eleitas
            </span>
          )}
          {(bn.partidos_com_eleitos ?? 0) > 0 && (
            <span>
              <strong className="t-fg-strong">{bn.partidos_com_eleitos}</strong> partidos com eleitos
            </span>
          )}
          {(bn.estados_com_eleito ?? 0) > 0 && (
            <span>
              <strong className="t-fg-strong">{bn.estados_com_eleito}</strong> estados
            </span>
          )}
        </div>
      )}
    </div>
  );
}

function StatHeader({ label, value }) {
  return (
    <div>
      <div className="text-[15px] font-bold text-white leading-none">{value}</div>
      <div className="text-[10px] text-white/55 leading-tight mt-0.5">{label}</div>
    </div>
  );
}

// ── Card KPI de presenca ──────────────────────────────────────────────────────

function CardKPI({ icon, cor, valor, label, hint, pct }) {
  return (
    <div className="t-bg-card ring-soft rounded-xl p-4 flex items-start gap-3">
      <div
        className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 text-[15px]"
        style={{ background: cor + "22" }}
      >
        <span>{icon}</span>
      </div>
      <div className="flex-1 min-w-0">
        <div
          className="text-[28px] font-display font-bold leading-none tnum"
          style={{
            backgroundImage: `linear-gradient(180deg, ${cor}, ${cor}99)`,
            WebkitBackgroundClip: "text",
            backgroundClip: "text",
            color: "transparent",
          }}
        >
          {valor}
        </div>
        <div className="text-[11px] t-fg-dim mt-1">{label}</div>
        {hint && <div className="text-[10px] t-fg-dim mt-0.5 opacity-70 truncate">{hint}</div>}
      </div>
      {pct != null && (
        <div className="text-right flex-shrink-0">
          <div className="text-[14px] font-bold" style={{ color: cor }}>{fmtPct(pct)}</div>
          <div className="text-[9px] t-fg-dim">do total</div>
        </div>
      )}
    </div>
  );
}

// ── Grafico de barras horizontais (estados ou partidos) ───────────────────────

function GraficoHorizontal({ titulo, subtitulo, dados2024, dados2022, chave, labelFn, loading }) {
  const mapa = {};
  (dados2024?.[chave] ?? []).forEach((e) => {
    const k = labelFn(e);
    mapa[k] = { key: k, v24: e.eleitos ?? 0, v22: 0 };
  });
  (dados2022?.[chave] ?? []).forEach((e) => {
    const k = labelFn(e);
    if (!mapa[k]) mapa[k] = { key: k, v24: 0, v22: 0 };
    mapa[k].v22 = e.eleitos ?? 0;
  });

  const data = Object.values(mapa)
    .sort((a, b) => (b.v24 + b.v22) - (a.v24 + a.v22))
    .slice(0, 12);

  if (loading) {
    return (
      <div className="t-bg-card ring-soft rounded-xl p-5 animate-pulse">
        <div className="h-3 rounded w-1/3 mb-3" style={{ background: "var(--rule)" }} />
        <div className="h-48 rounded-lg" style={{ background: "var(--rule)" }} />
      </div>
    );
  }

  return (
    <div className="t-bg-card ring-soft rounded-xl p-5">
      <div className="text-[10.5px] t-fg-dim uppercase tracking-[0.14em] font-semibold mb-0.5">{titulo}</div>
      <div className="text-[14px] font-bold t-fg-strong mb-3">{subtitulo}</div>
      <div className="flex items-center gap-4 mb-3 text-[10px] t-fg-dim">
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-2 rounded-sm" style={{ background: "#B45309" }} />
          2024 Municipal
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-2 rounded-sm" style={{ background: "#7C3AED" }} />
          2022 Geral
        </span>
      </div>
      <ResponsiveContainer width="100%" height={260}>
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 0, right: 24, left: 0, bottom: 0 }}
          barSize={7}
          barGap={2}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="var(--rule)" horizontal={false} />
          <XAxis
            type="number"
            tick={{ fontSize: 10, fill: "var(--t-fg-dim, #6B7280)" }}
            tickFormatter={(v) => fmtNum(v)}
          />
          <YAxis
            type="category"
            dataKey="key"
            tick={{ fontSize: 10, fill: "var(--t-fg, #374151)" }}
            width={40}
          />
          <Tooltip
            formatter={(v, name) => [fmtNum(v), name === "v24" ? "2024 Municipal" : "2022 Geral"]}
            contentStyle={{ borderRadius: 10, fontSize: 11 }}
          />
          <Bar dataKey="v24" fill="#B45309" radius={[0, 3, 3, 0]} />
          <Bar dataKey="v22" fill="#7C3AED" radius={[0, 3, 3, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ── Componente exportado ──────────────────────────────────────────────────────

export function VisaoNacionalKPIs() {
  const [dados2024, setDados2024] = useState(null);
  const [dados2022, setDados2022] = useState(null);
  const [loading,   setLoading]   = useState(true);
  const [erro,      setErro]      = useState(null);

  const carregar = useCallback(async () => {
    setLoading(true);
    setErro(null);
    try {
      const [d24, d22] = await Promise.all([
        fetchJson("/dashboard/visao-geral?anos=2024"),
        fetchJson("/dashboard/visao-geral?anos=2022"),
      ]);
      setDados2024(d24);
      setDados2022(d22);
    } catch {
      setErro("Nao foi possivel carregar os dados nacionais.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  const bn24 = dados2024?.big_numbers ?? {};
  const bn22 = dados2022?.big_numbers ?? {};

  const totalEleitos   = (bn24.total_eleitos ?? 0) + (bn22.total_eleitos ?? 0);
  const totalMunicipios = bn24.total_municipios ?? 5569;
  const pctMunicipios  = totalMunicipios > 0
    ? (bn24.municipios_com_eleito ?? 0) / totalMunicipios * 100
    : null;

  return (
    <section>
      {/* cabecalho da secao */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="text-[10.5px] t-fg-dim uppercase tracking-[0.14em] font-semibold">Dados TSE</div>
          <div className="text-[20px] font-display font-bold t-fg-strong leading-tight">
            Visao Nacional
          </div>
        </div>
        <button
          onClick={carregar}
          disabled={loading}
          className="btn-ghost disabled:opacity-50"
          type="button"
        >
          {loading ? "Carregando..." : "Atualizar"}
        </button>
      </div>

      {/* erro */}
      {erro && (
        <div
          className="mb-4 rounded-lg px-4 py-2.5 text-[12px]"
          style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.3)" }}
        >
          {erro}
        </div>
      )}

      {/* aviso de ciclos diferentes */}
      <div
        className="mb-5 rounded-lg px-4 py-2.5 flex items-start gap-2 text-[11px]"
        style={{ background: "rgba(251,191,36,0.07)", border: "1px solid rgba(251,191,36,0.3)" }}
      >
        <span className="t-warn mt-0.5">⚠</span>
        <span className="t-fg-muted">
          <strong className="t-fg">Ciclos separados:</strong> Municipais (Prefeito/Vereador · 2024) e Gerais
          (Dep./Sen./Gov. · 2022) nao sao comparaveis entre si.
        </span>
      </div>

      {/* dois blocos: municipal 2024 + geral 2022 */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-3 mb-5">
        <BlocoEleicao ano="2024" tipo="municipal" dados={dados2024} loading={loading} />
        <BlocoEleicao ano="2022" tipo="geral"     dados={dados2022} loading={loading} />
      </div>

      {/* KPIs de presenca */}
      <div className="text-[10.5px] t-fg-dim uppercase tracking-[0.14em] font-semibold mb-3">
        Presenca Nacional
      </div>
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 mb-5">
        <CardKPI
          icon="🏆"
          cor="#7C3AED"
          valor={loading ? "..." : fmtNum(totalEleitos)}
          label="Total de eleitos (2022+2024)"
          hint={loading ? null : `${fmtNum(bn22.estados_com_eleito)} estados com eleitos`}
        />
        <CardKPI
          icon="🏛"
          cor="#B45309"
          valor={loading ? "..." : fmtNum(bn24.municipios_com_eleito)}
          label="Municipios com eleitos em 2024"
          hint={loading ? null : `de ${fmtNum(totalMunicipios)} municipios`}
          pct={pctMunicipios}
        />
        <CardKPI
          icon="📍"
          cor="#0369A1"
          valor={loading ? "..." : fmtNum(bn22.estados_com_eleito)}
          label="Estados com eleitos em 2022"
          hint="De 27 unidades federativas"
          pct={bn22.estados_com_eleito > 0 ? (bn22.estados_com_eleito / 27 * 100) : null}
        />
        <CardKPI
          icon="🤝"
          cor="#0E7490"
          valor={loading ? "..." : fmtNum((bn24.partidos_com_eleitos ?? 0) + (bn22.partidos_com_eleitos ?? 0))}
          label="Partidos com eleitos"
          hint="Soma dos dois ciclos eleitorais"
        />
      </div>

      {/* graficos: top estados + top partidos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <GraficoHorizontal
          titulo="Distribuicao regional"
          subtitulo="Top Estados por Eleitos"
          dados2024={dados2024}
          dados2022={dados2022}
          chave="por_estado"
          labelFn={(e) => e.estado}
          loading={loading}
        />
        <GraficoHorizontal
          titulo="Forcas partidarias"
          subtitulo="Top Partidos por Eleitos"
          dados2024={dados2024}
          dados2022={dados2022}
          chave="por_partido"
          labelFn={(e) => e.sigla}
          loading={loading}
        />
      </div>
    </section>
  );
}
