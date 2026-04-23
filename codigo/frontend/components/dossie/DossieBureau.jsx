"use client";

/**
 * /radar/politicos/[id] - Ficha de Analise do Candidato (Bureau de Credito Politico)
 *
 * Promovido do mockup em 19/04/2026. Substitui a Champion Page LOL/DOTA2.
 * Backup da versao anterior em page.jsx.bak-champion-page-2026-04-19.
 *
 * Conceito: Serasa / Bureau de investigacao. Score central + dimensoes +
 * flags + KPIs densos. Decisao rapida, leitura em 10 segundos.
 *
 * Tipografia: Barlow + Barlow Condensed.
 * Paleta: violet (#7C3AED) + amber + gray - identidade da plataforma.
 * Base clara bg-slate-50.
 */
import { useParams, useRouter } from "next/navigation";
import { useRef, useState } from "react";
import dynamic from "next/dynamic";
import useSWR from "swr";
import {
  Shield, AlertTriangle, CheckCircle2, XCircle, TrendingUp, TrendingDown,
  Trophy, Target, Vote, Building2, DollarSign, Scale, MapPin, Users,
  Sparkles, Flame, Crown, Briefcase, Activity, ChevronRight,
  Award, RotateCcw, Star, Map, BookOpen, Globe, Instagram, Twitter, Facebook, Youtube,
  ExternalLink, Zap, UserCheck, Download, Loader2, Swords, ArrowLeft,
} from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  ResponsiveContainer, ReferenceLine, Dot,
} from "recharts";
import { API_BASE } from "@/lib/apiBase";
import { CardPolitico } from "@/components/radar/CardPolitico";
import { gerarCartaPng } from "@/lib/cartaDownload";
import { corDoPartido } from "@/lib/farolPartido";

// Mapa eleitoral carregado dinamicamente (evita SSR de MapLibre GL)
const DossieMapaCandidato = dynamic(
  () => import("@/components/dossie/DossieMapaCandidato").then(m => m.DossieMapaCandidato),
  { ssr: false, loading: () => <div className="h-[500px] bg-slate-50 rounded-lg animate-pulse" /> }
);

const tkn = () => (typeof window === "undefined" ? "" : localStorage.getItem("ub_token") ?? "");
const fmt = (n) => (n == null ? "—" : Number(n).toLocaleString("pt-BR"));
const fmtPct = (n) => (n == null ? "—" : `${Math.round(n)}%`);
const fmtMoeda = (n) => n == null ? "—" : `R$ ${Number(n).toLocaleString("pt-BR", { maximumFractionDigits: 0 })}`;
const fetcher = async (url) => {
  const r = await fetch(url, { headers: { Authorization: `Bearer ${tkn()}` } });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
};


export function DossieBureau({ candidatoId }) {
  const params = useParams();
  const id = candidatoId ?? params?.id ?? params?.candidato_id;
  const { data: dossie, error } = useSWR(id ? `${API_BASE}/dossie/${id}` : null, fetcher);

  if (error) return <ErrorState msg={error.message} />;
  if (!dossie) return <Loading />;

  return (
    <div className="min-h-screen bg-slate-50">
      <DashboardHeader dossie={dossie} />
      <div className="max-w-[1400px] mx-auto px-6 py-6 space-y-4">
        {/* Row 1 (Hero): Carta + Overall 8D + Raio-X - altura travada a 422px (altura da cartinha) */}
        <div className="grid grid-cols-12 gap-4 items-start">
          <div className="col-span-12 md:col-span-3 lg:col-span-3 md:h-[422px]">
            <CartinhaDossie dossie={dossie} />
          </div>
          <div className="col-span-12 md:col-span-6 lg:col-span-6 md:h-[422px] overflow-hidden">
            <OverallCompleto dossie={dossie} />
          </div>
          <div className="col-span-12 md:col-span-3 lg:col-span-3 md:h-[422px] overflow-y-auto">
            <RaioXCard dossie={dossie} />
          </div>
        </div>

        {/* Row 2: KPI grid (6 indicadores-chave do ciclo atual) */}
        <KPIGrid dossie={dossie} />

        {/* Row 3: Scores Consolidados (5 dimensoes estilo Serasa) */}
        <ScoresConsolidadosCard dossie={dossie} />

        {/* Row 4: Resumo Executivo (narrativa IA) */}
        <ResumoExecutivoCard dossie={dossie} />

        {/* Row 5: Alertas dedicado (se houver) */}
        <AlertasCard dossie={dossie} />

        {/* Row 5b: Chapa eleitoral (vice/titular em cargos majoritarios) */}
        <ChapaEleitoralCard dossie={dossie} />

        {/* Row 6: Benchmarking (candidato vs pares) */}
        <BenchmarkingCard dossie={dossie} />

        {/* Row 7: Desempenho Eleitoral (line chart evolucao + folga vs corte + regioes) */}
        <DesempenhoEleitoralCard dossie={dossie} />

        {/* Row 6: Mapa Eleitoral + Redutos (items-start evita Redutos esticar vazio a altura do mapa) */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 items-start">
          <MapaEleitoralCard dossie={dossie} />
          <RedutosCard dossie={dossie} />
        </div>

        {/* Row 7: Atividade Executiva (se teve mandato executivo) */}
        {dossie.executivo?.disponivel
          ? <ExecutivoPanel ex={dossie.executivo} />
          : <PlaceholderAtividade dossie={dossie} tipo="executivo" />}

        {/* Row 8: Atividade Legislativa (se teve mandato legislativo) */}
        {dossie.legislativo?.disponivel
          ? <LegislativoPanel legis={dossie.legislativo} />
          : <PlaceholderAtividade dossie={dossie} tipo="legislativo" />}

        {/* Row 9: Trajetoria Eleitoral + Carreira Publica (items-start evita esticar card curto ao alto do maior) */}
        {dossie.carreira_publica?.disponivel ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
            <TrajetoriaCard traj={dossie.trajetoria} />
            <CarreiraPublicaCard carreira={dossie.carreira_publica} />
          </div>
        ) : (
          <TrajetoriaCard traj={dossie.trajetoria} />
        )}

        {/* Row 10: Perfil Politico (partidos, ideologia, alinhamentos) + Biografia */}
        {(dossie.identificacao?.bio_resumida || dossie.identificacao?.wikipedia_url) ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
            <div className="lg:col-span-2">
              <PerfilPoliticoCard dossie={dossie} />
            </div>
            <div className="lg:col-span-1">
              <BiografiaCard dossie={dossie} />
            </div>
          </div>
        ) : (
          <PerfilPoliticoCard dossie={dossie} />
        )}

        {/* Row 11: Financeiro + Juridico */}
        <div className="grid grid-cols-12 gap-4">
          <div className="col-span-12 lg:col-span-6">
            <FinanceiroCard fin={dossie.financeiro} />
          </div>
          <div className="col-span-12 lg:col-span-6">
            <JuridicoCard juridico={dossie.juridico} />
          </div>
        </div>

        {/* Row 12: Redes Sociais */}
        <RedesSociaisCard dossie={dossie} />

        <FooterMeta dossie={dossie} />
      </div>
    </div>
  );
}


