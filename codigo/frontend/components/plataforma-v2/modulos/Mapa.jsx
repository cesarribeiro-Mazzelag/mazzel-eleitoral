"use client";

/* @deprecated em 25/04/2026 (noite).
 *
 * Este componente foi um wrapper SKELETAL do Mapa Eleitoral durante o porte
 * inicial pra V2. So implementava ~10% do que o V1 (preservada) tinha:
 * sem drill-down, sem foto-on-hover, sem tabs turno, sem tooltip X9, sem
 * microbairros, sem 9 dos 11 endpoints.
 *
 * O componente completo (3196 linhas) sempre esteve em
 * `components/map/MapaEleitoral.tsx`. A rota `/mazzel-preview/mapa` agora
 * importa direto de la (ver `app/mazzel-preview/mapa/page.jsx`).
 *
 * Este arquivo fica preservado como referencia historica do estado anterior
 * pra Designer entender o que mudou. Pode ser removido depois que o
 * Designer redesenhar o Mapa Estrategico (decisao 25/04 manha) que vai
 * substituir esta rota na sidebar principal.
 */

/* Container Mapa Eleitoral adaptado de designer/platform-mapa.jsx.
 * O <BrasilChoropleth> SVG é placeholder - na Fase 4 será substituído
 * por MapLibre GL JS rendering real (UF -> municípios -> micro-bairros IBGE). */

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "../Icon";
import { makeNavigate } from "../navigate";
import { UF_LIST, PARTY_STRENGTH, partyColor } from "../data";
import { ufName } from "./BrasilChoropleth";
import { MapaLibreCanvas } from "./MapaLibreCanvas";
import { API, ApiError } from "../api";
import { buildUfDetail } from "../adapters/mapa";

// Camadas disponiveis por modo
const LAYERS_HISTORICO = [
  { id: "votos",      label: "Votos" },
  { id: "eleitos",    label: "Eleitos" },
  { id: "forcas",     label: "Forcas" },
  { id: "comparacao", label: "Comparacao" },
];

const LAYERS_FUTURO = [
  { id: "estrategia",     label: "Estrategia" },
  { id: "base_partidaria", label: "Base partidaria" },
  { id: "liderancas",     label: "Liderancas" },
  { id: "coordenadores",  label: "Coordenadores" },
];

const CARGOS = [
  { id: "pres",       label: "Pres" },
  { id: "gov",        label: "Gov" },
  { id: "sen",        label: "Sen" },
  { id: "dep_fed",    label: "Dep Federal" },
  { id: "dep_est",    label: "Dep Estadual" },
  { id: "pref",       label: "Pref" },
  { id: "vereador",   label: "Vereador" },
];

const CICLOS = ["2018", "2020", "2022", "2024", "2026"];

// Mantido para compatibilidade com legenda
const MAP_LAYERS = [
  { id: "partido",    label: "Partido dominante" },
  { id: "score",      label: "Score regional" },
  { id: "eleitos",    label: "Eleitos UB" },
  { id: "emendas",    label: "Emendas R$" },
  { id: "alertas",    label: "Densidade alertas" },
];

function ufDetailMock(uf, scoreData) {
  return {
    uf,
    partido: PARTY_STRENGTH[uf] || "-",
    score: scoreData[uf],
    eleitos: 10 + ((uf.charCodeAt(0) + uf.charCodeAt(1)) % 40),
    senadores: ((uf.charCodeAt(0) + uf.charCodeAt(1)) % 3) + 1,
    deputados: 5 + (uf.charCodeAt(0) % 20),
    prefeitos: 30 + ((uf.charCodeAt(0) + uf.charCodeAt(1) * 3) % 70),
    emendas: 40 + ((uf.charCodeAt(0) + uf.charCodeAt(1)) % 160),
    alertas: uf.charCodeAt(1) % 5,
    trend: (uf.charCodeAt(0) % 2) ? "+2,3pp" : "-0,8pp",
    top3: [
      { nome: "Jaques Wagner",  partido: "PT",  overall: 87 },
      { nome: "Otto Alencar",   partido: "PSD", overall: 79 },
      { nome: "Angelo Coronel", partido: "PSD", overall: 75 },
    ],
  };
}

