"use client";
/**
 * Dashboard — Inteligência Eleitoral Nacional
 * Ciclos eleitorais separados: Municipais (2024) | Gerais (2022)
 */
import { useEffect, useState, useCallback } from "react";
import {
  Users, DollarSign, Award, RefreshCw, Globe, Building2,
  BarChart2, MapPin, TrendingUp, UserCheck, AlertTriangle,
  Percent, Flag, Star,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, PieChart, Pie, Legend,
} from "recharts";
import { AppLayout } from "@/components/layout/AppLayout";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8002";

function token() {
  if (typeof window === "undefined") return "";
  return localStorage.getItem("ub_token") ?? "";
}

async function apiFetch(path, params = {}) {
  const qs = new URLSearchParams(
    Object.fromEntries(Object.entries(params).filter(([, v]) => v != null && v !== ""))
  ).toString();
  const url = `${API}${path}${qs ? "?" + qs : ""}`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token()}` } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

function fmtNum(n) {
  if (n == null) return "—";
  return Number(n).toLocaleString("pt-BR");
}

function fmtMoeda(n) {
  if (!n) return "R$ 0";
  return `R$ ${Number(n).toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function fmtPct(n) {
  if (n == null) return "—";
  return `${Number(n).toFixed(1)}%`;
}

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

// ── Linha da tabela por cargo ─────────────────────────────────────────────────
function LinhaCargoTabela({ cargo, eleitos, candidatos }) {
  const cor = CORES_CARGO[cargo] ?? "#6B7280";
  const label = LABEL_CARGO[cargo] ?? cargo;
  const taxa = candidatos > 0 ? (eleitos / candidatos) * 100 : 0;

  return (
    <tr className="border-b border-gray-50 hover:bg-gray-50/60 transition-colors">
      <td className="py-3 px-4">
        <div className="flex items-center gap-2.5">
          <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: cor }} />
          <span className="text-sm font-semibold text-gray-800">{label}</span>
        </div>
      </td>
      <td className="py-3 px-4 text-right">
        <span className="text-sm font-black text-gray-900">{fmtNum(eleitos)}</span>
      </td>
      <td className="py-3 px-4 text-right">
        <span className="text-xs text-gray-500">{fmtNum(candidatos)}</span>
      </td>
      <td className="py-3 px-4 text-right">
        <span className="text-xs font-semibold" style={{ color: taxa > 20 ? "#16A34A" : taxa > 10 ? "#B45309" : "#6B7280" }}>
          {taxa.toFixed(1)}%
        </span>
      </td>
      <td className="py-3 px-4">
        <div className="flex items-center gap-2">
          <div className="flex-1 bg-gray-100 rounded-full h-1.5 min-w-[60px]">
            <div
              className="h-1.5 rounded-full"
              style={{ width: `${Math.min(taxa, 100)}%`, background: cor }}
            />
          </div>
        </div>
      </td>
    </tr>
  );
}

