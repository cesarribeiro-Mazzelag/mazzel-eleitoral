"use client";

/**
 * Tab "Em destaque" - V2.
 * Cards narrativos: top votados, suplentes que assumiram,
 * candidatos que quase ganharam (prospeccao).
 * Usa o endpoint /radar/politicos com filtros diferentes por secao.
 */
import useSWR from "swr";
import {
  Trophy, ArrowUp, Target, Swords,
  Info, Loader2, Crown, Clock,
} from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8002";
const tkn = () => (typeof window === "undefined" ? "" : localStorage.getItem("ub_token") ?? "");
const fmt = (n) => (n == null ? "-" : Number(n).toLocaleString("pt-BR"));

const fetcher = async (url) => {
  const r = await fetch(url, { headers: { Authorization: `Bearer ${tkn()}` } });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
};

export function TabDestaque({ onAbrirDossie }) {
  // Top votados 2024
  const { data: topData, isLoading: topLoading } = useSWR(
    `${API}/radar/politicos?ano=2024&apenas_uniao_brasil=false&ordenar_por=votos_total&por_pagina=10`,
    fetcher,
    { revalidateOnFocus: false, dedupingInterval: 60_000 },
  );

  // Suplentes que assumiram
  const { data: suplData, isLoading: suplLoading } = useSWR(
    `${API}/radar/politicos?status=SUPLENTE_ASSUMIU&apenas_uniao_brasil=false&ordenar_por=votos_total&por_pagina=10`,
    fetcher,
    { revalidateOnFocus: false, dedupingInterval: 60_000 },
  );

  // Quase ganharam (suplentes em espera com menor gap)
  const { data: quaseData, isLoading: quaseLoading } = useSWR(
    `${API}/radar/politicos?status=SUPLENTE_ESPERA&ano=2024&apenas_uniao_brasil=false&ordenar_por=votos_faltando&por_pagina=10`,
    fetcher,
    { revalidateOnFocus: false, dedupingInterval: 60_000 },
  );

  // Disputaram 2o turno
  const { data: turno2Data, isLoading: turno2Loading } = useSWR(
    `${API}/radar/politicos?ano=2024&cargo=PREFEITO&apenas_uniao_brasil=false&ordenar_por=votos_total&por_pagina=50`,
    fetcher,
    { revalidateOnFocus: false, dedupingInterval: 60_000 },
  );

  const topVotados = topData?.items ?? [];
  const suplentes = suplData?.items ?? [];
  const quaseGanharam = quaseData?.items ?? [];
  const disputaram2T = (turno2Data?.items ?? []).filter(p => p.disputou_segundo_turno);

  const anyLoading = topLoading || suplLoading || quaseLoading || turno2Loading;

  if (anyLoading && !topData && !suplData) {
    return (
      <div className="flex items-center justify-center py-12 text-gray-400">
        <Loader2 className="w-5 h-5 animate-spin mr-2" /> Carregando destaques...
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* ── Top votados 2024 ──────────────────────────────────────── */}
      <DestaqueSection
        icon={Trophy}
        cor="text-amber-600 bg-amber-50"
        titulo="Mais votados de 2024"
        subtitulo={`${fmt(topVotados.length)} candidatos com maior votacao absoluta`}
      >
        <div className="space-y-0.5">
          {topVotados.slice(0, 5).map((p, i) => (
            <ItemPolitico key={p.candidatura_id} politico={p} rank={i + 1} onAbrirDossie={onAbrirDossie} />
          ))}
        </div>
      </DestaqueSection>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* ── Suplentes que assumiram ───────────────────────────── */}
        <DestaqueSection
          icon={ArrowUp}
          cor="text-blue-600 bg-blue-50"
          titulo="Suplentes que assumiram"
          subtitulo={`${fmt(suplData?.total ?? 0)} em exercicio sem eleicao direta`}
        >
          <div className="space-y-0.5">
            {suplentes.slice(0, 5).map((p, i) => (
              <ItemPolitico key={p.candidatura_id} politico={p} rank={i + 1} onAbrirDossie={onAbrirDossie} badge="Assumiu" badgeCor="bg-blue-100 text-blue-700" />
            ))}
          </div>
        </DestaqueSection>

        {/* ── Quase ganharam (prospeccao) ──────────────────────── */}
        <DestaqueSection
          icon={Target}
          cor="text-orange-600 bg-orange-50"
          titulo="Quase ganharam"
          subtitulo="Suplentes mais proximos de assumir em 2024"
        >
          <div className="space-y-0.5">
            {quaseGanharam.slice(0, 5).map((p, i) => (
              <ItemPolitico key={p.candidatura_id} politico={p} rank={i + 1} onAbrirDossie={onAbrirDossie}
                extra={p.votos_faltando != null ? (
                  <span className={`text-[9px] font-bold tabular-nums ${p.votos_faltando <= 0 ? "text-green-600" : "text-orange-600"}`}>
                    {p.votos_faltando <= 0 ? `+${fmt(Math.abs(p.votos_faltando))}` : `-${fmt(p.votos_faltando)}`}
                  </span>
                ) : null}
              />
            ))}
          </div>
        </DestaqueSection>
      </div>

      {/* ── Disputaram 2o turno ────────────────────────────────── */}
      <DestaqueSection
        icon={Swords}
        cor="text-purple-600 bg-purple-50"
        titulo="Disputaram 2o turno em 2024"
        subtitulo={`${disputaram2T.length} prefeitos foram ao segundo turno`}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-0.5">
          {disputaram2T.slice(0, 10).map((p, i) => (
            <ItemPolitico key={p.candidatura_id} politico={p} rank={i + 1} onAbrirDossie={onAbrirDossie}
              badge={p.status === "ELEITO" ? "Venceu" : "Perdeu"}
              badgeCor={p.status === "ELEITO" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}
            />
          ))}
        </div>
      </DestaqueSection>
    </div>
  );
}