function useUfDetail(uf, scoreData) {
  const [detail, setDetail] = useState(() => ufDetailMock(uf, scoreData));
  const [realSource, setRealSource] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setRealSource(false);
    setDetail(ufDetailMock(uf, scoreData));

    Promise.all([
      API.mapaEstadoEleitos(uf).catch(() => null),
      API.mapaEstadoForcas(uf).catch(() => null),
    ]).then(([eleitos, forcas]) => {
      if (cancelled) return;
      if (!eleitos && !forcas) return;
      const built = buildUfDetail({ uf, eleitos, forcas });
      setDetail((prev) => ({
        ...prev,
        ...built,
        score: built.score ?? prev.score,
        emendas: built.emendas ?? prev.emendas,
        alertas: built.alertas ?? prev.alertas,
        trend: built.trend ?? prev.trend,
        top3: built.top3.length ? built.top3 : prev.top3,
      }));
      setRealSource(true);
    }).catch(() => {});

    return () => { cancelled = true; };
  }, [uf, scoreData]);

  return { detail, realSource };
}

export function Mapa() {
  const router = useRouter();
  const navigate = makeNavigate(router);

  // Modo principal: historico (dados reais) ou futuro (planejamento - placeholder)
  const [modo, setModo] = useState("historico");
  const [layer, setLayer] = useState("votos");
  const [cargo, setCargo] = useState("pres");
  const [ciclo, setCiclo] = useState("2024");
  const [partido, setPartido] = useState("todos");
  const [selectedUf, setSelectedUf] = useState("SP");
  const [hoverUf, setHoverUf] = useState(null);
  const [compareMode, setCompareMode] = useState(false);
  const [compareUf, setCompareUf] = useState("MG");

  // Quando muda de modo, reseta camada para default do novo modo
  const handleSetModo = (novoModo) => {
    setModo(novoModo);
    setLayer(novoModo === "historico" ? "votos" : "estrategia");
  };

  const layerOptions = modo === "historico" ? LAYERS_HISTORICO : LAYERS_FUTURO;

  const scoreData = useMemo(() => {
    const d = {};
    UF_LIST.forEach((u, i) => {
      d[u] = 45 + ((u.charCodeAt(0) + u.charCodeAt(1) + i * 7) % 50);
    });
    return d;
  }, []);

  const { detail: det, realSource: detReal } = useUfDetail(selectedUf, scoreData);
  const { detail: cmpDetail } = useUfDetail(compareUf, scoreData);
  const cmp = compareMode ? cmpDetail : null;

  const [authMsg, setAuthMsg] = useState(null);

  return (
    <div style={{ height: "100%", position: "relative", overflow: "hidden", background: "var(--bg-page)" }}>

      <div className="absolute" style={{ inset: 0, right: 392 }}>
        <MapaLibreCanvas
          layer={layer}
          selectedUf={selectedUf}
          onSelectUf={(uf) => { if (compareMode) setCompareUf(uf); else setSelectedUf(uf); }}
          onAuthError={() => setAuthMsg("Sem sessão - faça login para carregar polígonos reais dos municípios.")}
        />
        {authMsg && (
          <div
            className="absolute left-1/2 -translate-x-1/2 rounded-lg px-3 py-2 text-[12px] z-10"
            style={{
              top: 72,
              background: "rgba(251,191,36,0.12)",
              border: "1px solid rgba(251,191,36,0.4)",
              color: "var(--fg)",
              backdropFilter: "blur(4px)",
            }}
          >
            <Icon name="AlertTriangle" size={12} className="t-warn" /> {authMsg}
          </div>
        )}
        <div
          className="absolute flex items-center gap-2 z-10"
          style={{
            bottom: 16, right: 16,
            background: "var(--bg-elevated)", border: "1px solid var(--rule-strong)",
            borderRadius: 10, padding: "6px 10px",
          }}
        >
          <span className="text-[10px] t-fg-dim uppercase tracking-wider">UF</span>
          <select
            value={selectedUf}
            onChange={(e) => setSelectedUf(e.target.value)}
            className="btn-ghost"
            style={{ padding: "4px 8px", fontSize: 11 }}
          >
            {UF_LIST.map((u) => <option key={u} value={u}>{u}</option>)}
          </select>
        </div>
      </div>

      {/* ===== TOOLBAR 3 LINHAS ===== */}
      <div
        className="map-toolbar"
        style={{ flexDirection: "column", alignItems: "stretch", gap: 0, padding: 0 }}
      >
        {/* Linha 1 - Toggle de modo */}
        <div
          className="flex items-center gap-2 px-3"
          style={{
            height: 36,
            borderBottom: "1px solid var(--rule)",
          }}
        >
          <span className="text-[10px] t-fg-dim uppercase tracking-wider font-semibold mr-1">Modo</span>
          <div
            className="flex rounded-md overflow-hidden"
            style={{ border: "1px solid var(--rule-strong)" }}
          >
            <button
              onClick={() => handleSetModo("historico")}
              className={`btn-ghost ${modo === "historico" ? "active" : ""}`}
              style={{ padding: "4px 14px", fontSize: 11, borderRadius: 0, borderRight: "1px solid var(--rule-strong)" }}
              type="button"
            >
              Historico
            </button>
            <button
              onClick={() => handleSetModo("futuro")}
              className={`btn-ghost ${modo === "futuro" ? "active" : ""}`}
              style={{ padding: "4px 14px", fontSize: 11, borderRadius: 0 }}
              type="button"
            >
              Futuro
            </button>
          </div>
        </div>

        {/* Linha 2 - Filtros */}
        <div
          className="flex items-center gap-1 flex-wrap px-3"
          style={{
            height: 36,
            borderBottom: "1px solid var(--rule)",
          }}
        >
          {/* Cargo */}
          <div className="flex items-center gap-1 pr-2 border-r" style={{ borderColor: "var(--rule)" }}>
            <span className="text-[10px] t-fg-dim uppercase tracking-wider px-1 font-semibold">Cargo</span>
            {CARGOS.map((c) => (
              <button
                key={c.id}
                onClick={() => setCargo(c.id)}
                className={`btn-ghost ${cargo === c.id ? "active" : ""}`}
                style={{ padding: "3px 7px", fontSize: 10.5 }}
                type="button"
              >
                {c.label}
              </button>
            ))}
          </div>

          {/* Ciclo */}
          <div className="flex items-center gap-1 pr-2 border-r" style={{ borderColor: "var(--rule)" }}>
            <span className="text-[10px] t-fg-dim uppercase tracking-wider px-1 font-semibold">Ciclo</span>
            {CICLOS.map((c) => (
              <button
                key={c}
                onClick={() => setCiclo(c)}
                className={`btn-ghost ${ciclo === c ? "active" : ""}`}
                style={{ padding: "3px 7px", fontSize: 10.5 }}
                type="button"
              >
                {c}
              </button>
            ))}
          </div>

          {/* Partido */}
          <div className="flex items-center gap-1 pr-2 border-r" style={{ borderColor: "var(--rule)" }}>
            <span className="text-[10px] t-fg-dim uppercase tracking-wider px-1 font-semibold">Partido</span>
            <select
              value={partido}
              onChange={(e) => setPartido(e.target.value)}
              className="btn-ghost"
              style={{ padding: "3px 8px", fontSize: 10.5 }}
            >
              <option value="todos">Todos</option>
              <option value="44">Uniao Brasil</option>
              <option value="13">PT</option>
              <option value="22">PL</option>
              <option value="55">PSD</option>
              <option value="15">MDB</option>
              <option value="40">PSB</option>
              <option value="10">Republicanos</option>
              <option value="11">PP</option>
            </select>
          </div>

          {/* Camada - muda conforme modo */}
          <div className="flex items-center gap-1">
            <span className="text-[10px] t-fg-dim uppercase tracking-wider px-1 font-semibold">Camada</span>
            {layerOptions.map((l) => (
              <button
                key={l.id}
                onClick={() => setLayer(l.id)}
                className={`btn-ghost ${layer === l.id ? "active" : ""}`}
                style={{ padding: "3px 7px", fontSize: 10.5 }}
                type="button"
              >
                {l.label}
              </button>
            ))}
          </div>
        </div>

        {/* Linha 3 - Acoes */}
        <div className="flex items-center gap-1 px-3" style={{ height: 36 }}>
          <button
            onClick={() => setCompareMode(!compareMode)}
            className={`btn-ghost ${compareMode ? "active" : ""}`}
            style={{ padding: "4px 10px", fontSize: 11 }}
            type="button"
          >
            <Icon name="Filter" size={11} /> {compareMode ? "Comparando 2 UFs" : "Comparar UFs"}
          </button>
          <button className="btn-ghost" style={{ padding: "4px 10px", fontSize: 11 }} type="button">
            <Icon name="Download" size={11} /> Exportar
          </button>
          <button
            onClick={() => { setCargo("pres"); setCiclo("2024"); setPartido("todos"); setLayer(modo === "historico" ? "votos" : "estrategia"); setCompareMode(false); }}
            className="btn-ghost"
            style={{ padding: "4px 10px", fontSize: 11 }}
            type="button"
          >
            <Icon name="X" size={11} /> Limpar filtros
          </button>
        </div>
      </div>

      {/* ===== OVERLAY MODO FUTURO (placeholder) ===== */}
      {modo === "futuro" && (
        <div
          className="absolute z-20 flex flex-col items-center justify-center text-center"
          style={{
            inset: 0,
            right: 392,
            top: 0, // cobre o mapa inteiro incluindo a area da toolbar
            background: "rgba(10, 10, 14, 0.82)",
            backdropFilter: "blur(6px)",
          }}
        >
          <div
            className="rounded-2xl p-8 flex flex-col items-center gap-4"
            style={{
              background: "var(--bg-elevated)",
              border: "1px solid var(--rule-strong)",
              maxWidth: 440,
            }}
          >
            <div
              className="rounded-full flex items-center justify-center"
              style={{ width: 48, height: 48, background: "rgba(139,92,246,0.15)", border: "1px solid rgba(139,92,246,0.3)" }}
            >
              <Icon name="Map" size={22} style={{ color: "#a78bfa" }} />
            </div>
            <div>
              <div className="text-[15px] font-bold t-fg-strong mb-1">Mapa estrategico prospectivo</div>
              <div className="text-[12px] t-fg-muted leading-relaxed">
                Em construcao. Integracao com modulo Campanha 2026 em desenvolvimento -
                planejamento de base partidaria, liderancas e coordenadores por regiao.
              </div>
            </div>
            <button
              onClick={() => handleSetModo("historico")}
              className="btn-primary"
              style={{ padding: "8px 20px", fontSize: 12 }}
              type="button"
            >
              Voltar ao modo Historico
            </button>
          </div>
        </div>
      )}

      <div className="map-legend">
        <div className="text-[9.5px] t-fg-dim uppercase tracking-wider font-semibold mb-1.5">
          Legenda · {layerOptions.find((l) => l.id === layer)?.label ?? layer}
        </div>
        <div className="flex items-center gap-3 flex-wrap" style={{ maxWidth: 340 }}>
          {(layer === "forcas" || layer === "votos" || layer === "eleitos")
            ? ["UNIAO BRASIL", "PL", "PT", "PSD", "MDB", "PSB", "REPUBLICANOS", "PSDB"].map((p) => (
                <div key={p} className="flex items-center gap-1.5 text-[10.5px] t-fg-muted">
                  <span className="party-dot" style={{ background: partyColor(p) }} />{p}
                </div>
              ))
            : [["#f87171", "<40"], ["#fb923c", "40-55"], ["#fbbf24", "55-70"], ["#60a5fa", "70-85"], ["#34d399", ">=85"]].map(([c, l]) => (
                <div key={l} className="flex items-center gap-1.5 text-[10.5px] t-fg-muted">
                  <span className="party-dot" style={{ background: c }} />{l}
                </div>
              ))}
        </div>
      </div>

      <div className="map-context-panel">
        <div className="p-5 border-b" style={{ borderColor: "var(--rule)" }}>
          <div className="flex items-center gap-2 mb-1">
            <Icon name="MapPin" size={13} className="t-tenant" />
            <span className="text-[10.5px] t-fg-dim uppercase tracking-[0.14em] font-semibold">Unidade federativa</span>
          </div>
          <div className="flex items-baseline gap-3">
            <div className="text-[48px] font-display font-bold t-fg-strong leading-none tnum">{selectedUf}</div>
            <div className="flex-1">
              <div className="text-[13px] font-semibold t-fg">{ufName(selectedUf)}</div>
              <div className="text-[11px] t-fg-muted">{ciclo}</div>
            </div>
          </div>
          <div className="flex items-center gap-2 mt-3">
            <span className="chip chip-blue">
              <span className="party-dot" style={{ background: partyColor(det.partido) }} />
              {det.partido} dominante
            </span>
            {det.trend ? (
              <span className={`chip ${det.trend.startsWith("+") ? "chip-green" : "chip-red"}`}>
                <Icon name={det.trend.startsWith("+") ? "ArrowUp" : "ArrowDown"} size={9} />
                {det.trend} YoY
              </span>
            ) : (
              <span className="chip chip-muted">Sem série YoY</span>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="p-5 border-b" style={{ borderColor: "var(--rule)" }}>
            <div className="text-[10.5px] t-fg-dim uppercase tracking-wider font-semibold mb-1.5">Score regional</div>
            <div className="flex items-baseline gap-2">
              <div className="text-[44px] font-display font-bold tnum t-fg-strong leading-none">{det.score}</div>
              <div className="text-[14px] t-fg-dim tnum">/ 100</div>
              {cmp && (
                <div className="ml-auto text-right">
                  <div className="text-[10.5px] t-fg-dim uppercase tracking-wider">vs {compareUf}</div>
                  <div className="text-[22px] font-display font-bold tnum t-fg-muted">{cmp.score}</div>
                </div>
              )}
            </div>
            <div className="mt-3 h-1.5 rounded-sm overflow-hidden" style={{ background: "var(--rule)" }}>
              <div style={{ width: `${det.score}%`, height: "100%", background: "linear-gradient(90deg, var(--tenant-primary), #60a5fa)" }} />
            </div>
          </div>

          <div className="p-5 border-b" style={{ borderColor: "var(--rule)" }}>
            <div className="text-[10.5px] t-fg-dim uppercase tracking-wider font-semibold mb-3">Força eleitoral UB</div>
            <div className="grid grid-cols-3 gap-2">
              {[
                { l: "Senadores", v: det.senadores },
                { l: "Dep. fed.", v: det.deputados },
                { l: "Prefeitos", v: det.prefeitos },
              ].map((m) => (
                <div key={m.l} className="ring-soft rounded-md p-3" style={{ background: "var(--bg-card-2)" }}>
                  <div className="text-[10px] t-fg-dim uppercase tracking-wider">{m.l}</div>
                  <div className="text-[22px] font-bold tnum t-fg-strong mt-0.5 leading-none">{m.v}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="p-5 border-b" style={{ borderColor: "var(--rule)" }}>
            <div className="flex items-center justify-between mb-3">
              <div className="text-[10.5px] t-fg-dim uppercase tracking-wider font-semibold">Emendas 2024</div>
              <div className="tnum text-[13px] font-bold t-fg-strong">{det.emendas != null ? `R$ ${det.emendas}M` : "-"}</div>
            </div>
            <div className="flex items-center justify-between">
              <div className="text-[10.5px] t-fg-dim uppercase tracking-wider font-semibold">Alertas abertos</div>
              <div className="tnum text-[13px] font-bold t-fg-strong flex items-center gap-1.5">
                <span className="chip-dot" style={{ background: (det.alertas ?? 0) > 2 ? "var(--danger)" : "var(--warn)", width: 8, height: 8 }} />
                {det.alertas ?? "-"}
              </div>
            </div>
          </div>

          <div className="p-5">
            <div className="text-[10.5px] t-fg-dim uppercase tracking-wider font-semibold mb-3">Top 3 · políticos da UF</div>
            <div className="space-y-2">
              {det.top3.map((c, i) => (
                <div
                  key={c.id ?? i}
                  className="flex items-center gap-3 p-2 rounded-md card-hover cursor-pointer"
                  style={{ background: "var(--bg-card-2)" }}
                  onClick={() => router.push(c.id ? `/mazzel-preview/dossies/${c.id}` : "/mazzel-preview/dossies")}
                >
                  <div className="text-[11px] tnum font-bold t-fg-dim w-4">#{i + 1}</div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[12px] font-semibold t-fg-strong truncate">{c.nome}</div>
                    <div className="flex items-center gap-1.5 text-[10.5px] t-fg-dim">
                      <span className="party-dot" style={{ background: partyColor(c.partido) }} />
                      {c.partido}
                      {c.votos != null && <><span className="t-fg-ghost">·</span><span className="tnum">{Number(c.votos).toLocaleString("pt-BR")} votos</span></>}
                    </div>
                  </div>
                  <div className="tnum text-[15px] font-bold text-amber-300">{c.overall ?? "-"}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="p-4 border-t flex gap-2" style={{ borderColor: "var(--rule)" }}>
          <button className="btn-primary flex-1 justify-center" onClick={() => navigate("dossie")} type="button">
            Abrir dossiê da UF
          </button>
          <button className="btn-ghost" type="button">Exportar</button>
        </div>
      </div>

    </div>
  );
}