// ── Bloco de eleição ──────────────────────────────────────────────────────────
function BlocoEleicao({ ano, tipo, dados, loading }) {
  const isMunicipal = tipo === "municipal";
  const gradiente = isMunicipal ? "from-amber-700 to-orange-600" : "from-purple-900 to-violet-700";
  const tipoLabel = isMunicipal ? "Eleições Municipais" : "Eleições Gerais";

  const bn = dados?.big_numbers ?? {};
  const porCargo = dados?.por_cargo ?? [];

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
      {/* Header colorido */}
      <div className={`px-5 py-4 bg-gradient-to-r ${gradiente}`}>
        <p className="text-white/65 text-[10px] font-bold uppercase tracking-widest mb-0.5">{tipoLabel}</p>
        <h2 className="text-white text-2xl font-black mb-3">{ano}</h2>

        {loading ? (
          <div className="flex gap-4 animate-pulse">
            {[1,2,3].map(i => <div key={i} className="bg-white/10 rounded-lg px-3 py-2 w-24 h-10" />)}
          </div>
        ) : (
          <div className="flex flex-wrap gap-x-5 gap-y-1.5">
            <StatHeader label="Eleitos" value={fmtNum(bn.total_eleitos)} />
            <div className="w-px h-8 bg-white/20 self-center" />
            <StatHeader label="Candidatos" value={fmtNum(bn.total_candidatos)} />
            <div className="w-px h-8 bg-white/20 self-center" />
            <StatHeader label="Taxa de eleição" value={fmtPct(bn.taxa_eleicao)} />
            {(bn.receita_total ?? 0) > 0 && (
              <>
                <div className="w-px h-8 bg-white/20 self-center" />
                <StatHeader label="Receita declarada" value={fmtMoeda(bn.receita_total)} />
              </>
            )}
          </div>
        )}
      </div>

      {/* Tabela de cargos */}
      <div className="flex-1 overflow-x-auto">
        {loading ? (
          <div className="p-4 space-y-2.5 animate-pulse">
            {[1,2,3,4].map(i => <div key={i} className="h-9 bg-gray-50 rounded-lg" />)}
          </div>
        ) : porCargo.length > 0 ? (
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50">
                <th className="text-left py-2.5 px-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Cargo</th>
                <th className="text-right py-2.5 px-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Eleitos</th>
                <th className="text-right py-2.5 px-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Candidatos</th>
                <th className="text-right py-2.5 px-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Taxa</th>
                <th className="py-2.5 px-4 min-w-[80px]" />
              </tr>
            </thead>
            <tbody>
              {porCargo.map(c => (
                <LinhaCargoTabela key={c.cargo} {...c} />
              ))}
            </tbody>
          </table>
        ) : (
          <p className="text-center text-gray-400 text-sm py-10">Sem dados para {ano}</p>
        )}
      </div>

      {/* Rodapé */}
      {!loading && bn.total_eleitos > 0 && (
        <div className="px-4 py-3 border-t border-gray-50 bg-gray-50/30 flex flex-wrap gap-x-5 gap-y-1 text-xs text-gray-500">
          <span><strong className="text-gray-700">{fmtNum(bn.municipios_com_eleito)}</strong> municípios com eleitos</span>
          {(bn.pct_mulheres_eleitas ?? 0) > 0 && (
            <span><strong className="text-gray-700">{fmtPct(bn.pct_mulheres_eleitas)}</strong> mulheres eleitas</span>
          )}
          {(bn.partidos_com_eleitos ?? 0) > 0 && (
            <span><strong className="text-gray-700">{bn.partidos_com_eleitos}</strong> partidos com eleitos</span>
          )}
          {(bn.estados_com_eleito ?? 0) > 0 && (
            <span><strong className="text-gray-700">{bn.estados_com_eleito}</strong> estados</span>
          )}
        </div>
      )}
    </div>
  );
}

function StatHeader({ label, value, sub }) {
  return (
    <div>
      <p className="text-white text-base font-black leading-tight">{value}</p>
      <p className="text-white/60 text-[10px] leading-tight">{label}</p>
      {sub && <p className="text-white/40 text-[9px]">{sub}</p>}
    </div>
  );
}

// ── KPI de presença ───────────────────────────────────────────────────────────
function CardPresenca({ icon: Icon, cor, valor, label, sub, pct }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex items-start gap-4">
      <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: cor + "1A" }}>
        <Icon size={20} style={{ color: cor }} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-2xl font-black text-gray-900 leading-tight">{valor}</p>
        <p className="text-xs text-gray-500 mt-0.5">{label}</p>
        {sub && <p className="text-[11px] text-gray-400 mt-0.5">{sub}</p>}
      </div>
      {pct != null && (
        <div className="text-right flex-shrink-0">
          <p className="text-lg font-bold" style={{ color: cor }}>{fmtPct(pct)}</p>
          <p className="text-[10px] text-gray-400">do total</p>
        </div>
      )}
    </div>
  );
}