function DestaqueSection({ icon: Icon, cor, titulo, subtitulo, children }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-3">
      <div className="flex items-center gap-2.5 mb-2.5">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${cor}`}>
          <Icon className="w-4 h-4" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-gray-900">{titulo}</h3>
          <p className="text-[10px] text-gray-500">{subtitulo}</p>
        </div>
      </div>
      {children}
    </div>
  );
}


function ItemPolitico({ politico, rank, onAbrirDossie, badge, badgeCor, extra }) {
  const p = politico;
  const fotoUrl = p.foto_url ? `${API}${p.foto_url}` : null;
  const iniciais = (p.nome ?? "?").split(" ").slice(0, 2).map(s => s?.[0] ?? "").join("").toUpperCase();

  return (
    <div
      onClick={() => onAbrirDossie?.(p.candidato_id)}
      className="flex items-center gap-2 px-2 py-1.5 hover:bg-gray-50 rounded-lg transition-colors cursor-pointer group"
    >
      <span className="text-[10px] font-bold text-gray-300 w-4 text-right tabular-nums">{rank}</span>

      <div className="w-8 h-8 rounded-full overflow-hidden bg-gray-100 border border-white shadow-sm flex-shrink-0">
        {fotoUrl ? (
          <img src={fotoUrl} alt={p.nome} className="w-full h-full object-cover" loading="lazy" />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-brand-600 text-white text-[10px] font-bold">
            {iniciais}
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <p className="text-xs font-semibold text-gray-900 truncate">{p.nome}</p>
          {badge && (
            <span className={`text-[8px] font-bold px-1 py-0.5 rounded ${badgeCor}`}>{badge}</span>
          )}
          {p.disputou_segundo_turno && !badge && (
            <span className="text-[8px] font-bold px-1 py-0.5 rounded bg-purple-100 text-purple-700">2T</span>
          )}
        </div>
        <p className="text-[10px] text-gray-500 truncate">
          {p.cargo} - {p.partido_sigla} - {p.estado_uf}
        </p>
      </div>

      <div className="text-right flex-shrink-0">
        {extra || (
          <>
            <p className="text-xs font-black text-gray-900 tabular-nums">{fmt(p.votos_total)}</p>
            <p className="text-[8px] text-gray-400">votos</p>
          </>
        )}
      </div>

      <button
        onClick={(e) => { e.stopPropagation(); onAbrirDossie?.(p.candidato_id); }}
        className="p-1 text-gray-300 group-hover:text-brand-600 transition-colors"
      >
        <Info className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