/* ── Header do avaliado ────────────────────────────────────────── */
function DashboardHeader({ dossie }) {
  const ident = dossie.identificacao;
  const perfil = dossie.perfil_politico;
  const ultimo = dossie.trajetoria?.cargos_disputados?.[0];
  const eleito = ultimo?.resultado === "ELEITO";
  const router = useRouter();

  const voltar = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
    } else {
      router.push("/radar/politicos");
    }
  };

  return (
    <div className="bg-white border-b border-slate-200 sticky top-0 z-10 shadow-sm">
      <div className="max-w-[1400px] mx-auto px-6 py-3 flex items-center gap-4">
        <button
          onClick={voltar}
          title="Voltar"
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-slate-500 hover:text-brand-700 hover:bg-brand-50 transition-colors text-xs font-semibold flex-shrink-0"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="hidden sm:inline">Voltar</span>
        </button>

        {/* Avatar compacto */}
        <div className="w-14 h-14 rounded-full overflow-hidden bg-slate-100 border-2 border-white shadow-md flex-shrink-0">
          {ident.foto_url ? (
            <img
              src={ident.foto_url?.startsWith("http") ? ident.foto_url : `${process.env.NEXT_PUBLIC_API_URL ?? ""}${ident.foto_url ?? ""}`}
              alt={ident.nome_urna}
              className="w-full h-full object-cover object-top"
              onError={e => e.target.style.display = 'none'}
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center text-white font-black">
              {(ident.nome_urna || ident.nome || "?").charAt(0)}
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2 mb-0.5">
            <h1 className="text-xl font-black tracking-tight text-slate-900 truncate font-display uppercase">
              {ident.nome_urna || ident.nome}
            </h1>
            {ident.nome_urna && ident.nome && ident.nome_urna !== ident.nome && (
              <span className="text-xs text-slate-500 truncate">· {ident.nome}</span>
            )}
          </div>
          <div className="flex items-center gap-3 text-xs text-slate-600">
            <span className="font-semibold">{ultimo?.cargo || "—"}</span>
            <span className="text-slate-300">|</span>
            <span>{ultimo?.estado_uf || "—"}</span>
            <span className="text-slate-300">|</span>
            <span className="font-semibold text-brand-700">{perfil?.partido_atual || "—"}</span>
            <span className="text-slate-300">|</span>
            <span>Ciclo {ultimo?.ano || "—"}</span>
            {eleito && (
              <>
                <span className="text-slate-300">|</span>
                <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Eleito
                </span>
              </>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 text-[10px] uppercase tracking-wider text-slate-500">
          <span>Relatorio gerado em</span>
          <span className="font-bold text-slate-700">{new Date().toLocaleDateString("pt-BR")}</span>
        </div>
      </div>
    </div>
  );
}


/* ── Cartinha (Card Politico V8 com download ao lado) ──────────── */
function CartinhaDossie({ dossie }) {
  const ident = dossie.identificacao;
  const perfil = dossie.perfil_politico;
  const ultimo = dossie.trajetoria?.cargos_disputados?.[0];
  const fifa = dossie.inteligencia?.overall_fifa ?? {};
  const cardRef = useRef(null);
  const [baixando, setBaixando] = useState(false);

  const politicoData = {
    candidato_id: ident.id,
    nome: ident.nome_urna || ident.nome,
    foto_url: ident.foto_url,
    overall: dossie.overall_ultimo_ciclo ?? fifa.overall,
    tier: fifa.tier || "bronze",
    atributos_6: fifa.atributos_6 || {},
    eleito: ultimo?.resultado === "ELEITO",
    disputou_segundo_turno: ultimo?.disputou_segundo_turno,
    cargo: ultimo?.cargo,
    estado_uf: ultimo?.estado_uf,
    ano: ultimo?.ano,
    votos_total: ultimo?.disputou_segundo_turno && ultimo?.votos_2t
      ? ultimo.votos_2t
      : ultimo?.votos,
    partido_sigla: perfil?.partido_atual,
    partido_cor: corDoPartido(ultimo?.partido_numero ?? 0),
  };

  const baixarCarta = async () => {
    if (baixando || !cardRef.current) return;
    setBaixando(true);
    try {
      await gerarCartaPng(cardRef.current, politicoData);
    } catch (err) {
      console.error("Erro ao gerar carta:", err);
      alert("Não foi possível gerar a imagem da carta.");
    } finally {
      setBaixando(false);
    }
  };

  return (
    <div className="sticky top-24 flex flex-col items-center w-full">
      <div className="relative group" style={{ width: 240, height: 422 }}>
        <CardPolitico ref={cardRef} politico={politicoData} width={240} height={422} />
        <button
          onClick={baixarCarta}
          disabled={baixando}
          title={baixando ? "Gerando..." : "Baixar carta"}
          className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity w-9 h-9 flex items-center justify-center rounded-full bg-white/95 backdrop-blur-sm shadow-lg border border-gray-200 text-gray-700 hover:text-purple-600 hover:border-purple-300 disabled:cursor-wait"
        >
          {baixando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
}


/* ── Overall completo (numero + radar + barras + traits + bonus) ─ */
function OverallCompleto({ dossie }) {
  const fifa = dossie.inteligencia?.overall_fifa ?? {};
  const overall = fifa.overall ?? dossie.overall_ultimo_ciclo;
  const ultimo = dossie.trajetoria?.cargos_disputados?.[0];
  const cor = corDoPartido(ultimo?.partido_numero ?? 0);
  const tier = tierFrom(overall);
  const bonus = fifa.bonus_aplicados ?? [];
  const penalidades = fifa.penalidades_aplicadas ?? [];

  // 8 dimensoes (octogono) - schema OverallFifa tem cada valor em campo separado
  // (fifa.votacao, fifa.eficiencia, ...) NAO em fifa.atributos_6.VOT (esse eh do
  // _calcular_fifa_lite usado na listagem do Radar). Fix Cesar 20/04: radar do
  // Wagner estava vazio porque lia fifa.atributos_6 que nao existe aqui.
  const dims = [
    { key: "VOT", valor: fifa.votacao,     desc: "Volume eleitoral" },
    { key: "EFI", valor: fifa.eficiencia,  desc: "Taxa vitória + custo/voto" },
    { key: "ART", valor: fifa.articulacao, desc: "Projetos aprovados" },
    { key: "FID", valor: fifa.fidelidade,  desc: "Coerência + lealdade partidária" },
    { key: "FIN", valor: fifa.financeiro,  desc: "Gestão financeira" },
    { key: "TER", valor: fifa.territorial, desc: "Amplitude territorial" },
    { key: "POT", valor: fifa.potencial,   desc: "Momentum" },
    { key: "INT", valor: fifa.integridade, desc: "Ficha limpa + sanções" },
  ];
  const semDados = dims.every(d => d.valor == null);

  const cx = 140, cy = 140, r = 100;
  const n = dims.length;
  const pontos = (raio) => dims.map((_, i) => {
    const a = (Math.PI * 2 * i) / n - Math.PI / 2;
    return [cx + raio * Math.cos(a), cy + raio * Math.sin(a)];
  });
  const gridLevels = [0.2, 0.4, 0.6, 0.8, 1.0];
  const valorPontos = dims.map((d, i) => {
    const ratio = (d.valor ?? 0) / 99;
    const a = (Math.PI * 2 * i) / n - Math.PI / 2;
    return [cx + r * ratio * Math.cos(a), cy + r * ratio * Math.sin(a)];
  });
  const valorPath = valorPontos.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x},${y}`).join(" ") + " Z";
  const labelPontos = pontos(r + 22);

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm h-full flex flex-col">
      {/* Header: numero grande + titulo + nome do atributo mais forte */}
      <div className="flex items-start gap-3 mb-3">
        <div className="flex-shrink-0 w-20 h-20 rounded-xl bg-white border border-slate-200 flex flex-col items-center justify-center shadow-sm">
          <span className="text-[40px] font-black leading-none tabular-nums font-display" style={{ color: tier.color }}>
            {overall ?? "—"}
          </span>
          <span className="text-[9px] font-bold uppercase tracking-[0.15em] mt-0.5" style={{ color: tier.color }}>
            {tier.label}
          </span>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Shield className="w-4 h-4 text-slate-700" />
            <h3 className="text-sm font-black uppercase tracking-wider text-slate-900 font-display">Overall</h3>
          </div>
          <p className="text-[11px] text-slate-600 leading-snug">
            Nota composta pelas 8 dimensões abaixo (0–99). Verde indica ponto forte; vermelho, a melhorar.
          </p>
        </div>
      </div>

      {/* Grid: Radar SVG + Barras horizontais (schema OverallFifa: fifa.votacao etc) */}
      <div className="bg-slate-50 rounded-lg p-3 flex-1 min-h-0">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-center h-full">
          {/* SVG Radar octogonal */}
          <svg viewBox="0 0 280 280" className="w-full max-w-[220px] mx-auto">
            {gridLevels.map((level, gi) => {
              const pts = pontos(r * level);
              const d = pts.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x},${y}`).join(" ") + " Z";
              return <path key={gi} d={d} fill="none" stroke="#e5e7eb" strokeWidth={gi === gridLevels.length - 1 ? 1 : 0.5} />;
            })}
            {pontos(r).map(([x, y], i) => (
              <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="#e5e7eb" strokeWidth={0.5} />
            ))}
            {!semDados && (
              <>
                <path d={valorPath} fill={`${cor}25`} stroke={cor} strokeWidth={2} />
                {valorPontos.map(([x, y], i) => (
                  <circle key={i} cx={x} cy={y} r={3.5} fill={cor} />
                ))}
              </>
            )}
            {labelPontos.map(([x, y], i) => (
              <g key={i}>
                <text x={x} y={y - 4} textAnchor="middle" className="text-[10px] font-bold fill-slate-500">{dims[i].key}</text>
                <text x={x} y={y + 9} textAnchor="middle" className="text-[12px] font-black fill-slate-900">
                  {dims[i].valor != null ? dims[i].valor : "—"}
                </text>
              </g>
            ))}
          </svg>

          {/* Barras horizontais */}
          <div className="space-y-1.5">
            {dims.map(d => {
              const valor = d.valor;
              const temDado = valor != null;
              const cl = !temDado ? "text-slate-300" : valor >= 70 ? "text-emerald-700" : valor >= 40 ? "text-amber-700" : "text-red-700";
              return (
                <div key={d.key} className="flex items-center gap-2" title={d.desc}>
                  <span className={`text-xs font-black tabular-nums w-7 text-right ${cl}`}>
                    {temDado ? valor : "—"}
                  </span>
                  <div className="flex-1 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-700" style={{ width: `${valor ?? 0}%`, backgroundColor: cor }} />
                  </div>
                  <span className="text-[10px] font-bold text-slate-500 tracking-wide w-7">{d.key}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Bonus e penalidades */}
        {(bonus.length > 0 || penalidades.length > 0) && (
          <div className="mt-2 pt-2 border-t border-slate-200 space-y-0.5">
            {bonus.map((b, i) => (
              <p key={`b${i}`} className="text-[10px] text-emerald-700"><span className="font-bold">+</span> {b}</p>
            ))}
            {penalidades.map((p, i) => (
              <p key={`p${i}`} className="text-[10px] text-red-700"><span className="font-bold">−</span> {p}</p>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}


/* ── Flags / Alertas ───────────────────────────────────────────── */
/**
 * RaioXCard - painel lateral consolidado do Hero.
 * Combina: identidade (idade/naturalidade/escolaridade/ideologia),
 * status juridico compacto (3 flags), traits politicos formais e
 * primeiros alertas. Substituiu FlagsCard + DadosPessoaisCard.
 */
function RaioXCard({ dossie }) {
  const ident = dossie.identificacao ?? {};
  const perfil = dossie.perfil_politico ?? {};
  const comp = dossie.comparativos ?? {};
  const juridico = dossie.juridico ?? {};
  const alertas = dossie.inteligencia?.alertas ?? [];
  const classif = dossie.inteligencia?.classificacao ?? {};
  const riscoInfo = riscoFrom(classif.risco_composto);
  const traits = dossie.inteligencia?.overall_fifa?.traits ?? [];

  const sancoesAtivas = juridico.sancoes_ativas ?? 0;
  const fichaLimpa = juridico.ficha_limpa;
  const ciclosInapto = juridico.ciclos_inapto ?? 0;

  const linhas = [
    { label: "Idade",         valor: ident.idade ? `${ident.idade} anos` : null },
    { label: "Natural de",    valor: ident.naturalidade ? `${ident.naturalidade}${ident.estado_nascimento ? `/${ident.estado_nascimento}` : ""}` : null },
    { label: "Escolaridade",  valor: ident.grau_instrucao || null },
    { label: "Ocupação",      valor: ident.ocupacao || null },
    { label: "Gênero",        valor: ident.genero || null },
    { label: "Ideologia",     valor: perfil.ideologia_aproximada || null },
  ].filter(l => l.valor);

  const colocacaoPartido = comp.colocacao_no_partido;

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm h-full flex flex-col overflow-hidden">
      {/* Header: risco composto + colocacao no partido */}
      <div className="px-5 pt-4 pb-3 border-b border-slate-100 flex items-center justify-between">
        <p className="text-[10px] uppercase tracking-[0.18em] font-bold text-slate-500">Raio-X</p>
        <div className="flex items-center gap-1.5">
          {colocacaoPartido != null && colocacaoPartido > 0 && (
            <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-violet-50 text-violet-700 border border-violet-100">
              {colocacaoPartido}º do partido
            </span>
          )}
          <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${riscoInfo.bg} ${riscoInfo.text}`}>
            {riscoInfo.label}
          </span>
        </div>
      </div>

      {/* Dados pessoais compactos */}
      {linhas.length > 0 && (
        <dl className="px-5 py-3 border-b border-slate-100">
          {linhas.map(l => (
            <div key={l.label} className="flex items-baseline justify-between gap-3 py-1">
              <dt className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">{l.label}</dt>
              <dd className="text-[11px] font-bold text-slate-800 text-right truncate max-w-[65%]">{l.valor}</dd>
            </div>
          ))}
        </dl>
      )}

      {/* Status juridico compacto - 3 flags */}
      <div className="px-5 py-3 border-b border-slate-100 space-y-1.5">
        <FlagInline
          positivo={fichaLimpa !== false}
          label="Ficha limpa"
          sub={fichaLimpa === true ? "Apto" : fichaLimpa === false ? "Inapto" : "—"}
        />
        <FlagInline
          positivo={sancoesAtivas === 0}
          label="Sanções CGU/TCU"
          sub={sancoesAtivas > 0 ? `${sancoesAtivas} ativa(s)` : "Nenhuma"}
        />
        <FlagInline
          positivo={ciclosInapto === 0}
          label="Histórico"
          sub={ciclosInapto > 0 ? `${ciclosInapto} ciclo(s) inapto` : "Sem restrições"}
        />
      </div>

      {/* Traits politicos formais */}
      {traits.length > 0 && (
        <div className="px-5 py-3 border-b border-slate-100">
          <p className="text-[10px] uppercase tracking-[0.18em] font-bold text-slate-500 mb-2">Perfil de Carreira</p>
          <div className="flex flex-wrap gap-1.5">
            {traits.map(t => {
              const info = TRAIT_FORMAL[t];
              if (!info) return null;
              const Icon = info.Icon;
              return (
                <span key={t} className={`text-[10px] font-bold ${info.color} ${info.bg} border px-2 py-0.5 rounded inline-flex items-center gap-1 uppercase tracking-wide`}>
                  <Icon className="w-3 h-3" /> {info.label}
                </span>
              );
            })}
          </div>
        </div>
      )}

      {/* Alertas de inteligencia (top 2, compacto) */}
      {alertas.length > 0 && (
        <div className="px-5 py-3 flex-1 space-y-1.5">
          <p className="text-[10px] uppercase tracking-[0.18em] font-bold text-slate-500 mb-1">Alertas</p>
          {alertas.slice(0, 2).map((a, i) => (
            <div key={i} className="flex items-start gap-1.5 text-[11px] text-slate-700 leading-tight">
              <AlertTriangle className="w-3 h-3 flex-shrink-0 mt-0.5 text-amber-600" />
              <span>{a}</span>
            </div>
          ))}
          {alertas.length > 2 && (
            <p className="text-[10px] text-slate-400 pt-1">+ {alertas.length - 2} na análise detalhada</p>
          )}
        </div>
      )}
    </div>
  );
}

function FlagInline({ positivo, label, sub }) {
  const Icon = positivo ? CheckCircle2 : AlertTriangle;
  const corIcon = positivo ? "text-emerald-600" : "text-amber-600";
  return (
    <div className="flex items-center justify-between gap-2">
      <div className="flex items-center gap-1.5 min-w-0">
        <Icon className={`w-3.5 h-3.5 flex-shrink-0 ${corIcon}`} />
        <span className="text-[11px] font-semibold text-slate-700 truncate">{label}</span>
      </div>
      <span className="text-[10px] text-slate-500 font-medium flex-shrink-0">{sub}</span>
    </div>
  );
}

/**
 * Traits formais exibidos em todos os cards/paineis (zero gamer).
 * Backend hoje retorna LEGEND/CAMPEAO/FERA/COMEBACK/ESTREANTE - mapeados
 * para nomes politicos formais conforme project_uniao_brasil_card_v2.md.
 * HEGEMONICO e ASCENDEU sao trait futuros (backend ainda nao emite).
 */
const TRAIT_FORMAL = {
  LEGEND:     { Icon: Trophy,      label: "Reeleito",      color: "text-slate-700",   bg: "bg-slate-50 border-slate-200" },
  CAMPEAO:    { Icon: Award,       label: "Eleito",        color: "text-amber-800",   bg: "bg-amber-50 border-amber-200" },
  FERA:       { Icon: TrendingUp,  label: "Mais votado",   color: "text-blue-700",    bg: "bg-blue-50 border-blue-200" },
  COMEBACK:   { Icon: RotateCcw,   label: "Retomou mandato", color: "text-purple-700", bg: "bg-purple-50 border-purple-200" },
  ESTREANTE:  { Icon: Sparkles,    label: "Estreante",     color: "text-emerald-700", bg: "bg-emerald-50 border-emerald-200" },
  HEGEMONICO: { Icon: Target,      label: "Hegemônico",    color: "text-rose-700",    bg: "bg-rose-50 border-rose-200" },
  ASCENDEU:   { Icon: TrendingUp,  label: "Ascendeu",      color: "text-indigo-700",  bg: "bg-indigo-50 border-indigo-200" },
};


/* ── KPI Grid (6 cards densos) ───────────────────────────────── */
function KPIGrid({ dossie }) {
  const d = dossie.desempenho_eleitoral ?? {};
  const comp = dossie.comparativos ?? {};
  const fin = dossie.financeiro ?? {};
  const traj = dossie.trajetoria?.cargos_disputados ?? [];
  const eleicoesVencidas = traj.filter(c => c.resultado === "ELEITO").length;
  const taxaVitoria = traj.length > 0 ? Math.round(eleicoesVencidas / traj.length * 100) : null;

  // Votos ciclo atual: mesma logica do card FIFA - priorizar votos_2t quando disputou segundo turno
  // (evita somar 1T + 2T, que e o bug relatado em Lula/Boulos/etc.)
  const ultimo = traj[0];
  const votosCicloAtual = ultimo?.disputou_segundo_turno && ultimo?.votos_2t
    ? ultimo.votos_2t
    : (ultimo?.votos ?? d.total_votos);
  const subCiclo = ultimo?.disputou_segundo_turno
    ? `${ultimo?.ano ?? d.ciclo_ano ?? "—"} · 2º turno`
    : `${ultimo?.ano ?? d.ciclo_ano ?? "—"}`;

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
      <KPICard icon={Vote} label="Votos ciclo atual" value={fmt(votosCicloAtual)} sub={subCiclo} accent="violet" />
      <KPICard icon={Trophy} label="Votos carreira" value={fmt(d.votos_carreira)} sub={`${traj.length} eleições`} accent="indigo" />
      <KPICard
        icon={Target}
        label="Colocação"
        value={comp.posicao_ranking ? `${comp.posicao_ranking}º` : "—"}
        sub={comp.total_candidatos ? `de ${fmt(comp.total_candidatos)}` : "—"}
        accent="blue"
      />
      <KPICard icon={Sparkles} label="Taxa de vitória" value={taxaVitoria != null ? `${taxaVitoria}%` : "—"} sub={`${eleicoesVencidas}/${traj.length}`} accent="emerald" />
      <KPICard icon={DollarSign} label="Gasto campanha" value={fmtMoedaCurto(fin.total_gasto)} sub="última campanha" accent="amber" />
      <KPICard
        icon={Activity}
        label="Custo por voto"
        value={fin.cpv_benchmark?.valor ? `R$ ${Math.round(fin.cpv_benchmark.valor)}` : "—"}
        sub={fin.cpv_benchmark?.posicao_relativa ?? "—"}
        accent="rose"
      />
    </div>
  );
}

function KPICard({ icon: Icon, label, value, sub, accent = "violet" }) {
  const map = {
    violet:  { bg: "bg-brand-50",    iconBg: "bg-brand-100",    iconText: "text-brand-600",    ring: "ring-brand-100" },
    indigo:  { bg: "bg-indigo-50",   iconBg: "bg-indigo-100",   iconText: "text-indigo-600",   ring: "ring-indigo-100" },
    blue:    { bg: "bg-sky-50",      iconBg: "bg-sky-100",      iconText: "text-sky-600",      ring: "ring-sky-100" },
    emerald: { bg: "bg-emerald-50",  iconBg: "bg-emerald-100",  iconText: "text-emerald-600", ring: "ring-emerald-100" },
    amber:   { bg: "bg-amber-50",    iconBg: "bg-amber-100",    iconText: "text-amber-700",   ring: "ring-amber-100" },
    rose:    { bg: "bg-rose-50",     iconBg: "bg-rose-100",     iconText: "text-rose-600",    ring: "ring-rose-100" },
  }[accent];
  return (
    <div className={`bg-white border border-slate-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow`}>
      <div className="flex items-start justify-between mb-3">
        <div className={`w-9 h-9 rounded-lg ${map.iconBg} flex items-center justify-center`}>
          <Icon className={`w-4.5 h-4.5 ${map.iconText}`} />
        </div>
      </div>
      <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold mb-1">{label}</p>
      <p className="text-2xl font-black tabular-nums text-slate-900 font-display leading-none">{value}</p>
      {sub && <p className="text-[11px] text-slate-500 mt-1 tabular-nums">{sub}</p>}
    </div>
  );
}


/* ── Placeholder informativo para cargos com infra de atividade pendente ─
 * Decide o que mostrar com base em: ultimo cargo disputado + foi eleito.
 * - Legislativo: Vereador (só SP hoje tem dados), Dep Estadual (0), Dep Federal, Senador, Vereador de outras capitais.
 * - Executivo: Presidente (dados parciais), Governador (0), Prefeito (0).
 * Retorna null se candidato nunca disputou cargo do tipo - nao polui a pagina.
 */
const _CARGOS_LEGISLATIVOS = new Set(["VEREADOR", "DEPUTADO ESTADUAL", "DEPUTADO DISTRITAL", "DEPUTADO FEDERAL", "SENADOR"]);
const _CARGOS_EXECUTIVOS = new Set(["PRESIDENTE", "GOVERNADOR", "PREFEITO"]);

function PlaceholderAtividade({ dossie, tipo }) {
  const cargos = dossie.trajetoria?.cargos_disputados ?? [];
  const set = tipo === "legislativo" ? _CARGOS_LEGISLATIVOS : _CARGOS_EXECUTIVOS;

  // Pega o cargo mais recente do tipo + se foi eleito nele
  const ultimo = cargos.find(c => set.has((c.cargo || "").toUpperCase()));
  if (!ultimo) return null;
  const foiEleito = ultimo.resultado === "ELEITO";
  if (!foiEleito) return null;  // nao eleito no tipo: nao mostra placeholder

  const cargo = (ultimo.cargo || "").toUpperCase();
  const tituloBloco = tipo === "legislativo" ? "Atividade Legislativa" : "Atividade no Executivo";
  const icone = tipo === "legislativo" ? Building2 : Crown;
  const Icone = icone;

  // Mensagem especifica por cargo
  const mensagens = {
    "VEREADOR":          "A integração de proposições municipais está disponível hoje apenas para São Paulo capital. Outras câmaras serão liberadas conforme rollout.",
    "DEPUTADO ESTADUAL": "A integração com as Assembleias Legislativas estaduais está em preparação. Dados ainda não disponíveis.",
    "DEPUTADO DISTRITAL":"A integração com a Câmara Legislativa do DF está em preparação.",
    "DEPUTADO FEDERAL":  "Os dados da Câmara Federal estão disponíveis porém ainda com limite parcial por deputado. Expansão em preparação.",
    "SENADOR":           "Dados do Senado Federal disponíveis. Se este painel aparecer vazio, pode ser que o parlamentar não tenha mandato no ciclo ativo.",
    "PRESIDENTE":        "Dados de MPs, PLs, vetos e decretos do Executivo Federal. Se aparecer vazio, verifique o ciclo.",
    "GOVERNADOR":        "A integração com os 27 Diários Oficiais estaduais está em preparação. Projetos de lei e vetos ainda não disponíveis.",
    "PREFEITO":          "A integração com SICONFI (Tesouro Nacional) e diários municipais está em preparação. Execução orçamentária e decretos ainda não disponíveis.",
  };
  const msg = mensagens[cargo] || "Integração de dados em preparação.";

  return (
    <div className="bg-slate-50 border border-dashed border-slate-300 rounded-xl p-6">
      <div className="flex items-start gap-4">
        <div className="w-10 h-10 rounded-lg bg-slate-200 flex items-center justify-center flex-shrink-0">
          <Icone className="w-5 h-5 text-slate-500" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-sm font-black uppercase tracking-wider text-slate-700 font-display">{tituloBloco}</h3>
            <span className="text-[10px] font-black uppercase tracking-wider bg-amber-100 text-amber-800 px-2 py-0.5 rounded">
              Em preparação
            </span>
          </div>
          <p className="text-[12px] text-slate-600 leading-relaxed">
            <span className="font-bold">Candidato eleito como {ultimo.cargo}</span>
            {ultimo.estado_uf && <> por {ultimo.estado_uf}</>}
            {ultimo.municipio && <> ({ultimo.municipio})</>}
            <> em {ultimo.ano}.</> {msg}
          </p>
        </div>
      </div>
    </div>
  );
}


/* ── Painel Executivo (MPs, PLs, Vetos, Decretos) ─────────────── */
function ExecutivoPanel({ ex }) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
      <SectionHeader
        icon={Crown}
        title="Atividade no Executivo"
        subtitle={`${ex.cargo_titulo} · Mandato ${ex.mandato_ano_inicio}–${ex.mandato_ano_fim ?? "atual"} · ${ex.total_atos} atos registrados`}
        accent="brand"
      />

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mb-4">
        {/* Gauge de MPs */}
        <div className="lg:col-span-1 p-4 bg-gradient-to-br from-brand-50 to-white rounded-lg border border-brand-100">
          <p className="text-[10px] uppercase tracking-wider text-brand-700 font-bold mb-2">Medidas Provisórias</p>
          <p className="text-5xl font-black font-display text-brand-900 leading-none tabular-nums">{ex.n_medidas_provisorias}</p>
          {ex.taxa_aprovacao_mps != null && (
            <div className="mt-3">
              <div className="flex items-center justify-between text-[10px] uppercase tracking-wider font-bold mb-1">
                <span className="text-slate-600">Taxa de aprovação</span>
                <span className="text-brand-700">{ex.taxa_aprovacao_mps}%</span>
              </div>
              <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-brand-400 to-brand-600" style={{ width: `${ex.taxa_aprovacao_mps}%` }} />
              </div>
            </div>
          )}
        </div>

        <div className="lg:col-span-3 grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatBox label="Aprovadas" value={ex.n_mps_aprovadas} total={ex.n_medidas_provisorias} color="emerald" />
          <StatBox label="Caducaram" value={ex.n_mps_caducadas} total={ex.n_medidas_provisorias} color="amber" />
          <StatBox label="Rejeitadas" value={ex.n_mps_rejeitadas} total={ex.n_medidas_provisorias} color="red" />
          <StatBox label="Sem info" value={ex.n_medidas_provisorias - (ex.n_mps_aprovadas + ex.n_mps_rejeitadas + ex.n_mps_caducadas)} total={ex.n_medidas_provisorias} color="slate" />
          <StatBox label="PLs enviados" value={ex.n_pls_enviados} color="indigo" />
          <StatBox label="PLs Complementares" value={ex.n_plps_enviados} color="indigo" />
          <StatBox label="PECs" value={ex.n_pecs_enviadas} color="indigo" />
          <StatBox label="Vetos" value={ex.n_vetos} color="rose" />
        </div>
      </div>

      {/* Ultimas MPs e PLs - com ementa */}
      {(ex.ultimas_mps?.length > 0 || ex.ultimos_pls?.length > 0) && (
        <div className="pt-4 border-t border-slate-100 grid grid-cols-1 lg:grid-cols-2 gap-4">
          {ex.ultimas_mps?.length > 0 && (
            <div>
              <p className="text-[10px] uppercase tracking-[0.15em] text-slate-500 font-bold mb-3">
                Últimas Medidas Provisórias · {ex.ultimas_mps.length}
              </p>
              <div className="space-y-2">
                {ex.ultimas_mps.slice(0, 5).map((mp, i) => (
                  <AtoExecutivoLinha key={i} ato={mp} tipoSigla="MP" accent="brand" />
                ))}
              </div>
            </div>
          )}
          {ex.ultimos_pls?.length > 0 && (
            <div>
              <p className="text-[10px] uppercase tracking-[0.15em] text-slate-500 font-bold mb-3">
                Últimos Projetos de Lei · {ex.ultimos_pls.length}
              </p>
              <div className="space-y-2">
                {ex.ultimos_pls.slice(0, 5).map((pl, i) => (
                  <AtoExecutivoLinha key={i} ato={pl} tipoSigla={pl.tipo?.includes("PEC") ? "PEC" : pl.tipo?.includes("PLP") ? "PLP" : "PL"} accent="indigo" />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function AtoExecutivoLinha({ ato, tipoSigla, accent }) {
  const paletteSigla = {
    brand:  "text-brand-700",
    indigo: "text-indigo-700",
  }[accent] || "text-slate-700";
  const ementa = ato.ementa ? ato.ementa.slice(0, 200) + (ato.ementa.length > 200 ? "…" : "") : null;
  const corStatus = ato.aprovada === true ? "text-emerald-700" : ato.aprovada === false ? "text-red-700" : "text-slate-500";
  return (
    <div className="flex gap-3 p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors">
      <div className="flex-shrink-0 w-14 text-center">
        <p className={`text-[10px] font-black uppercase ${paletteSigla}`}>{tipoSigla}</p>
        <p className="text-base font-black font-display tabular-nums text-slate-900 leading-none">{ato.numero}</p>
        <p className="text-[10px] text-slate-500 tabular-nums">/{ato.ano}</p>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[12px] text-slate-800 leading-snug">
          {ementa || <span className="text-slate-400 italic">Sem ementa disponível.</span>}
        </p>
        {ato.situacao && (
          <p className={`text-[10px] mt-1 uppercase tracking-wide font-semibold ${corStatus}`}>
            {ato.situacao}
          </p>
        )}
      </div>
    </div>
  );
}

function StatBox({ label, value, total, color = "slate" }) {
  const colors = {
    emerald: "text-emerald-700 bg-emerald-50 border-emerald-200",
    amber:   "text-amber-700 bg-amber-50 border-amber-200",
    red:     "text-red-700 bg-red-50 border-red-200",
    rose:    "text-rose-700 bg-rose-50 border-rose-200",
    slate:   "text-slate-600 bg-slate-50 border-slate-200",
    indigo:  "text-indigo-700 bg-indigo-50 border-indigo-200",
  }[color];
  const pct = total && total > 0 ? Math.round((value / total) * 100) : null;
  return (
    <div className={`border rounded-lg p-3 ${colors}`}>
      <p className="text-[9px] uppercase tracking-wider font-bold opacity-80">{label}</p>
      <p className="text-2xl font-black font-display tabular-nums leading-none mt-1">{fmt(value)}</p>
      {pct != null && <p className="text-[10px] opacity-70 mt-1">{pct}% do total</p>}
    </div>
  );
}


/* ── Painel Legislativo (expandido: projetos por tipo, temas, relatorias) ─ */
function LegislativoPanel({ legis }) {
  const taxa = legis.projetos_apresentados > 0
    ? Math.round((legis.projetos_aprovados / legis.projetos_apresentados) * 100)
    : null;

  const temas = legis.temas_atuacao ?? [];
  const aprovadas = legis.ultimas_aprovadas ?? [];
  const tramitando = legis.ultimas_em_tramitacao ?? [];
  const vetadas = legis.ultimas_vetadas ?? [];
  const relatorias = legis.relatorias_recentes ?? [];
  const presidencias = legis.presidencias ?? [];
  const comissoes = legis.comissoes_atuais ?? [];

  const licenciado = !!legis.licenciado_para;
  const situacaoEspecial = (legis.situacao || "").toLowerCase();
  const naoAtivo = ["licenciado", "afastado", "suplente", "licença"].some(t => situacaoEspecial.includes(t));

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
      <SectionHeader
        icon={Building2}
        title="Atividade Legislativa"
        subtitle={`${legis.cargo_titulo} · ${legis.uf || ""} · ${legis.periodo_legislatura || "Mandato atual"}`}
        accent="indigo"
      />

      {/* Status do mandato - destaque se licenciado/afastado/suplente */}
      {(licenciado || legis.situacao || legis.condicao_eleitoral) && (
        <div className={`mb-4 p-3 rounded-lg border flex items-center gap-3 ${
          licenciado || naoAtivo ? "bg-amber-50 border-amber-200" : "bg-slate-50 border-slate-200"
        }`}>
          <AlertTriangle className={`w-4 h-4 flex-shrink-0 ${
            licenciado || naoAtivo ? "text-amber-600" : "text-slate-500"
          }`} />
          <div className="flex-1 min-w-0">
            {licenciado ? (
              <>
                <p className="text-[11px] uppercase tracking-wider font-bold text-amber-700">
                  Mandato licenciado
                </p>
                <p className="text-xs text-amber-900 font-semibold mt-0.5">
                  Licenciado para: <span className="font-black">{legis.licenciado_para}</span>
                  <span className="text-amber-700 font-normal"> · suplente assumiu a cadeira durante a licença</span>
                </p>
              </>
            ) : (
              <>
                <div className="flex items-center gap-3 flex-wrap text-[12px]">
                  {legis.situacao && (
                    <span className="inline-flex items-center gap-1.5">
                      <span className="text-[10px] uppercase tracking-wider font-bold text-slate-500">Situação:</span>
                      <span className="font-black text-slate-800">{legis.situacao}</span>
                    </span>
                  )}
                  {legis.condicao_eleitoral && (
                    <span className="inline-flex items-center gap-1.5">
                      <span className="text-[10px] uppercase tracking-wider font-bold text-slate-500">Condição:</span>
                      <span className="font-black text-slate-800">{legis.condicao_eleitoral}</span>
                    </span>
                  )}
                  {legis.alinhamento_votacoes != null && (
                    <span className="inline-flex items-center gap-1.5">
                      <span className="text-[10px] uppercase tracking-wider font-bold text-slate-500">Alinhamento em votações:</span>
                      <span className="font-black text-indigo-700 tabular-nums">{Math.round(legis.alinhamento_votacoes)}%</span>
                    </span>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Linha 1: produção + 6 KPIs */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 mb-4">
        <div className="lg:col-span-2 p-4 bg-indigo-50 rounded-lg border border-indigo-100">
          <p className="text-[10px] uppercase tracking-wider font-bold text-indigo-700 mb-2">Produção Total</p>
          <p className="text-5xl font-black font-display text-indigo-900 leading-none tabular-nums">
            {fmt(legis.projetos_apresentados)}
          </p>
          <p className="text-xs text-indigo-700 mt-1">proposições apresentadas</p>
          {taxa != null && (
            <div className="mt-3">
              <div className="flex items-center justify-between text-[10px] uppercase tracking-wider font-bold mb-1">
                <span className="text-slate-600">Taxa de aprovação</span>
                <span className="text-indigo-700">{taxa}%</span>
              </div>
              <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-indigo-400 to-indigo-600" style={{ width: `${taxa}%` }} />
              </div>
            </div>
          )}
        </div>

        <div className="lg:col-span-3 grid grid-cols-2 md:grid-cols-3 gap-3">
          <StatBox label="Aprovados" value={legis.projetos_aprovados} total={legis.projetos_apresentados} color="emerald" />
          <StatBox label="Tramitando" value={legis.projetos_em_tramitacao} total={legis.projetos_apresentados} color="amber" />
          <StatBox label="Vetados" value={legis.projetos_vetados} total={legis.projetos_apresentados} color="red" />
          <StatBox label="Comissões ativas" value={comissoes.length} color="indigo" />
          <StatBox label="Presidências" value={presidencias.length} color="emerald" />
          <StatBox label="Relatorias" value={legis.n_relatorias ?? 0} color="indigo" />
        </div>
      </div>

      {/* Linha 2: Trabalho recente (3 colunas sempre - usuario vê que nao tem aprovado/vetado) */}
      <div className="mt-4 pt-4 border-t border-slate-100">
        <p className="text-[10px] uppercase tracking-[0.15em] text-slate-500 font-bold mb-3">Trabalho recente</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <ListaProjetos titulo="Aprovados" cor="emerald" projetos={aprovadas} icone={CheckCircle2} />
          <ListaProjetos titulo="Em tramitação" cor="amber" projetos={tramitando} icone={Activity} />
          <ListaProjetos titulo="Vetados" cor="red" projetos={vetadas} icone={XCircle} />
        </div>
      </div>

      {/* Linha 3: Temas de atuação (tags) */}
      {temas.length > 0 && (
        <div className="mt-4 pt-4 border-t border-slate-100">
          <p className="text-[10px] uppercase tracking-[0.15em] text-slate-500 font-bold mb-2">Temas de atuação</p>
          <div className="flex flex-wrap gap-1.5">
            {temas.map((t, i) => (
              <span key={i} className="px-2 py-1 rounded-md text-[11px] font-semibold bg-violet-50 text-violet-700 border border-violet-100">
                {t}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Linha 4: Presidências em destaque */}
      {presidencias.length > 0 && (
        <div className="mt-4 pt-4 border-t border-slate-100">
          <p className="text-[10px] uppercase tracking-[0.15em] text-slate-500 font-bold mb-2 flex items-center gap-1.5">
            <Crown className="w-3 h-3 text-amber-500" /> Preside
          </p>
          <div className="flex flex-wrap gap-1.5">
            {presidencias.map((p, i) => (
              <span key={i} className="px-2 py-1 rounded-md text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200 inline-flex items-center gap-1">
                <Crown className="w-3 h-3" /> {p}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Linha 5: Comissoes ativas (titulares/suplentes) */}
      {comissoes.length > 0 && (
        <div className="mt-4 pt-4 border-t border-slate-100">
          <p className="text-[10px] uppercase tracking-[0.15em] text-slate-500 font-bold mb-2">Comissões ativas</p>
          <div className="flex flex-wrap gap-1.5">
            {comissoes.map((c, i) => {
              const presidente = (c.cargo || "").toLowerCase().startsWith("presidente");
              if (presidente) return null;
              return (
                <span
                  key={i}
                  className="inline-flex items-center gap-1 px-2 py-1 rounded text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200"
                >
                  {c.sigla || c.nome?.slice(0, 20)}
                  <span className="opacity-60">· {c.cargo || "Titular"}</span>
                </span>
              );
            })}
          </div>
        </div>
      )}

      {/* Linha 6: Relatorias recentes */}
      {relatorias.length > 0 && (
        <div className="mt-4 pt-4 border-t border-slate-100">
          <p className="text-[10px] uppercase tracking-[0.15em] text-slate-500 font-bold mb-2">Relatorias recentes</p>
          <div className="space-y-1">
            {relatorias.slice(0, 5).map((p, i) => (
              <ProjetoLinha key={i} projeto={p} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ListaProjetos({ titulo, cor, projetos, icone: Icone }) {
  const palette = {
    emerald: { border: "border-emerald-200", headerBg: "bg-emerald-50", headerText: "text-emerald-800", iconText: "text-emerald-600" },
    amber:   { border: "border-amber-200",   headerBg: "bg-amber-50",   headerText: "text-amber-800",   iconText: "text-amber-600" },
    red:     { border: "border-red-200",     headerBg: "bg-red-50",     headerText: "text-red-800",     iconText: "text-red-600" },
  }[cor];

  return (
    <div className={`border ${palette.border} rounded-lg overflow-hidden`}>
      <div className={`${palette.headerBg} px-3 py-2 flex items-center gap-1.5 border-b ${palette.border}`}>
        <Icone className={`w-3.5 h-3.5 ${palette.iconText}`} />
        <span className={`text-[10px] font-black uppercase tracking-wider ${palette.headerText}`}>{titulo}</span>
        <span className={`ml-auto text-[10px] font-bold ${palette.headerText} tabular-nums`}>{projetos.length}</span>
      </div>
      {projetos.length === 0 ? (
        <p className="text-[11px] text-slate-400 italic px-3 py-3 text-center">Nenhum registro recente</p>
      ) : (
        <div className="divide-y divide-slate-100">
          {projetos.slice(0, 5).map((p, i) => (
            <ProjetoLinha key={i} projeto={p} />
          ))}
        </div>
      )}
    </div>
  );
}

function ProjetoLinha({ projeto }) {
  const titulo = `${projeto.sigla_tipo} ${projeto.numero}/${projeto.ano}`;
  const Wrapper = projeto.url ? "a" : "div";
  const wrapperProps = projeto.url ? { href: projeto.url, target: "_blank", rel: "noopener noreferrer" } : {};
  const ementa = projeto.ementa ? projeto.ementa.slice(0, 160) + (projeto.ementa.length > 160 ? "…" : "") : null;
  return (
    <Wrapper {...wrapperProps} className="flex items-start justify-between gap-2 px-3 py-2 hover:bg-slate-50 transition-colors">
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2">
          <p className="text-[11px] font-black text-slate-800 tabular-nums flex-shrink-0">{titulo}</p>
          {projeto.situacao && <p className="text-[9px] text-slate-500 uppercase tracking-wider truncate">{projeto.situacao}</p>}
        </div>
        {ementa && (
          <p className="text-[11px] text-slate-600 leading-snug mt-1">{ementa}</p>
        )}
      </div>
      {projeto.url && <ExternalLink className="w-3 h-3 text-slate-400 flex-shrink-0 mt-1" />}
    </Wrapper>
  );
}


/* ── Scores Consolidados (5 dimensoes estilo Serasa) ─────────────── */
function ScoresConsolidadosCard({ dossie }) {
  const score = dossie.inteligencia?.score ?? {};
  const dims = [
    { key: "eleitoral",  label: "Eleitoral",  valor: score.eleitoral,  disponivel: score.eleitoral_disponivel ?? true,  desc: "Força nas urnas" },
    { key: "juridico",   label: "Jurídico",   valor: score.juridico,   disponivel: score.juridico_disponivel ?? false,  desc: "Ficha limpa e sanções" },
    { key: "financeiro", label: "Financeiro", valor: score.financeiro, disponivel: score.financeiro_disponivel ?? true, desc: "Campanha e transparência" },
    { key: "politico",   label: "Político",   valor: score.politico,   disponivel: score.politico_disponivel ?? true,   desc: "Coerência e alinhamentos" },
    { key: "digital",    label: "Digital",    valor: score.digital,    disponivel: score.digital_disponivel ?? false,   desc: "Presença em redes" },
  ];

  // So mostra se tiver pelo menos 1 dimensao com dado
  const temDado = dims.some(d => d.disponivel && d.valor != null);
  if (!temDado) return null;

  const bandFor = (v) => {
    if (v == null) return { label: "Sem dados", cor: "text-slate-400", bg: "bg-slate-100", bar: "bg-slate-200" };
    if (v >= 80)   return { label: "Alto",      cor: "text-emerald-700", bg: "bg-emerald-50", bar: "bg-emerald-500" };
    if (v >= 60)   return { label: "Médio-alto", cor: "text-blue-700",    bg: "bg-blue-50",    bar: "bg-blue-500" };
    if (v >= 40)   return { label: "Médio",     cor: "text-amber-700",   bg: "bg-amber-50",   bar: "bg-amber-500" };
    if (v >= 20)   return { label: "Médio-baixo", cor: "text-rose-700",  bg: "bg-rose-50",    bar: "bg-rose-500" };
    return { label: "Baixo", cor: "text-red-700", bg: "bg-red-50", bar: "bg-red-500" };
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Target className="w-4 h-4 text-violet-600" />
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider font-display">Scores Consolidados</h3>
        </div>
        {score.geral != null && (
          <div className="flex items-baseline gap-2">
            <span className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Geral</span>
            <span className="text-2xl font-black tabular-nums text-violet-700 font-display leading-none">{Math.round(score.geral)}</span>
            <span className="text-[11px] text-slate-500">/100</span>
          </div>
        )}
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        {dims.map(d => {
          const band = bandFor(d.disponivel ? d.valor : null);
          const v = d.disponivel && d.valor != null ? Math.round(d.valor) : null;
          return (
            <div key={d.key} className={`p-3 rounded-lg border ${band.bg} border-slate-200`}>
              <div className="flex items-center justify-between mb-1">
                <p className="text-[10px] uppercase tracking-wider font-bold text-slate-600">{d.label}</p>
                <span className={`text-[9px] font-black uppercase tracking-wider ${band.cor}`}>{band.label}</span>
              </div>
              <div className="flex items-baseline gap-1">
                <span className={`text-2xl font-black font-display tabular-nums leading-none ${v != null ? "text-slate-900" : "text-slate-300"}`}>
                  {v != null ? v : "—"}
                </span>
                {v != null && <span className="text-[10px] text-slate-400">/100</span>}
              </div>
              <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden mt-2">
                <div className={`h-full rounded-full ${band.bar} transition-all duration-500`} style={{ width: `${v ?? 0}%` }} />
              </div>
              <p className="text-[10px] text-slate-500 mt-1.5 leading-tight">{d.desc}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}


/* ── Chapa Eleitoral (vice ou titular em cargos majoritarios) ───────── */
function ChapaEleitoralCard({ dossie }) {
  const comp = dossie.comparativos ?? {};
  const vice = comp.vice;
  const titular = comp.titular;
  if (!vice && !titular) return null;

  const parceiro = vice || titular;
  const papelParceiro = vice ? "Vice na chapa" : "Titular da chapa";
  const papelCandidato = vice ? "Titular" : "Vice";
  const cargoCand = (comp.cargo || "").toUpperCase();
  const cargoLabel = cargoCand.replace("VICE-", "").toLowerCase();

  const fotoUrl = parceiro.foto_url
    ? (parceiro.foto_url.startsWith("http")
        ? parceiro.foto_url
        : `${process.env.NEXT_PUBLIC_API_URL ?? ""}${parceiro.foto_url}`)
    : null;

  const linkDossieParceiro = parceiro.candidato_id
    ? `/radar/politicos/${parceiro.candidato_id}`
    : null;

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
      <div className="flex items-center gap-2 mb-3">
        <UserCheck className="w-4 h-4 text-indigo-600" />
        <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider font-display">
          Chapa eleitoral · {comp.ano ?? "—"} · {cargoLabel}
        </h3>
      </div>

      <div className="flex items-center gap-4">
        {/* Foto + nome parceiro */}
        <a
          href={linkDossieParceiro || "#"}
          onClick={e => !linkDossieParceiro && e.preventDefault()}
          className={`flex items-center gap-3 p-3 rounded-lg bg-indigo-50 border border-indigo-100 flex-1 min-w-0 ${linkDossieParceiro ? "hover:bg-indigo-100 cursor-pointer" : "cursor-default"} transition-colors`}
        >
          <div className="w-14 h-14 rounded-full overflow-hidden bg-slate-100 border-2 border-white shadow flex-shrink-0">
            {fotoUrl ? (
              <img src={fotoUrl} alt={parceiro.nome_urna || parceiro.nome} className="w-full h-full object-cover object-top" onError={e => e.target.style.display = 'none'} />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-indigo-400 to-indigo-600 flex items-center justify-center text-white font-black text-lg">
                {(parceiro.nome_urna || parceiro.nome || "?").charAt(0)}
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] uppercase tracking-wider text-indigo-700 font-bold">{papelParceiro}</p>
            <p className="text-sm font-black text-slate-900 truncate">{parceiro.nome_urna || parceiro.nome}</p>
            <p className="text-[11px] text-slate-600 truncate">
              {parceiro.partido_sigla && <span className="font-semibold">{parceiro.partido_sigla}</span>}
              {parceiro.cargo && <span className="text-slate-500"> · {parceiro.cargo}</span>}
            </p>
          </div>
          {linkDossieParceiro && <ChevronRight className="w-4 h-4 text-indigo-500 flex-shrink-0" />}
        </a>

        {/* Contexto do candidato atual na chapa */}
        <div className="hidden md:block p-3 rounded-lg bg-slate-50 border border-slate-200 min-w-[200px]">
          <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Papel do candidato</p>
          <p className="text-sm font-black text-slate-900 mt-0.5">{papelCandidato}</p>
          <p className="text-[11px] text-slate-600 mt-0.5">
            {comp.foi_eleito === true && "Chapa eleita"}
            {comp.foi_eleito === false && "Chapa derrotada"}
            {comp.foi_eleito == null && "Resultado indefinido"}
          </p>
        </div>
      </div>
    </div>
  );
}


/* ── Benchmarking (candidato vs pares da mesma disputa) ────────────── */
function BenchmarkingCard({ dossie }) {
  const comp = dossie.comparativos ?? {};
  if (!comp.disponivel) return null;

  const escopoLabel = comp.escopo === "municipal"
    ? (comp.municipio ? `${comp.municipio}/${comp.estado_uf}` : "Municipal")
    : comp.escopo === "estadual"
    ? `${comp.estado_uf || "Estadual"}`
    : "Nacional";

  const percentilPct = comp.percentil != null ? Math.round(comp.percentil) : null;
  const medianaCand = comp.votos_candidato ?? 0;
  const medianaPares = comp.votos_mediana_pares ?? 0;
  const acimaMediana = medianaPares > 0 ? (medianaCand / medianaPares - 1) * 100 : null;

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
      <SectionHeader
        icon={Target}
        title="Benchmarking"
        subtitle={`Comparativo vs pares · ${escopoLabel} · ${comp.cargo || "—"} · ${comp.ano || "—"}`}
        accent="blue"
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {/* Posicao ranking */}
        <div className="p-4 rounded-lg bg-sky-50 border border-sky-200">
          <p className="text-[10px] uppercase tracking-wider font-bold text-sky-700 mb-1">Posição no ranking</p>
          <p className="text-3xl font-black tabular-nums font-display text-sky-900 leading-none">
            {comp.posicao_ranking ? `${comp.posicao_ranking}º` : "—"}
          </p>
          {comp.total_candidatos && (
            <p className="text-[11px] text-sky-700 mt-1 tabular-nums">de {fmt(comp.total_candidatos)} candidatos</p>
          )}
        </div>

        {/* Percentil */}
        <div className="p-4 rounded-lg bg-violet-50 border border-violet-200">
          <p className="text-[10px] uppercase tracking-wider font-bold text-violet-700 mb-1">Percentil</p>
          <p className="text-3xl font-black tabular-nums font-display text-violet-900 leading-none">
            {percentilPct != null ? `${percentilPct}%` : "—"}
          </p>
          <p className="text-[11px] text-violet-700 mt-1">melhor que os demais pares</p>
        </div>

        {/* Vagas do cargo (proporcional) ou "foi eleito" (majoritario) */}
        <div className={`p-4 rounded-lg border ${comp.foi_eleito ? "bg-emerald-50 border-emerald-200" : "bg-slate-50 border-slate-200"}`}>
          <p className={`text-[10px] uppercase tracking-wider font-bold mb-1 ${comp.foi_eleito ? "text-emerald-700" : "text-slate-600"}`}>
            {comp.vagas_cargo && comp.vagas_cargo > 1 ? "Vagas do cargo" : "Resultado"}
          </p>
          <p className={`text-3xl font-black tabular-nums font-display leading-none ${comp.foi_eleito ? "text-emerald-900" : "text-slate-900"}`}>
            {comp.vagas_cargo && comp.vagas_cargo > 1
              ? fmt(comp.vagas_cargo)
              : comp.foi_eleito ? "Eleito" : comp.foi_eleito === false ? "Não eleito" : "—"}
          </p>
          {comp.vagas_cargo > 1 && (
            <p className={`text-[11px] mt-1 ${comp.foi_eleito ? "text-emerald-700" : "text-slate-600"}`}>
              {comp.foi_eleito ? "Entrou entre os eleitos" : "Ficou de fora"}
            </p>
          )}
        </div>

        {/* Votos vs mediana */}
        <div className={`p-4 rounded-lg border ${acimaMediana != null && acimaMediana >= 0 ? "bg-emerald-50 border-emerald-200" : "bg-rose-50 border-rose-200"}`}>
          <p className={`text-[10px] uppercase tracking-wider font-bold mb-1 ${acimaMediana != null && acimaMediana >= 0 ? "text-emerald-700" : "text-rose-700"}`}>
            Votos vs mediana
          </p>
          <p className={`text-3xl font-black tabular-nums font-display leading-none ${acimaMediana != null && acimaMediana >= 0 ? "text-emerald-900" : "text-rose-900"}`}>
            {acimaMediana != null ? `${acimaMediana >= 0 ? "+" : ""}${Math.round(acimaMediana)}%` : "—"}
          </p>
          {medianaPares > 0 && (
            <p className={`text-[11px] mt-1 tabular-nums ${acimaMediana != null && acimaMediana >= 0 ? "text-emerald-700" : "text-rose-700"}`}>
              mediana: {fmt(medianaPares)}
            </p>
          )}
        </div>
      </div>

      {/* Linha secundaria - Detalhes proporcional vs majoritario */}
      {comp.eh_proporcional && comp.quociente_eleitoral && (
        <div className="mt-4 pt-4 border-t border-slate-100">
          <p className="text-[10px] uppercase tracking-[0.15em] text-slate-500 font-bold mb-3">Regras da disputa proporcional</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-[12px]">
            <div className="flex flex-col">
              <span className="text-[10px] uppercase text-slate-500 font-bold">Quociente eleitoral</span>
              <span className="font-black text-slate-900 tabular-nums">{fmt(comp.quociente_eleitoral)}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] uppercase text-slate-500 font-bold">Piso individual (10% QE)</span>
              <span className={`font-black tabular-nums ${comp.atingiu_piso_individual ? "text-emerald-700" : "text-rose-700"}`}>
                {fmt(comp.piso_individual)}
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] uppercase text-slate-500 font-bold">Votos do partido</span>
              <span className={`font-black tabular-nums ${comp.partido_atingiu_qe ? "text-emerald-700" : "text-rose-700"}`}>
                {fmt(comp.votos_partido)}
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] uppercase text-slate-500 font-bold">Colocação no partido</span>
              <span className="font-black text-slate-900 tabular-nums">
                {comp.colocacao_no_partido ? `${comp.colocacao_no_partido}º de ${comp.total_candidatos_partido ?? "—"}` : "—"}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Cargo majoritario - vencedor */}
      {!comp.eh_proporcional && comp.votos_vencedor != null && (
        <div className="mt-4 pt-4 border-t border-slate-100">
          <p className="text-[10px] uppercase tracking-[0.15em] text-slate-500 font-bold mb-2">Cargo majoritário</p>
          <div className="flex items-center justify-between gap-3 p-3 bg-slate-50 rounded-lg">
            <div>
              <p className="text-[11px] text-slate-600">Vencedor</p>
              <p className="text-sm font-black text-slate-900 truncate">{comp.vencedor_nome || "—"}</p>
            </div>
            <div className="text-right">
              <p className="text-[11px] text-slate-600">Votos do vencedor</p>
              <p className="text-lg font-black tabular-nums text-slate-900 font-display">{fmt(comp.votos_vencedor)}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


/* ── Desempenho Eleitoral (line chart + folga corte + regioes) ──────── */
function DesempenhoEleitoralCard({ dossie }) {
  const d = dossie.desempenho_eleitoral ?? {};
  const comp = dossie.comparativos ?? {};
  const traj = dossie.trajetoria?.cargos_disputados ?? [];

  const evolucao = d.evolucao_votos ?? [];
  if (evolucao.length < 2 && !comp.disponivel) return null;

  // Enriquecer evolucao com flag "eleito" vindo da trajetoria (match por ano+cargo)
  const enriquecidos = evolucao
    .map(ev => {
      const traj_match = traj.find(c => c.ano === ev.ano && c.cargo === ev.cargo);
      return {
        ...ev,
        eleito: traj_match?.resultado === "ELEITO",
        resultado: traj_match?.resultado,
      };
    })
    .sort((a, b) => a.ano - b.ano);

  // Folga vs corte - proporcional ou majoritario
  const foiEleito = comp.foi_eleito;
  const folga = comp.folga_votos;
  const corteLabel = comp.eh_proporcional
    ? "Linha de corte (último eleito)"
    : "Votos do vencedor";
  const votosCorte = comp.eh_proporcional
    ? comp.votos_ultimo_eleito
    : comp.votos_vencedor;

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
      <SectionHeader
        icon={TrendingUp}
        title="Desempenho Eleitoral"
        subtitle={`Trajetória de votos · ${enriquecidos.length} eleições disputadas`}
        accent="violet"
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Gráfico de evolução (ocupa 2/3) */}
        {enriquecidos.length >= 2 && (
          <div className="lg:col-span-2">
            <p className="text-[10px] uppercase tracking-[0.15em] text-slate-500 font-bold mb-2">Evolução de votos por eleição</p>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={enriquecidos} margin={{ top: 12, right: 16, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis
                  dataKey="ano"
                  tick={{ fontSize: 11, fill: "#64748b", fontWeight: 600 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: "#94a3b8" }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => {
                    if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
                    if (v >= 1_000) return `${Math.round(v / 1_000)}k`;
                    return String(v);
                  }}
                />
                <RechartsTooltip
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const d = payload[0].payload;
                    return (
                      <div className="bg-white border border-slate-200 rounded-lg px-3 py-2 shadow-lg text-xs">
                        <p className="font-black text-slate-900 tabular-nums">{d.ano}</p>
                        <p className="text-slate-600">{d.cargo}</p>
                        <p className="text-violet-700 font-bold tabular-nums mt-0.5">{fmt(d.votos)} votos</p>
                        {d.resultado && (
                          <p className={`text-[10px] font-black uppercase tracking-wider mt-0.5 ${
                            d.resultado === "ELEITO" ? "text-emerald-600" : "text-slate-500"
                          }`}>
                            {d.resultado === "ELEITO" ? "Eleito" : d.resultado === "SUPLENTE" ? "Suplente" : "Não eleito"}
                          </p>
                        )}
                      </div>
                    );
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="votos"
                  stroke="#7C3AED"
                  strokeWidth={2.5}
                  dot={(props) => {
                    const { cx, cy, payload } = props;
                    const cor = payload.eleito ? "#10b981" : "#cbd5e1";
                    return <Dot cx={cx} cy={cy} r={5} fill={cor} stroke="#fff" strokeWidth={2} />;
                  }}
                  activeDot={{ r: 7, stroke: "#7C3AED", strokeWidth: 2, fill: "#fff" }}
                />
              </LineChart>
            </ResponsiveContainer>
            <div className="flex items-center justify-center gap-4 mt-1 text-[10px] text-slate-500">
              <span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" /> Eleito</span>
              <span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-slate-300 inline-block" /> Não eleito</span>
            </div>
          </div>
        )}

        {/* Indicadores laterais: folga vs corte + regioes */}
        <div className="space-y-3">
          {/* Card folga - eleito ou perdeu por quanto */}
          {comp.disponivel && votosCorte != null && (
            <div className={`p-4 rounded-lg border ${foiEleito ? "bg-emerald-50 border-emerald-200" : "bg-rose-50 border-rose-200"}`}>
              <p className={`text-[10px] uppercase tracking-wider font-bold mb-1 ${foiEleito ? "text-emerald-700" : "text-rose-700"}`}>
                {foiEleito ? "Folga sobre o corte" : "Distância do vencedor"}
              </p>
              <p className={`text-2xl font-black tabular-nums leading-none ${foiEleito ? "text-emerald-900" : "text-rose-900"}`}>
                {foiEleito && folga != null && folga > 0 ? "+" : ""}{folga != null ? fmt(folga) : "—"}
              </p>
              <p className={`text-[11px] mt-1 ${foiEleito ? "text-emerald-700" : "text-rose-700"}`}>
                {corteLabel}: {fmt(votosCorte)}
                {!foiEleito && comp.vencedor_nome && <span className="block text-[10px] opacity-80 truncate">({comp.vencedor_nome})</span>}
              </p>
            </div>
          )}

          {/* Proporcional: QE + piso + colocacao partido */}
          {comp.eh_proporcional && comp.quociente_eleitoral && (
            <div className="p-4 rounded-lg border bg-slate-50 border-slate-200 space-y-1.5">
              <p className="text-[10px] uppercase tracking-wider font-bold text-slate-700">Regras proporcionais</p>
              <div className="flex items-baseline justify-between">
                <span className="text-[11px] text-slate-600">Quociente eleitoral</span>
                <span className="text-[11px] font-black text-slate-900 tabular-nums">{fmt(comp.quociente_eleitoral)}</span>
              </div>
              {comp.piso_individual && (
                <div className="flex items-baseline justify-between">
                  <span className="text-[11px] text-slate-600">Piso individual (10% QE)</span>
                  <span className={`text-[11px] font-black tabular-nums ${comp.atingiu_piso_individual ? "text-emerald-700" : "text-rose-700"}`}>
                    {fmt(comp.piso_individual)}
                  </span>
                </div>
              )}
              {comp.colocacao_no_partido && (
                <div className="flex items-baseline justify-between">
                  <span className="text-[11px] text-slate-600">Colocação no partido</span>
                  <span className="text-[11px] font-black text-slate-900 tabular-nums">
                    {comp.colocacao_no_partido}º de {comp.total_candidatos_partido ?? "—"}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Regioes fortes/fracas (do desempenho_eleitoral) */}
          {(d.regioes_fortes?.length > 0 || d.regioes_fracas?.length > 0) && (
            <div className="p-3 rounded-lg border border-slate-200 bg-white space-y-2">
              {d.regioes_fortes?.length > 0 && (
                <div>
                  <p className="text-[9px] uppercase tracking-wider text-emerald-700 font-bold mb-1">Regiões fortes</p>
                  <div className="flex flex-wrap gap-1">
                    {d.regioes_fortes.slice(0, 5).map((r, i) => (
                      <span key={i} className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-100 px-1.5 py-0.5 rounded">{r}</span>
                    ))}
                  </div>
                </div>
              )}
              {d.regioes_fracas?.length > 0 && (
                <div>
                  <p className="text-[9px] uppercase tracking-wider text-rose-700 font-bold mb-1">Regiões fracas</p>
                  <div className="flex flex-wrap gap-1">
                    {d.regioes_fracas.slice(0, 5).map((r, i) => (
                      <span key={i} className="text-[10px] font-semibold text-rose-700 bg-rose-50 border border-rose-100 px-1.5 py-0.5 rounded">{r}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


/* ── Trajetória em timeline compacta (com 1T/2T, chip 2T, municipio) ─── */
function TrajetoriaCard({ traj }) {
  const cargos = traj?.cargos_disputados ?? [];
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
      <SectionHeader icon={Briefcase} title="Trajetória Eleitoral" subtitle={`${cargos.length} eleições disputadas`} accent="violet" />
      <div className="space-y-2">
        {cargos.slice(0, 8).map((c, i) => {
          const local = c.municipio ? `${c.municipio} / ${c.estado_uf}` : c.estado_uf;
          const resultBg = c.resultado === "ELEITO" ? "bg-emerald-100 text-emerald-700"
            : c.resultado === "SUPLENTE" ? "bg-amber-100 text-amber-700"
            : "bg-slate-100 text-slate-600";
          const resultLabel = c.resultado === "ELEITO" ? "Eleito"
            : c.resultado === "SUPLENTE" ? "Suplente"
            : "Não eleito";
          return (
            <div key={i} className="flex items-center gap-3 py-2 border-b border-slate-100 last:border-0">
              <span className="text-xs font-black tabular-nums text-slate-400 w-12 flex-shrink-0">{c.ano}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-slate-800 flex items-center gap-1.5 flex-wrap">
                  {c.cargo}
                  {c.disputou_segundo_turno && (
                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0 rounded text-[9px] font-black tracking-wider bg-purple-100 text-purple-700">
                      <Swords className="w-2.5 h-2.5" /> 2T
                    </span>
                  )}
                </p>
                <p className="text-[11px] text-slate-500 truncate">{c.partido} · {local}</p>
              </div>
              <div className="text-right flex-shrink-0">
                {c.disputou_segundo_turno && c.votos_1t != null && c.votos_2t != null ? (
                  <div className="text-[10px] tabular-nums text-slate-500 leading-tight">
                    <p className="font-semibold text-slate-700">{fmt(c.votos_2t)} <span className="text-[9px] uppercase text-slate-400">2T</span></p>
                    <p className="text-slate-400">{fmt(c.votos_1t)} <span className="text-[9px] uppercase">1T</span></p>
                  </div>
                ) : (
                  <span className="text-xs tabular-nums text-slate-600 font-semibold">{fmt(c.votos)}</span>
                )}
              </div>
              <span className={`text-[10px] px-2 py-0.5 rounded font-black uppercase tracking-wider flex-shrink-0 ${resultBg}`}>
                {resultLabel}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}


/* ── Carreira Publica (cargos executivos e comissionados historicos) ─── */
function CarreiraPublicaCard({ carreira }) {
  if (!carreira?.disponivel || !carreira.cargos?.length) return null;

  // Formata "inicio - fim" em formato br
  const formatarPeriodo = (inicio, fim) => {
    const fmtData = (iso) => {
      if (!iso) return null;
      const [ano, mes] = iso.split("-");
      return mes ? `${mes}/${ano}` : ano;
    };
    const i = fmtData(inicio);
    const f = fmtData(fim);
    if (i && f) return `${i} — ${f}`;
    if (i && !f) return `${i} — atual`;
    if (!i && f) return `até ${f}`;
    return null;
  };

  const cargosOrdenados = [...carreira.cargos].sort((a, b) => {
    return (b.inicio || "").localeCompare(a.inicio || "");
  });

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm h-full">
      <SectionHeader
        icon={UserCheck}
        title="Carreira Pública"
        subtitle={`${carreira.cargos.length} cargo(s) ocupado(s) além de eleitos`}
        accent="indigo"
      />
      <div className="space-y-2">
        {cargosOrdenados.slice(0, 8).map((c, i) => {
          const periodo = formatarPeriodo(c.inicio, c.fim);
          const atual = c.inicio && !c.fim;
          const esferaBg = {
            federal:   "bg-indigo-100 text-indigo-700",
            estadual:  "bg-blue-100 text-blue-700",
            municipal: "bg-sky-100 text-sky-700",
          }[c.esfera] || "bg-slate-100 text-slate-600";
          return (
            <div key={i} className="flex items-center gap-3 py-2 border-b border-slate-100 last:border-0">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-slate-800">{c.cargo}</p>
                <p className="text-[11px] text-slate-500 truncate">
                  {c.orgao || "—"}{c.uf ? ` · ${c.uf}` : ""}
                </p>
              </div>
              {c.esfera && (
                <span className={`text-[9px] px-2 py-0.5 rounded font-black uppercase tracking-wider ${esferaBg}`}>
                  {c.esfera}
                </span>
              )}
              {periodo && (
                <span className="text-[11px] text-slate-500 tabular-nums min-w-[110px] text-right">{periodo}</span>
              )}
              {atual && (
                <span className="text-[9px] px-2 py-0.5 rounded font-black uppercase tracking-wider bg-emerald-100 text-emerald-700">
                  Atual
                </span>
              )}
            </div>
          );
        })}
        {carreira.cargos.length > 8 && (
          <p className="text-[11px] text-slate-500 italic text-center pt-2">
            + {carreira.cargos.length - 8} cargo(s) adicional(is)
          </p>
        )}
      </div>
    </div>
  );
}


/* ── Desempenho + Redutos ────────────────────────────────────── */
function DesempenhoCard({ d, comp, redutos }) {
  if (!d?.disponivel) return null;
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm h-full">
      <SectionHeader icon={MapPin} title="Desempenho Territorial" subtitle={`${fmt(d.total_votos)} votos · ${d.ciclo_ano}`} accent="emerald" />

      {redutos?.redutos?.length > 0 && (
        <>
          <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold mb-2">Top 5 redutos</p>
          <div className="space-y-2">
            {redutos.redutos.slice(0, 5).map((r, i) => {
              const pct = r.pct_do_total * 100;
              return (
                <div key={i}>
                  <div className="flex items-baseline justify-between mb-0.5">
                    <p className="text-xs font-semibold text-slate-700 truncate flex-1 pr-2">
                      <span className="text-slate-400 tabular-nums mr-2">{i + 1}.</span>
                      {r.label}
                    </p>
                    <span className="text-xs tabular-nums font-bold text-slate-800">{fmt(r.votos)}</span>
                    <span className="text-[10px] tabular-nums text-slate-500 w-10 text-right">{pct.toFixed(1)}%</span>
                  </div>
                  <div className="h-1 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-emerald-400 to-emerald-600" style={{ width: `${Math.min(100, pct * 3)}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {redutos?.perfil_territorial && (
        <p className="text-[11px] text-slate-500 mt-4 pt-3 border-t border-slate-100 italic">
          Perfil territorial: <span className="font-semibold capitalize text-slate-700">{redutos.perfil_territorial}</span>
          {redutos.concentracao_top3_pct != null && <> · Top 3 concentra {redutos.concentracao_top3_pct}% dos votos</>}
        </p>
      )}
    </div>
  );
}


/* ── Financeiro ─────────────────────────────────────────────── */
function FinanceiroCard({ fin }) {
  if (!fin?.disponivel) return null;
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm h-full">
      <SectionHeader icon={DollarSign} title="Financiamento" subtitle="última campanha declarada" accent="amber" />

      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="p-3 bg-amber-50 border border-amber-100 rounded-lg">
          <p className="text-[10px] uppercase tracking-wider text-amber-700 font-bold">Arrecadado</p>
          <p className="text-xl font-black font-display tabular-nums text-amber-900 leading-tight mt-1">{fmtMoedaCurto(fin.total_arrecadado)}</p>
        </div>
        <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
          <p className="text-[10px] uppercase tracking-wider text-slate-600 font-bold">Gasto</p>
          <p className="text-xl font-black font-display tabular-nums text-slate-900 leading-tight mt-1">{fmtMoedaCurto(fin.total_gasto)}</p>
        </div>
      </div>

      {/* Origem dos recursos */}
      {fin.origem_recursos && (
        <div className="mb-4">
          <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold mb-2">Origem dos recursos</p>
          <div className="space-y-1.5">
            {[
              { key: "fundo_eleitoral_pct", label: "Fundo Eleitoral", cor: "bg-violet-500" },
              { key: "fundo_partidario_pct", label: "Fundo Partidário", cor: "bg-indigo-500" },
              { key: "doacao_privada_pct", label: "Doação Privada", cor: "bg-emerald-500" },
              { key: "recursos_proprios_pct", label: "Recursos Próprios", cor: "bg-amber-500" },
              { key: "outros_pct", label: "Outros", cor: "bg-slate-400" },
            ].filter(r => fin.origem_recursos[r.key] != null && fin.origem_recursos[r.key] > 0)
              .map(r => {
                const pct = fin.origem_recursos[r.key] * 100;
                return (
                  <div key={r.key}>
                    <div className="flex items-baseline justify-between mb-0.5 text-xs">
                      <span className="text-slate-700">{r.label}</span>
                      <span className="font-bold text-slate-900 tabular-nums">{pct.toFixed(1)}%</span>
                    </div>
                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div className={`h-full ${r.cor}`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* Concentracao doadores */}
      {fin.concentracao && (fin.concentracao.top1_pct != null || fin.concentracao.top5_pct != null) && (
        <div className="mb-4 p-3 bg-slate-50 rounded-lg border border-slate-100">
          <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold mb-2">Concentração da arrecadação</p>
          <div className="grid grid-cols-3 gap-2 text-center">
            {fin.concentracao.top1_pct != null && (
              <div>
                <p className="text-xl font-black font-display tabular-nums text-slate-900">{(fin.concentracao.top1_pct * 100).toFixed(0)}%</p>
                <p className="text-[9px] uppercase tracking-wider text-slate-500 font-bold">Top 1</p>
              </div>
            )}
            {fin.concentracao.top5_pct != null && (
              <div>
                <p className="text-xl font-black font-display tabular-nums text-slate-900">{(fin.concentracao.top5_pct * 100).toFixed(0)}%</p>
                <p className="text-[9px] uppercase tracking-wider text-slate-500 font-bold">Top 5</p>
              </div>
            )}
            {fin.concentracao.top10_pct != null && (
              <div>
                <p className="text-xl font-black font-display tabular-nums text-slate-900">{(fin.concentracao.top10_pct * 100).toFixed(0)}%</p>
                <p className="text-[9px] uppercase tracking-wider text-slate-500 font-bold">Top 10</p>
              </div>
            )}
          </div>
          {fin.concentracao.n_doadores != null && (
            <p className="text-[10px] text-slate-500 mt-2 text-center">{fmt(fin.concentracao.n_doadores)} doadores únicos</p>
          )}
        </div>
      )}

      {/* Custo por voto vs benchmark */}
      {fin.cpv_benchmark?.valor_candidato != null && fin.cpv_benchmark.mediana_pares != null && (
        <div className="mb-4 p-3 bg-amber-50 rounded-lg border border-amber-100">
          <p className="text-[10px] uppercase tracking-wider text-amber-700 font-bold mb-2">Custo por voto vs. pares</p>
          <div className="flex items-baseline justify-between mb-2">
            <div>
              <p className="text-[10px] text-slate-600 uppercase tracking-wide">Candidato</p>
              <p className="text-xl font-black font-display tabular-nums text-amber-900">R$ {Math.round(fin.cpv_benchmark.valor_candidato)}</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-slate-600 uppercase tracking-wide">Mediana pares</p>
              <p className="text-xl font-black font-display tabular-nums text-slate-600">R$ {Math.round(fin.cpv_benchmark.mediana_pares)}</p>
            </div>
          </div>
          {fin.cpv_benchmark.leitura_curta && (
            <p className="text-[11px] text-amber-800 leading-relaxed italic">{fin.cpv_benchmark.leitura_curta}</p>
          )}
        </div>
      )}

      {/* Top 5 doadores */}
      {fin.principais_doadores?.length > 0 && (
        <div>
          <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold mb-2">Top 5 doadores</p>
          <div className="space-y-1.5">
            {fin.principais_doadores.slice(0, 5).map((d, i) => (
              <div key={i} className="flex items-baseline justify-between gap-3 text-xs">
                <span className="text-slate-700 truncate flex-1">{d.nome}</span>
                <span className="text-slate-900 font-bold tabular-nums">{fmtMoedaCurto(d.valor)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}


/* ── Juridico (expandido: timeline aptidao, processos, sancoes completas) ─ */
function JuridicoCard({ juridico }) {
  if (!juridico?.disponivel) return null;
  const status = juridico.ficha_limpa === true ? "APTO" : juridico.ficha_limpa === false ? "INAPTO" : "EM ANÁLISE";
  const statusBg = juridico.ficha_limpa === true ? "bg-emerald-100 text-emerald-800" : juridico.ficha_limpa === false ? "bg-red-100 text-red-800" : "bg-slate-100 text-slate-700";

  const historico = juridico.historico_aptidao ?? [];
  const processos = juridico.processos_relevantes ?? [];
  const sancoes = juridico.sancoes ?? [];

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm h-full">
      <SectionHeader icon={Scale} title="Situação Jurídica" subtitle="Ficha limpa + sanções + processos" accent="rose" />

      <div className="flex items-center gap-4 mb-4 p-3 bg-slate-50 rounded-lg">
        <Shield className={`w-8 h-8 ${juridico.ficha_limpa === true ? "text-emerald-600" : juridico.ficha_limpa === false ? "text-red-600" : "text-slate-400"}`} />
        <div className="flex-1">
          <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Status TSE no último ciclo</p>
          <span className={`inline-block mt-1 px-2.5 py-0.5 rounded text-xs font-black tracking-wider ${statusBg}`}>{status}</span>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-4">
        <StatBox label="Ciclos inapto" value={juridico.ciclos_inapto ?? 0} color={juridico.ciclos_inapto > 0 ? "amber" : "slate"} />
        <StatBox label="Sanções ativas" value={juridico.sancoes_ativas ?? 0} color={juridico.sancoes_ativas > 0 ? "red" : "slate"} />
        <StatBox label="Processos" value={processos.length} color={processos.length > 0 ? "rose" : "slate"} />
      </div>

      {/* Timeline de aptidao por ciclo */}
      {historico.length > 0 && (
        <div className="mb-4 pt-3 border-t border-slate-100">
          <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold mb-2">Histórico de aptidão</p>
          <div className="flex flex-wrap gap-1.5">
            {historico.slice(0, 10).map((c, i) => {
              const apto = c.ficha_limpa === true;
              const inapto = c.ficha_limpa === false;
              const corBg = apto ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                : inapto ? "bg-red-50 border-red-200 text-red-800"
                : "bg-slate-50 border-slate-200 text-slate-500";
              const rotulo = apto ? "Apto" : inapto ? "Inapto" : "—";
              return (
                <div key={i} className={`px-2 py-1 rounded border ${corBg} inline-flex flex-col items-start leading-tight min-w-[60px]`}>
                  <span className="text-[9px] font-bold tabular-nums">{c.ano}</span>
                  <span className="text-[10px] font-black uppercase">{rotulo}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Processos relevantes (criminal/eleitoral/civil) */}
      {processos.length > 0 && (
        <div className="mb-4 pt-3 border-t border-slate-100">
          <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold mb-2">Processos relevantes</p>
          <div className="space-y-1.5">
            {processos.slice(0, 5).map((p, i) => {
              const corStatus = {
                CONDENADO:    "bg-red-100 text-red-800 border-red-200",
                ABSOLVIDO:    "bg-emerald-100 text-emerald-800 border-emerald-200",
                EM_ANDAMENTO: "bg-amber-100 text-amber-800 border-amber-200",
              }[p.status] || "bg-slate-100 text-slate-700 border-slate-200";
              const rotuloTipo = { CRIMINAL: "Criminal", ELEITORAL: "Eleitoral", CIVIL: "Civil" }[p.tipo] || p.tipo;
              const rotuloStatus = p.status === "EM_ANDAMENTO" ? "Em andamento" : p.status === "CONDENADO" ? "Condenado" : p.status === "ABSOLVIDO" ? "Absolvido" : p.status;
              return (
                <div key={i} className="flex items-center justify-between gap-2 px-3 py-1.5 bg-slate-50 rounded border border-slate-100">
                  <span className="text-[11px] font-bold text-slate-800">{rotuloTipo}</span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider border ${corStatus}`}>
                    {rotuloStatus}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Sancoes administrativas */}
      {sancoes.length > 0 && (
        <div className="pt-3 border-t border-slate-100">
          <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold mb-2">Sanções administrativas</p>
          <ul className="space-y-1.5">
            {sancoes.slice(0, 5).map((s, i) => (
              <li key={i} className="flex items-start gap-2 text-[11px]">
                <span className={`inline-block w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${s.ativa ? "bg-red-500" : "bg-slate-300"}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-slate-800">
                    <span className="font-black">{s.fonte}</span>
                    {s.tipo_sancao && <span className="text-slate-600"> · {s.tipo_sancao}</span>}
                  </p>
                  {s.orgao_sancionador && <p className="text-[10px] text-slate-500 truncate">{s.orgao_sancionador}</p>}
                </div>
              </li>
            ))}
            {sancoes.length > 5 && (
              <li className="text-[10px] text-slate-500 italic">+ {sancoes.length - 5} sanção(ões) adicional(is)</li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}


/* ── Redutos Eleitorais (fortes + fracos + perfil territorial) ───── */
function RedutosCard({ dossie }) {
  const redutos = dossie.redutos_eleitorais;
  if (!redutos?.redutos?.length) return null;

  const fortes = redutos.redutos || [];
  const fracos = redutos.redutos_fracos || [];

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm h-full flex flex-col">
      <div className="flex items-center gap-2 mb-3">
        <MapPin className="w-4 h-4 text-slate-700" />
        <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider font-display">Redutos Eleitorais</h3>
      </div>

      {/* Fortes - top 5 */}
      <div className="mb-4">
        <p className="text-[10px] uppercase tracking-wider text-emerald-700 font-bold mb-2 flex items-center gap-1">
          <TrendingUp className="w-3 h-3" /> Onde é forte
        </p>
        <div className="space-y-2">
          {fortes.slice(0, 5).map((r, i) => {
            const pct = (r.pct_do_total ?? 0) * 100;
            return (
              <div key={i}>
                <div className="flex items-baseline justify-between mb-0.5 gap-2">
                  <p className="text-xs font-semibold text-slate-700 truncate flex-1">
                    <span className="text-slate-400 tabular-nums mr-2">{i + 1}.</span>
                    {r.label}
                  </p>
                  <span className="text-xs tabular-nums font-bold text-slate-800">{fmt(r.votos)}</span>
                  <span className="text-[10px] tabular-nums text-slate-500 w-12 text-right">{pct.toFixed(1)}%</span>
                </div>
                <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-emerald-400 to-emerald-600" style={{ width: `${Math.min(100, pct * 3)}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Fracos - bottom 3 (so mostra se tiver) */}
      {fracos.length > 0 && (
        <div className="mb-4 pt-3 border-t border-slate-100">
          <p className="text-[10px] uppercase tracking-wider text-rose-700 font-bold mb-2 flex items-center gap-1">
            <TrendingDown className="w-3 h-3" /> Onde é fraco
          </p>
          <div className="space-y-1.5">
            {fracos.slice(0, 3).map((r, i) => {
              const pct = (r.pct_do_total ?? 0) * 100;
              return (
                <div key={i} className="flex items-baseline justify-between gap-2">
                  <p className="text-[11px] text-slate-600 truncate flex-1">
                    <span className="text-slate-400 mr-1">·</span>
                    {r.label}
                  </p>
                  <span className="text-[11px] tabular-nums text-slate-600">{fmt(r.votos)}</span>
                  <span className="text-[10px] tabular-nums text-slate-400 w-12 text-right">{pct.toFixed(1)}%</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Rodape: perfil territorial + concentracao */}
      {(redutos.perfil_territorial || redutos.concentracao_top3_pct != null || redutos.total_regioes_com_voto) && (
        <div className="mt-auto pt-3 border-t border-slate-100 space-y-1 text-[11px] text-slate-600">
          {redutos.perfil_territorial && (
            <p>Perfil: <span className="font-semibold capitalize text-slate-800">{redutos.perfil_territorial}</span></p>
          )}
          {redutos.concentracao_top3_pct != null && (
            <p>Top 3 concentra <span className="font-semibold text-slate-800">{redutos.concentracao_top3_pct}%</span> dos votos</p>
          )}
          {redutos.total_regioes_com_voto > 0 && (
            <p>Votos em <span className="font-semibold text-slate-800">{fmt(redutos.total_regioes_com_voto)}</span> regiões</p>
          )}
        </div>
      )}
    </div>
  );
}


/* ── Mapa Eleitoral (grande, dimensoes aprovadas 17/04) ───────── */
function MapaEleitoralCard({ dossie }) {
  const ultimo = dossie.trajetoria?.cargos_disputados?.[0];
  const cor = corDoPartido(ultimo?.partido_numero ?? 0);
  const candidatoId = dossie.identificacao?.id;

  const caption = ultimo
    ? `${ultimo.cargo} - ${ultimo.estado_uf}${ultimo.municipio ? ` - ${ultimo.municipio}` : ""} - ${ultimo.ano}`
    : "Distribuicao de votos";

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
      <div className="flex items-center gap-2 mb-3">
        <Map className="w-4 h-4 text-brand-600" />
        <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider font-display">Mapa Eleitoral</h3>
      </div>
      <div className="rounded-lg overflow-hidden">
        <DossieMapaCandidato
          candidatoId={Number(candidatoId)}
          partidoCor={cor}
          candidaturaId={ultimo?.candidatura_id}
          alturaMapa="h-[500px]"
        />
      </div>
      <p className="text-[10px] text-slate-500 text-center mt-2 font-medium">{caption}</p>
    </div>
  );
}


/* ── Alertas dedicado (card proprio, separado do Flags) ──────── */
function AlertasCard({ dossie }) {
  const alertas = dossie.inteligencia?.alertas ?? [];
  const classif = dossie.inteligencia?.classificacao ?? {};
  const risco = classif.risco_composto;
  const riscoInfo = riscoFrom(risco);

  if (alertas.length === 0) return null;

  return (
    <div className="bg-amber-50/60 rounded-xl border border-amber-200 p-5 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-600" />
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider font-display">
            Alertas ({alertas.length})
          </h3>
        </div>
        {risco && (
          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${riscoInfo.bg} ${riscoInfo.text}`}>
            Risco {riscoInfo.label}
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        {alertas.map((a, i) => (
          <div key={i} className="flex items-start gap-2 bg-white border border-amber-100 rounded-lg p-3">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-500 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-slate-700 leading-relaxed">{a}</p>
          </div>
        ))}
      </div>
    </div>
  );
}


/* ── Resumo Executivo (narrativa IA do candidato) ───────────── */
function ResumoExecutivoCard({ dossie }) {
  const resumo = dossie.inteligencia?.resumo_executivo;
  if (!resumo) return null;

  return (
    <div className="bg-gradient-to-br from-brand-50 to-white border border-brand-200 rounded-xl p-5 shadow-sm">
      <div className="flex items-center gap-2 mb-3">
        <Zap className="w-4 h-4 text-brand-600" />
        <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider font-display">Resumo Executivo</h3>
      </div>
      <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">{resumo}</p>
    </div>
  );
}


/* ── Perfil Politico (coerencia, alinhamentos, historico partidos) ─ */
function PerfilPoliticoCard({ dossie }) {
  const perfil = dossie.perfil_politico ?? {};
  const comport = dossie.inteligencia?.comportamento ?? {};
  const legis = dossie.legislativo ?? {};
  const partidoAtual = perfil.partido_atual;
  const historico = perfil.historico_partidos ?? [];

  // Barras de alinhamento (0-100). So mostra barra quando tem dado.
  const barras = [
    { key: "coerencia",  label: "Coerência ideológica",  valor: comport.coerencia_ideologica,
      hint: "Consistência entre declarações e votações" },
    { key: "alin_part",  label: "Alinhamento com o partido", valor: comport.alinhamento_partido ?? perfil.alinhamento_partido,
      hint: "Quão próximo vota do partido" },
    { key: "alin_gov",   label: "Alinhamento com o governo", valor: comport.alinhamento_governo,
      hint: "Quão próximo vota do governo federal" },
    { key: "alin_votos", label: "Presença em votações", valor: legis.alinhamento_votacoes,
      hint: "Taxa de participação nas principais votações do mandato" },
  ];

  const corBar = (v) => v == null ? "bg-slate-200"
    : v >= 75 ? "bg-emerald-500"
    : v >= 50 ? "bg-blue-500"
    : v >= 25 ? "bg-amber-500"
    : "bg-rose-500";

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
      <div className="flex items-center gap-2 mb-4">
        <UserCheck className="w-4 h-4 text-indigo-600" />
        <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider font-display">Perfil Político</h3>
      </div>

      {/* Header: partido atual + ideologia */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-lg">
          <p className="text-[10px] uppercase tracking-wider text-indigo-700 font-bold">Partido atual</p>
          <p className="text-xl font-black text-indigo-900 font-display tabular-nums mt-1 truncate" title={partidoAtual}>{partidoAtual ?? "—"}</p>
        </div>
        <div className="p-3 bg-slate-50 border border-slate-100 rounded-lg">
          <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Ideologia</p>
          <p className="text-xl font-black text-slate-800 font-display mt-1 truncate capitalize" title={perfil.ideologia_aproximada}>{perfil.ideologia_aproximada ?? "—"}</p>
        </div>
      </div>

      {/* Barras de alinhamento comportamental */}
      <div className="space-y-2.5 mb-4">
        {barras.map(b => {
          const v = b.valor != null ? Math.round(b.valor) : null;
          return (
            <div key={b.key}>
              <div className="flex items-baseline justify-between mb-1 gap-2">
                <span className="text-[11px] font-semibold text-slate-700">{b.label}</span>
                <span className={`text-[11px] font-black tabular-nums ${v != null ? "text-slate-800" : "text-slate-300"}`}>
                  {v != null ? `${v}%` : "Sem dados"}
                </span>
              </div>
              <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div className={`h-full rounded-full transition-all duration-500 ${corBar(v)}`} style={{ width: `${v ?? 0}%` }} />
              </div>
              <p className="text-[10px] text-slate-400 mt-0.5">{b.hint}</p>
            </div>
          );
        })}
      </div>

      {/* Historico de partidos */}
      {historico.length > 1 && (
        <div className="pt-3 border-t border-slate-100">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">
            Histórico de partidos · {historico.length} troca(s)
          </p>
          <div className="flex items-center gap-1 flex-wrap">
            {historico.map((p, i) => (
              <span key={i} className="flex items-center gap-1">
                {i > 0 && <ChevronRight className="w-3 h-3 text-slate-300" />}
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                  p === partidoAtual ? "bg-brand-100 text-brand-800" : "bg-slate-100 text-slate-600"
                }`}>{p}</span>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}


/* ── Contexto do Politico (resumo curto, nao bio completa) ───── */
function BiografiaCard({ dossie }) {
  const ident = dossie.identificacao ?? {};
  const bio = ident.bio_resumida;
  const wikipediaUrl = ident.wikipedia_url;

  if (!bio && !wikipediaUrl) return null;

  // Resumo curto: pega ate o primeiro ponto final ou 240 chars, o que vier primeiro
  const resumoCurto = bio ? (() => {
    const limite = 240;
    if (bio.length <= limite) return bio;
    const cortado = bio.slice(0, limite);
    const ultimoPonto = cortado.lastIndexOf(". ");
    return ultimoPonto > 120 ? cortado.slice(0, ultimoPonto + 1) : cortado + "...";
  })() : null;

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
      <div className="flex items-center gap-2 mb-3">
        <BookOpen className="w-4 h-4 text-brand-600" />
        <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider font-display">Contexto do Politico</h3>
      </div>
      {resumoCurto ? (
        <p className="text-sm text-slate-700 leading-relaxed">{resumoCurto}</p>
      ) : (
        <p className="text-sm text-slate-500 italic">Resumo biografico em processamento.</p>
      )}
      {wikipediaUrl && (
        <a
          href={wikipediaUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 mt-3 text-xs font-semibold text-brand-700 hover:text-brand-800"
        >
          Ver biografia completa na Wikipedia
          <ExternalLink className="w-3 h-3" />
        </a>
      )}
    </div>
  );
}


/* ── Redes Sociais ─────────────────────────────────────────── */
function RedesSociaisCard({ dossie }) {
  const redes = dossie.redes_sociais;
  if (!redes?.disponivel) return null;

  const links = [
    { nome: "Instagram", user: redes.instagram, Icon: Instagram, urlFn: (u) => `https://instagram.com/${u}`, color: "text-pink-600", bg: "bg-pink-50" },
    { nome: "Twitter / X", user: redes.twitter, Icon: Twitter, urlFn: (u) => `https://twitter.com/${u}`, color: "text-sky-600", bg: "bg-sky-50" },
    { nome: "Facebook", user: redes.facebook, Icon: Facebook, urlFn: (u) => `https://facebook.com/${u}`, color: "text-blue-700", bg: "bg-blue-50" },
    { nome: "YouTube", user: redes.youtube, Icon: Youtube, urlFn: (u) => `https://youtube.com/${u}`, color: "text-red-600", bg: "bg-red-50" },
    { nome: "TikTok", user: redes.tiktok, Icon: Sparkles, urlFn: (u) => `https://tiktok.com/@${u}`, color: "text-slate-800", bg: "bg-slate-100" },
    { nome: "Website", user: redes.website, Icon: Globe, urlFn: (u) => u.startsWith("http") ? u : `https://${u}`, color: "text-emerald-700", bg: "bg-emerald-50" },
  ].filter(l => l.user);

  if (links.length === 0) return null;

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Globe className="w-4 h-4 text-brand-600" />
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider font-display">Redes Sociais</h3>
        </div>
        {redes.seguidores_total != null && (
          <span className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">
            {fmt(redes.seguidores_total)} seguidores
          </span>
        )}
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
        {links.map((l) => (
          <a
            key={l.nome}
            href={l.urlFn(l.user)}
            target="_blank"
            rel="noopener noreferrer"
            className={`flex items-center gap-2 ${l.bg} rounded-lg p-2.5 hover:shadow-sm transition-shadow`}
          >
            <l.Icon className={`w-4 h-4 ${l.color} flex-shrink-0`} />
            <div className="flex-1 min-w-0">
              <p className="text-[10px] uppercase tracking-wider font-bold text-slate-500 leading-tight">{l.nome}</p>
              <p className="text-xs font-bold text-slate-800 truncate">{l.user}</p>
            </div>
            <ExternalLink className="w-3 h-3 text-slate-400 flex-shrink-0" />
          </a>
        ))}
      </div>
    </div>
  );
}


/* ── Footer meta ────────────────────────────────────────────── */
function FooterMeta({ dossie }) {
  return (
    <div className="flex items-center justify-between text-[10px] uppercase tracking-wider text-slate-400 py-4 border-t border-slate-200">
      <span>Fontes: TSE · Câmara Federal · Senado · ALESP · SICONFI · CGU</span>
      <span className="font-bold">Mockup A · Dashboard</span>
    </div>
  );
}


function SectionHeader({ icon: Icon, title, subtitle, accent = "brand" }) {
  const bg = {
    brand:   "bg-brand-100 text-brand-700",
    indigo:  "bg-indigo-100 text-indigo-700",
    violet:  "bg-violet-100 text-violet-700",
    emerald: "bg-emerald-100 text-emerald-700",
    amber:   "bg-amber-100 text-amber-800",
    rose:    "bg-rose-100 text-rose-700",
  }[accent];
  return (
    <div className="flex items-center gap-3 mb-4">
      <div className={`w-10 h-10 rounded-lg ${bg} flex items-center justify-center`}>
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <h3 className="text-base font-black text-slate-900 font-display uppercase tracking-tight leading-tight">{title}</h3>
        <p className="text-[11px] text-slate-500 font-medium">{subtitle}</p>
      </div>
    </div>
  );
}


/* ── Helpers ────────────────────────────────────────────────── */
function tierFrom(overall) {
  if (overall == null) return { label: "Em análise", color: "#64748B", desc: "Dados insuficientes", chipBg: "bg-slate-100", chipText: "text-slate-600" };
  if (overall >= 85) return { label: "Ouro",    color: "#B8860B", desc: "Topo da classificação política",     chipBg: "bg-amber-100",   chipText: "text-amber-800" };
  if (overall >= 70) return { label: "Prata",   color: "#475569", desc: "Desempenho consistente",              chipBg: "bg-slate-200",   chipText: "text-slate-700" };
  if (overall >= 55) return { label: "Bronze",  color: "#92400E", desc: "Resultado intermediário",             chipBg: "bg-orange-100",  chipText: "text-orange-800" };
  return                      { label: "Em construção", color: "#525252", desc: "Indicadores iniciais",        chipBg: "bg-slate-100",   chipText: "text-slate-600" };
}

function riscoFrom(r) {
  const v = (r ?? "").toUpperCase();
  if (v === "ALTO" || v === "ELEVADO") return { label: "Risco Alto",   bg: "bg-red-100",   text: "text-red-700" };
  if (v === "MEDIO" || v === "MÉDIO")  return { label: "Risco Médio",  bg: "bg-amber-100", text: "text-amber-800" };
  if (v === "BAIXO")                    return { label: "Risco Baixo",  bg: "bg-emerald-100", text: "text-emerald-700" };
  return                                  { label: "Sem info",         bg: "bg-slate-100", text: "text-slate-600" };
}

function fmtMoedaCurto(n) {
  if (n == null) return "—";
  const v = Number(n);
  if (v >= 1_000_000) return `R$ ${(v / 1_000_000).toFixed(1).replace(".0", "")} mi`;
  if (v >= 1_000)     return `R$ ${(v / 1_000).toFixed(0)} mil`;
  return fmtMoeda(v);
}


function Loading() {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin mx-auto mb-3" />
        <p className="text-sm text-slate-600 uppercase tracking-wider font-bold">Compilando dashboard</p>
      </div>
    </div>
  );
}


function ErrorState({ msg }) {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-8">
      <div className="max-w-md text-center bg-white p-8 rounded-xl border border-red-200 shadow-lg">
        <XCircle className="w-12 h-12 text-red-500 mx-auto mb-3" />
        <p className="text-xl font-black text-slate-900 mb-2">Erro ao carregar</p>
        <p className="text-sm text-slate-600">{msg}</p>
        <p className="text-xs text-slate-400 mt-4">Verifique se está autenticado em /login</p>
      </div>
    </div>
  );
}