// ── Top estados ───────────────────────────────────────────────────────────────
function TopEstados({ dados2024, dados2022, loading }) {
  const mapa = {};
  (dados2024?.por_estado ?? []).forEach(e => {
    mapa[e.estado] = { estado: e.estado, eleitos_24: e.eleitos, eleitos_22: 0 };
  });
  (dados2022?.por_estado ?? []).forEach(e => {
    if (!mapa[e.estado]) mapa[e.estado] = { estado: e.estado, eleitos_24: 0, eleitos_22: 0 };
    mapa[e.estado].eleitos_22 = e.eleitos;
  });

  const data = Object.values(mapa)
    .map(e => ({ ...e, total: e.eleitos_24 + e.eleitos_22 }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 15);

  if (loading) return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 animate-pulse">
      <div className="h-4 bg-gray-100 rounded w-1/3 mb-4" />
      <div className="h-64 bg-gray-50 rounded-xl" />
    </div>
  );

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
      <div className="flex items-center gap-2 mb-2">
        <MapPin className="w-4 h-4 text-gray-400" />
        <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider">Presença por Estado</h2>
      </div>
      <p className="text-xs text-gray-400 mb-5">Eleitos por unidade federativa (top 15)</p>
      <div className="flex items-center gap-4 mb-4 text-xs">
        <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm bg-amber-600" /><span className="text-gray-500">2024 Municipal</span></div>
        <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm bg-violet-700" /><span className="text-gray-500">2022 Geral</span></div>
      </div>
      <ResponsiveContainer width="100%" height={320}>
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 0, right: 30, left: 0, bottom: 0 }}
          barSize={8}
          barGap={2}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" horizontal={false} />
          <XAxis type="number" tick={{ fontSize: 11, fill: "#6B7280" }} tickFormatter={v => fmtNum(v)} />
          <YAxis type="category" dataKey="estado" tick={{ fontSize: 11, fill: "#374151" }} width={30} />
          <Tooltip
            formatter={(v, name) => [fmtNum(v), name === "eleitos_24" ? "2024 Municipal" : "2022 Geral"]}
            contentStyle={{ borderRadius: 12, fontSize: 12 }}
          />
          <Bar dataKey="eleitos_24" name="2024 Municipal" fill="#B45309" radius={[0, 3, 3, 0]} />
          <Bar dataKey="eleitos_22" name="2022 Geral"     fill="#7C3AED" radius={[0, 3, 3, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ── Top partidos ──────────────────────────────────────────────────────────────
function TopPartidos({ dados2024, dados2022, loading }) {
  const partidos = {};
  (dados2024?.por_partido ?? []).forEach(p => {
    if (!partidos[p.sigla]) partidos[p.sigla] = { sigla: p.sigla, eleitos_24: 0, eleitos_22: 0 };
    partidos[p.sigla].eleitos_24 = p.eleitos;
  });
  (dados2022?.por_partido ?? []).forEach(p => {
    if (!partidos[p.sigla]) partidos[p.sigla] = { sigla: p.sigla, eleitos_24: 0, eleitos_22: 0 };
    partidos[p.sigla].eleitos_22 = p.eleitos;
  });

  const data = Object.values(partidos)
    .sort((a, b) => (b.eleitos_24 + b.eleitos_22) - (a.eleitos_24 + a.eleitos_22))
    .slice(0, 12);

  if (loading) return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 animate-pulse">
      <div className="h-4 bg-gray-100 rounded w-1/3 mb-4" />
      <div className="h-64 bg-gray-50 rounded-xl" />
    </div>
  );

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
      <div className="flex items-center gap-2 mb-2">
        <BarChart2 className="w-4 h-4 text-gray-400" />
        <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider">Top Partidos por Eleitos</h2>
      </div>
      <p className="text-xs text-gray-400 mb-5">Partidos com mais eleitos nos dois últimos ciclos</p>
      <div className="flex items-center gap-4 mb-4 text-xs">
        <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm bg-amber-600" /><span className="text-gray-500">2024 Municipal</span></div>
        <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm bg-violet-700" /><span className="text-gray-500">2022 Geral</span></div>
      </div>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 0, right: 24, left: 0, bottom: 0 }}
          barSize={8}
          barGap={2}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" horizontal={false} />
          <XAxis type="number" tick={{ fontSize: 11, fill: "#6B7280" }} tickFormatter={v => fmtNum(v)} />
          <YAxis type="category" dataKey="sigla" tick={{ fontSize: 11, fill: "#374151" }} width={44} />
          <Tooltip
            formatter={(v, name) => [fmtNum(v), name === "eleitos_24" ? "2024 Municipal" : "2022 Geral"]}
            contentStyle={{ borderRadius: 12, fontSize: 12 }}
          />
          <Bar dataKey="eleitos_24" name="2024 Municipal" fill="#B45309" radius={[0, 3, 3, 0]} />
          <Bar dataKey="eleitos_22" name="2022 Geral"     fill="#7C3AED" radius={[0, 3, 3, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ── Diversidade de gênero ─────────────────────────────────────────────────────
function CardGenero({ ano, tipo, dados, loading }) {
  const isMunicipal = tipo === "municipal";
  const cor = isMunicipal ? "#B45309" : "#7C3AED";
  const bn = dados?.big_numbers ?? {};

  const pctMulheres = Number(bn.pct_mulheres_eleitas ?? 0);
  const pctHomens   = 100 - pctMulheres;

  const pieData = [
    { name: "Mulheres", value: pctMulheres,  fill: "#EC4899" },
    { name: "Homens",   value: pctHomens,    fill: "#CBD5E1" },
  ];

  const totalEleitos     = Number(bn.total_eleitos ?? 0);
  const eleitasFemininas = Math.round(totalEleitos * pctMulheres / 100);

  if (loading) return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 animate-pulse">
      <div className="h-4 bg-gray-100 rounded w-1/2 mb-4" />
      <div className="h-40 bg-gray-50 rounded-xl" />
    </div>
  );

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-gray-400" />
          <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider">Gênero dos Eleitos</h3>
        </div>
        <span className="text-xs font-bold px-2 py-0.5 rounded-full"
          style={{ background: cor + "1A", color: cor }}>
          {ano} · {isMunicipal ? "Municipal" : "Geral"}
        </span>
      </div>
      <p className="text-xs text-gray-400 mb-5">Composição por gênero dos candidatos eleitos</p>

      <div className="flex items-center gap-6">
        <ResponsiveContainer width={120} height={120}>
          <PieChart>
            <Pie data={pieData} cx={55} cy={55} innerRadius={35} outerRadius={55}
              dataKey="value" startAngle={90} endAngle={-270} stroke="none">
              {pieData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
            </Pie>
          </PieChart>
        </ResponsiveContainer>

        <div className="flex-1 space-y-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-2.5 h-2.5 rounded-full bg-pink-500" />
              <span className="text-xs text-gray-500">Mulheres eleitas</span>
            </div>
            <p className="text-xl font-black text-gray-900">{fmtPct(pctMulheres)}</p>
            <p className="text-xs text-gray-400">{fmtNum(eleitasFemininas)} de {fmtNum(totalEleitos)}</p>
          </div>
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <div className="w-2.5 h-2.5 rounded-full bg-slate-300" />
              <span className="text-xs text-gray-500">Homens eleitos</span>
            </div>
            <p className="text-sm font-bold text-gray-600">{fmtPct(pctHomens)}</p>
          </div>
          {(bn.candidatas_femininas ?? 0) > 0 && (
            <div className="pt-2 border-t border-gray-50">
              <p className="text-xs text-gray-400">{fmtNum(bn.candidatas_femininas)} candidatas no total</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Financiamento ─────────────────────────────────────────────────────────────
function Financiamento({ dados2024, dados2022, loading }) {
  const r24 = dados2024?.big_numbers?.receita_total ?? 0;
  const d24 = dados2024?.big_numbers?.despesa_total ?? 0;
  const r22 = dados2022?.big_numbers?.receita_total ?? 0;
  const d22 = dados2022?.big_numbers?.despesa_total ?? 0;

  if (!r24 && !d24 && !r22 && !d22) return null;

  const data = [
    { ano: "2024 Municipal", receita: r24, despesa: d24 },
    { ano: "2022 Geral",     receita: r22, despesa: d22 },
  ].filter(d => d.receita > 0 || d.despesa > 0);

  if (loading) return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 animate-pulse">
      <div className="h-4 bg-gray-100 rounded w-1/3 mb-4" />
      <div className="h-40 bg-gray-50 rounded-xl" />
    </div>
  );

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
      <div className="flex items-center gap-2 mb-2">
        <DollarSign className="w-4 h-4 text-gray-400" />
        <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider">Financiamento de Campanha</h2>
      </div>
      <p className="text-xs text-gray-400 mb-5">Receita e despesa declarada ao TSE</p>
      <ResponsiveContainer width="100%" height={180}>
        <BarChart data={data} margin={{ top: 4, right: 16, left: 0, bottom: 0 }} barSize={36} barGap={4}>
          <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
          <XAxis dataKey="ano" tick={{ fontSize: 11, fill: "#6B7280" }} />
          <YAxis tick={{ fontSize: 11, fill: "#6B7280" }} tickFormatter={v => fmtMoeda(v)} />
          <Tooltip formatter={v => [fmtMoeda(v), ""]} contentStyle={{ borderRadius: 12, fontSize: 12 }} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Bar dataKey="receita" name="Receita" fill="#7C3AED" radius={[4, 4, 0, 0]} />
          <Bar dataKey="despesa" name="Despesa" fill="#F59E0B" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ── Página principal ──────────────────────────────────────────────────────────
export default function DashboardPage() {
  const [dados2024, setDados2024] = useState(null);
  const [dados2022, setDados2022] = useState(null);
  const [loading, setLoading]     = useState(true);
  const [erro, setErro]           = useState(null);

  const carregar = useCallback(async () => {
    setLoading(true);
    setErro(null);
    try {
      const [d24, d22] = await Promise.all([
        apiFetch("/dashboard/visao-geral", { anos: "2024" }),
        apiFetch("/dashboard/visao-geral", { anos: "2022" }),
      ]);
      setDados2024(d24);
      setDados2022(d22);
    } catch {
      setErro("Erro ao carregar dados. Verifique a conexão com o servidor.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  const bn24 = dados2024?.big_numbers ?? {};
  const bn22 = dados2022?.big_numbers ?? {};
  const totalEleitos = (bn24.total_eleitos ?? 0) + (bn22.total_eleitos ?? 0);
  const totalMunicipios = bn24.total_municipios ?? 5569;
  const pctPresenca = totalMunicipios > 0
    ? ((bn24.municipios_com_eleito ?? 0) / totalMunicipios * 100).toFixed(1)
    : 0;

  return (
    <AppLayout>
      <div className="space-y-6 max-w-screen-2xl mx-auto">

        {/* Cabeçalho */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Inteligência Eleitoral</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Panorama nacional · últimas duas eleições · dados do TSE
            </p>
          </div>
          <button
            onClick={carregar}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-purple-700
                       bg-purple-50 hover:bg-purple-100 rounded-xl transition-colors border border-purple-200
                       disabled:opacity-50 disabled:cursor-not-allowed self-start sm:self-auto"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            {loading ? "Carregando..." : "Atualizar"}
          </button>
        </div>

        {/* Erro */}
        {erro && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-sm text-red-700">{erro}</div>
        )}

        {/* Aviso de dado em revisão */}
        <div className="flex items-start gap-2.5 bg-amber-50 border border-amber-100 rounded-xl px-4 py-3 text-xs text-amber-700">
          <AlertTriangle size={14} className="shrink-0 mt-0.5" />
          <span>
            <strong>Ciclos eleitorais separados:</strong> Eleições municipais (Prefeito/Vereador) e gerais (Deputado/Senador/Governador/Presidente) não são comparáveis.
            A coluna de votos está em revisão no ETL - os números de eleitos e candidatos são definitivos.
          </span>
        </div>

        {/* Dois blocos lado a lado */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
          <BlocoEleicao ano="2024" tipo="municipal" dados={dados2024} loading={loading} />
          <BlocoEleicao ano="2022" tipo="geral"     dados={dados2022} loading={loading} />
        </div>

        {/* ── Presença Nacional ─────────────────────────────────────────── */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Globe size={16} className="text-gray-400" />
            <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider">Presença Nacional</h2>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <CardPresenca
              icon={Award}
              cor="#7C3AED"
              valor={fmtNum(totalEleitos)}
              label="Total de eleitos (2022+2024)"
              sub="Vereadores, prefeitos, dep. estaduais, federais, senadores, governadores"
            />
            <CardPresenca
              icon={Building2}
              cor="#B45309"
              valor={fmtNum(bn24.municipios_com_eleito)}
              label="Municípios com eleitos em 2024"
              pct={Number(pctPresenca)}
              sub={`de ${fmtNum(totalMunicipios)} municípios brasileiros`}
            />
            <CardPresenca
              icon={Flag}
              cor="#0369A1"
              valor={fmtNum(bn22.estados_com_eleito)}
              label="Estados com eleitos em 2022"
              pct={bn22.estados_com_eleito > 0 ? (bn22.estados_com_eleito / 27 * 100) : null}
              sub="De 27 unidades federativas"
            />
            <CardPresenca
              icon={Star}
              cor="#0E7490"
              valor={fmtNum((bn24.partidos_com_eleitos ?? 0) + (bn22.partidos_com_eleitos ?? 0))}
              label="Partidos aliados com eleitos"
              sub="Somatório de partidos nos dois ciclos"
            />
          </div>
        </div>

        {/* ── Top estados + Top partidos ───────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <TopEstados dados2024={dados2024} dados2022={dados2022} loading={loading} />
          <TopPartidos dados2024={dados2024} dados2022={dados2022} loading={loading} />
        </div>

        {/* ── Diversidade + Financiamento ──────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <CardGenero ano="2024" tipo="municipal" dados={dados2024} loading={loading} />
          <CardGenero ano="2022" tipo="geral"     dados={dados2022} loading={loading} />
          <Financiamento dados2024={dados2024} dados2022={dados2022} loading={loading} />
        </div>

      </div>
    </AppLayout>
  );
}
