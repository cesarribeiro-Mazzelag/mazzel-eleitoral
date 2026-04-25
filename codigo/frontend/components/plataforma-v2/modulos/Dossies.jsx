"use client";

/* Biblioteca de Dossies - listagem com cards FIFA + filtros.
 * Esta e a home do modulo Dossie: escolha um politico -> abre dossie completo (9 secoes).
 *
 * Origem: era o conteudo do Radar Politico, movido para o Dossie em 24/04/2026 (ajuste Cesar).
 * O Radar agora e placeholder do observatorio dinamico. */

import { useState, useMemo, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "../Icon";
import { RADAR_CANDIDATOS, UF_LIST } from "../data";
import { CardPolitico } from "../../radar/CardPolitico";
import { API, ApiError } from "../api";
import { StatusBanner } from "../useApiFetch";
import { radarCardsFromApi } from "../adapters/listagens";

// Mapa cargo curto (UI) -> cargo backend (formato TSE/MV).
const CARGO_BACKEND = {
  PRES: "PRESIDENTE",
  GOV:  "GOVERNADOR",
  SEN:  "SENADOR",
  DEP:  "DEPUTADO FEDERAL",  // simplificacao: backend tem FEDERAL e ESTADUAL separados
};

const POR_PAGINA = 60;

export function Dossies() {
  const router = useRouter();
  const [cargo, setCargo] = useState("TODOS");
  const [uf, setUf] = useState("TODAS");
  const [partido, setPartido] = useState("TODOS");
  const [tier, setTier] = useState("TODOS");
  const [sort, setSort] = useState("overall");
  const [q, setQ] = useState("");

  // Estado de paginacao acumulada: items[] + total + pagina atual.
  // Filtros (cargo/uf/busca) sao server-side; tier/partido/sort client-side.
  const [items, setItems] = useState(null);
  const [total, setTotal] = useState(0);
  const [pagina, setPagina] = useState(1);
  const [status, setStatus] = useState("loading");
  const [errorMsg, setErrorMsg] = useState("");
  const [carregandoMais, setCarregandoMais] = useState(false);

  const fetchPagina = useCallback(async (p, append) => {
    const params = { por_pagina: POR_PAGINA, pagina: p };
    if (cargo !== "TODOS" && CARGO_BACKEND[cargo]) params.cargo = CARGO_BACKEND[cargo];
    if (uf !== "TODAS") params.estado_uf = uf;
    if (q) params.busca = q;
    if (append) setCarregandoMais(true); else setStatus("loading");
    try {
      const resp = await API.radar(params);
      const cards = radarCardsFromApi(resp) || [];
      setItems((prev) => append ? [...(prev || []), ...cards] : cards);
      setTotal(resp.total ?? cards.length);
      setStatus("ok");
    } catch (err) {
      const msg = err?.message || "Falha ao carregar.";
      if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
        setStatus("unauth");
        setErrorMsg("Sem sessão ativa. Exibindo dados fictícios.");
        if (!append) setItems(null);
      } else {
        setStatus("error");
        setErrorMsg(msg);
      }
    } finally {
      setCarregandoMais(false);
    }
  }, [cargo, uf, q]);

  // Reset + refetch quando filtros server-side mudam
  useEffect(() => {
    setPagina(1);
    fetchPagina(1, false);
  }, [fetchPagina]);

  const verMais = () => {
    const proxima = pagina + 1;
    setPagina(proxima);
    fetchPagina(proxima, true);
  };

  const fonte = items || RADAR_CANDIDATOS;

  const partidos = useMemo(
    () => ["TODOS", ...Array.from(new Set(fonte.map((c) => c.partido)))],
    [fonte],
  );
  const cargos = ["TODOS", "PRES", "GOV", "SEN", "DEP"];
  const tiers = ["TODOS", "dourado", "ouro", "prata", "bronze"];

  const results = useMemo(() => {
    let r = fonte.slice();
    // Cargo, UF, busca ja vieram filtrados do backend; aplicamos partido/tier/sort client.
    if (partido !== "TODOS") r = r.filter((c) => c.partido === partido);
    if (tier !== "TODOS")   r = r.filter((c) => c.tier === tier);
    if (sort === "overall") r.sort((a, b) => b.overall - a.overall);
    else if (sort === "nome") r.sort((a, b) => a.nome.localeCompare(b.nome));
    else if (sort === "uf")   r.sort((a, b) => a.uf.localeCompare(b.uf));
    return r;
  }, [fonte, partido, tier, sort]);

  return (
    <div className="bg-page-grad min-h-full">
      <div className="max-w-[1600px] mx-auto px-8 py-7">
        <StatusBanner status={status} errorMsg={errorMsg} />
        <div className="mb-5">
          <div className="text-[11px] t-fg-dim tracking-[0.18em] uppercase font-semibold">Biblioteca de dossiês</div>
          <h1 className="text-[32px] font-display font-bold t-fg-strong mt-1 leading-none">
            Dossiês políticos
          </h1>
          <div className="text-[13px] t-fg-muted mt-1.5 max-w-2xl">
            Selecione um político para abrir o dossiê completo.
          </div>
        </div>

        <div className="t-bg-card ring-soft rounded-xl p-4 mb-5">
          <div className="grid grid-cols-[260px_repeat(5,1fr)_auto] gap-2 items-center">
            <div
              className="flex items-center gap-2 h-8 px-2.5 rounded-md"
              style={{ background: "var(--rule)" }}
            >
              <Icon name="Search" size={12} className="t-fg-dim" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Buscar nome..."
                className="flex-1 bg-transparent outline-none text-[12px] t-fg placeholder:t-fg-dim"
              />
            </div>
            {[
              { v: cargo,   s: setCargo,   opts: cargos,                  label: "Cargo"    },
              { v: uf,      s: setUf,      opts: ["TODAS", ...UF_LIST],   label: "UF"       },
              { v: partido, s: setPartido, opts: partidos,                label: "Partido"  },
              { v: tier,    s: setTier,    opts: tiers,                   label: "Tier"     },
              { v: sort,    s: setSort,    opts: ["overall","nome","uf"], label: "Ordenar"  },
            ].map((f, i) => (
              <div key={i}>
                <div className="text-[9.5px] t-fg-dim uppercase tracking-wider font-semibold mb-1">{f.label}</div>
                <select
                  value={f.v}
                  onChange={(e) => f.s(e.target.value)}
                  className="btn-ghost w-full"
                  style={{ padding: "6px 9px", fontSize: 12 }}
                >
                  {f.opts.map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
            ))}
            <div className="text-right pl-2 border-l" style={{ borderColor: "var(--rule)" }}>
              <div className="text-[9.5px] t-fg-dim uppercase tracking-wider font-semibold">Resultados</div>
              <div className="text-[18px] font-bold t-fg-strong tnum">
                {results.length}
                {total > 0 && total !== results.length && (
                  <span className="t-fg-muted text-[12px] ml-1">de {total.toLocaleString("pt-BR")}</span>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-4 justify-center" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(204px, 1fr))" }}>
          {results.map((c) => (
            <CardPolitico
              key={c.candidato_id ?? c.id}
              politico={c}
              onAbrirDossie={(id) => {
                // Persiste dados da cartinha pra dossie individual usar (consistencia visual).
                // Backend /dossie/{id} retorna calculo proprio que diverge do MV/radar - bug a corrigir
                // no backend. Enquanto isso, frontend garante que cartinha embarcada bate com a da grade.
                try { sessionStorage.setItem(`dossie_card_${id}`, JSON.stringify(c)); } catch {}
                router.push(`/mazzel-preview/dossies/${id}`);
              }}
            />
          ))}
          {results.length === 0 && (
            <div className="col-span-full t-bg-card ring-soft rounded-xl p-12 text-center">
              <div className="text-[15px] font-semibold t-fg">Nenhum resultado.</div>
              <div className="text-[12px] t-fg-muted mt-1">Ajuste os filtros.</div>
            </div>
          )}
        </div>

        {items && items.length < total && (
          <div className="flex justify-center mt-6">
            <button
              type="button"
              onClick={verMais}
              disabled={carregandoMais}
              className="btn-primary inline-flex items-center gap-2"
              style={{ minWidth: 200 }}
            >
              {carregandoMais ? (
                <><div className="w-3 h-3 border-2 border-t-transparent rounded-full animate-spin" />Carregando…</>
              ) : (
                <>Ver mais {Math.min(POR_PAGINA, total - items.length)} candidatos</>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
