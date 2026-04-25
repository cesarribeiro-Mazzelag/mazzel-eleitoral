"use client";

/**
 * CabosGestao - Gestao de cabos eleitorais (plataforma-v2)
 *
 * Porta o modulo /cabos para a shell Mazzel Preview.
 * Performance: Verde = manteve/cresceu | Amarelo = queda <=15% | Vermelho = queda >15%
 */

import { useEffect, useState, useCallback } from "react";
import {
  Zap, Plus, Search, Pencil, Trash2, X, Check,
  Phone, MapPin, Users, TrendingUp, TrendingDown,
  AlertCircle, Loader2, ChevronLeft, ChevronRight,
  Award, Target, Minus,
} from "lucide-react";
import { fetchJson, ApiError } from "../../api";
import { StatusBanner } from "../../useApiFetch";
import { Icon } from "../../Icon";

// ── Config ────────────────────────────────────────────────────────────────────

const UFS = [
  "AC","AL","AM","AP","BA","CE","DF","ES","GO",
  "MA","MG","MS","MT","PA","PB","PE","PI","PR",
  "RJ","RN","RO","RR","RS","SC","SE","SP","TO",
];

const PERF_CONFIG = {
  VERDE:    { label: "Verde",     chipCls: "chip-green", Icon: TrendingUp   },
  AMARELO:  { label: "Amarelo",   chipCls: "chip-amber", Icon: Minus        },
  VERMELHO: { label: "Vermelho",  chipCls: "chip-red",   Icon: TrendingDown },
  SEM_DADOS:{ label: "Sem dados", chipCls: "chip-muted", Icon: AlertCircle  },
};

const STATUS_CHIP = {
  ATIVO:      "chip-green",
  INATIVO:    "chip-muted",
  RESCINDIDO: "chip-red",
};

// ── Subcomponentes ─────────────────────────────────────────────────────────────

function BadgePerf({ perf }) {
  const cfg = PERF_CONFIG[perf] ?? PERF_CONFIG.SEM_DADOS;
  const PerfIcon = cfg.Icon;
  return (
    <span className={`chip ${cfg.chipCls} inline-flex items-center gap-1`}>
      <PerfIcon size={10} />
      {cfg.label}
    </span>
  );
}

function ConversaoBar({ pct, meta }) {
  if (pct == null) return <span className="text-[11px] t-fg-ghost">Aguardando TSE</span>;
  const cor = pct >= 30 ? "var(--ok)" : pct >= 15 ? "var(--warn)" : "var(--danger)";
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-[11px]">
        <span className="t-fg-muted">Conversao</span>
        <span className="font-bold" style={{ color: cor }}>{pct.toFixed(1)}%</span>
      </div>
      <div className="h-1.5 rounded-full" style={{ background: "var(--rule)" }}>
        <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(pct, 100)}%`, background: cor }} />
      </div>
      {meta && (
        <div className="text-[10px] t-fg-ghost">Meta: {Number(meta).toLocaleString("pt-BR")} votos</div>
      )}
    </div>
  );
}

// ── Modal Criar/Editar ─────────────────────────────────────────────────────────

function ModalCabo({ cabo, onSalvar, onFechar }) {
  const [form, setForm] = useState({
    nome_completo:  cabo?.nome_completo  ?? "",
    nome_guerra:    cabo?.nome_guerra    ?? "",
    telefone:       cabo?.telefone       ?? "",
    whatsapp:       cabo?.whatsapp       ?? "",
    email:          cabo?.email          ?? "",
    municipio_id:   cabo?.municipio_id   ?? "",
    bairros:        cabo?.bairros        ?? "",
    status:         cabo?.status         ?? "ATIVO",
    data_inicio:    cabo?.data_inicio    ?? "",
    valor_contrato: cabo?.valor_contrato ?? "",
    meta_votos:     cabo?.meta_votos     ?? "",
    observacoes:    cabo?.observacoes    ?? "",
  });
  const [ufFiltro, setUf]       = useState("");
  const [municipios, setMuns]   = useState([]);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro]         = useState("");

  useEffect(() => {
    if (!ufFiltro) { setMuns([]); return; }
    fetchJson(`/liderancas/util/municipios/${ufFiltro}`)
      .then(d => setMuns(Array.isArray(d) ? d : []))
      .catch(() => setMuns([]));
  }, [ufFiltro]);

  function set(k, v) { setForm(p => ({ ...p, [k]: v })); }

  async function salvar() {
    setErro("");
    if (!form.nome_completo.trim()) { setErro("Nome e obrigatorio"); return; }
    if (!form.municipio_id)        { setErro("Municipio e obrigatorio"); return; }
    setSalvando(true);
    try {
      const payload = {
        ...form,
        municipio_id:   Number(form.municipio_id),
        valor_contrato: form.valor_contrato ? Number(form.valor_contrato) : null,
        meta_votos:     form.meta_votos     ? Number(form.meta_votos)     : null,
        data_inicio:    form.data_inicio    || null,
        zona_ids: [], escola_ids: [],
      };
      const path = cabo ? `/cabos/${cabo.id}` : `/cabos/`;
      const meth = cabo ? "PATCH" : "POST";
      const data = await fetchJson(path, { method: meth, body: JSON.stringify(payload) });
      onSalvar(data);
    } catch (e) {
      setErro(e.message ?? "Erro ao salvar");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.55)" }}>
      <div className="rounded-2xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto shadow-2xl"
           style={{ background: "var(--bg-card)", border: "1px solid var(--rule)" }}>

        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4" style={{ borderBottom: "1px solid var(--rule)" }}>
          <h2 className="text-[16px] font-bold t-fg-strong">{cabo ? "Editar Cabo Eleitoral" : "Novo Cabo Eleitoral"}</h2>
          <button onClick={onFechar} className="t-fg-muted hover:t-fg transition-colors"><X size={18} /></button>
        </div>

        <div className="px-6 py-5 space-y-4">
          {erro && (
            <div className="rounded-lg px-4 py-2.5 text-[12px]"
                 style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.35)", color: "var(--danger)" }}>
              {erro}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="block text-[11px] font-semibold t-fg-dim mb-1">Nome completo *</label>
              <input className="input-v2 w-full" value={form.nome_completo} onChange={e => set("nome_completo", e.target.value)} />
            </div>
            <div>
              <label className="block text-[11px] font-semibold t-fg-dim mb-1">Nome de guerra</label>
              <input className="input-v2 w-full" value={form.nome_guerra} onChange={e => set("nome_guerra", e.target.value)} />
            </div>
            <div>
              <label className="block text-[11px] font-semibold t-fg-dim mb-1">Status</label>
              <select className="input-v2 w-full" value={form.status} onChange={e => set("status", e.target.value)}>
                <option value="ATIVO">Ativo</option>
                <option value="INATIVO">Inativo</option>
                <option value="RESCINDIDO">Rescindido</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold t-fg-dim mb-1">Estado</label>
              <select className="input-v2 w-full" value={ufFiltro}
                onChange={e => { setUf(e.target.value); set("municipio_id", ""); }}>
                <option value="">Selecione</option>
                {UFS.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-semibold t-fg-dim mb-1">Municipio *</label>
              <select className="input-v2 w-full" value={form.municipio_id} onChange={e => set("municipio_id", e.target.value)}>
                <option value="">{ufFiltro ? "Selecione" : "Escolha o estado"}</option>
                {municipios.map(m => <option key={m.id} value={m.id}>{m.nome}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold t-fg-dim mb-1">Bairros (area de atuacao)</label>
            <input className="input-v2 w-full" placeholder="Ex: Brasilandia, Freguesia do O, Cachoeirinha"
              value={form.bairros} onChange={e => set("bairros", e.target.value)} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold t-fg-dim mb-1">WhatsApp</label>
              <input className="input-v2 w-full" value={form.whatsapp} onChange={e => set("whatsapp", e.target.value)} />
            </div>
            <div>
              <label className="block text-[11px] font-semibold t-fg-dim mb-1">Telefone</label>
              <input className="input-v2 w-full" value={form.telefone} onChange={e => set("telefone", e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-semibold t-fg-dim mb-1">Inicio contrato</label>
              <input type="date" className="input-v2 w-full" value={form.data_inicio} onChange={e => set("data_inicio", e.target.value)} />
            </div>
            <div>
              <label className="block text-[11px] font-semibold t-fg-dim mb-1">Valor (R$)</label>
              <input type="number" className="input-v2 w-full" value={form.valor_contrato} onChange={e => set("valor_contrato", e.target.value)} />
            </div>
            <div>
              <label className="block text-[11px] font-semibold t-fg-dim mb-1">Meta de votos</label>
              <input type="number" className="input-v2 w-full" value={form.meta_votos} onChange={e => set("meta_votos", e.target.value)} />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold t-fg-dim mb-1">Observacoes</label>
            <textarea rows={3} className="input w-full resize-none" value={form.observacoes} onChange={e => set("observacoes", e.target.value)} />
          </div>
        </div>

        <div className="flex gap-3 px-6 pb-6">
          <button onClick={onFechar} className="btn-ghost flex-1">Cancelar</button>
          <button onClick={salvar} disabled={salvando} className="btn-primary flex-1 flex items-center justify-center gap-2">
            {salvando ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
            {salvando ? "Salvando..." : "Salvar"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Card Cabo ─────────────────────────────────────────────────────────────────

function CardCabo({ c, onEditar, onDeletar, podeEditar }) {
  const variacao = c.variacao_pct;
  return (
    <div className="rounded-2xl p-5 transition-shadow hover:shadow-md"
         style={{ background: "var(--bg-card)", border: "1px solid var(--rule)" }}>

      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex-1 min-w-0">
          <p className="font-bold t-fg-strong truncate text-[14px]">{c.nome_completo}</p>
          {c.nome_guerra && (
            <p className="text-[12px] font-medium" style={{ color: "var(--brand)" }}>"{c.nome_guerra}"</p>
          )}
        </div>
        <BadgePerf perf={c.performance} />
      </div>

      <ConversaoBar pct={c.conversao_pct} meta={c.meta_votos} />

      {variacao != null && (
        <div className={`flex items-center gap-1 mt-2 text-[11px] font-semibold`}
             style={{ color: variacao >= 0 ? "var(--ok)" : "var(--danger)" }}>
          {variacao >= 0 ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
          {variacao >= 0 ? "+" : ""}{variacao.toFixed(1)}% vs ciclo anterior
        </div>
      )}

      <div className="mt-3 space-y-1.5">
        {c.municipio_nome && (
          <div className="flex items-center gap-2 text-[11px] t-fg-muted">
            <MapPin size={12} style={{ color: "var(--brand)", flexShrink: 0 }} />
            <span className="truncate">{c.municipio_nome}</span>
          </div>
        )}
        {c.bairros && (
          <div className="flex items-center gap-2 text-[11px] t-fg-muted">
            <Zap size={12} style={{ color: "var(--warn)", flexShrink: 0 }} />
            <span className="truncate">{c.bairros}</span>
          </div>
        )}
        {(c.whatsapp || c.telefone) && (
          <div className="flex items-center gap-2 text-[11px] t-fg-muted">
            <Phone size={12} style={{ color: "var(--ok)", flexShrink: 0 }} />
            <span>{c.whatsapp ?? c.telefone}</span>
          </div>
        )}
        {c.escola_ids?.length > 0 && (
          <div className="flex items-center gap-2 text-[11px] t-fg-muted">
            <Target size={12} className="shrink-0" style={{ color: "#3b82f6" }} />
            <span>{c.escola_ids.length} escola{c.escola_ids.length > 1 ? "s" : ""} vinculada{c.escola_ids.length > 1 ? "s" : ""}</span>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between mt-4 pt-3" style={{ borderTop: "1px solid var(--rule)" }}>
        <div className="flex items-center gap-2">
          <span className={`chip ${STATUS_CHIP[c.status] ?? "chip-muted"} text-[10px]`}>
            {c.status === "ATIVO" ? "Ativo" : c.status === "RESCINDIDO" ? "Rescindido" : "Inativo"}
          </span>
          {c.valor_contrato && (
            <span className="text-[11px] t-fg-ghost">
              R$ {Number(c.valor_contrato).toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </span>
          )}
        </div>
        {podeEditar && (
          <div className="flex items-center gap-1">
            <button onClick={() => onEditar(c)}
              className="p-1.5 rounded-lg t-fg-muted transition-colors"
              style={{ "--hover-bg": "rgba(var(--brand-rgb),0.08)" }}
              onMouseEnter={e => e.currentTarget.style.background = "rgba(139,92,246,0.08)"}
              onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
              <Pencil size={13} />
            </button>
            <button onClick={() => onDeletar(c)}
              className="p-1.5 rounded-lg t-fg-muted transition-colors"
              onMouseEnter={e => { e.currentTarget.style.background = "rgba(239,68,68,0.08)"; e.currentTarget.style.color = "var(--danger)"; }}
              onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = ""; }}>
              <Trash2 size={13} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Modal Confirmar Exclusao ──────────────────────────────────────────────────

function ModalConfirmar({ cabo, onConfirmar, onFechar }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.55)" }}>
      <div className="rounded-2xl w-full max-w-sm mx-4 p-6 shadow-2xl"
           style={{ background: "var(--bg-card)", border: "1px solid var(--rule)" }}>
        <div className="w-11 h-11 rounded-full flex items-center justify-center mx-auto mb-4"
             style={{ background: "rgba(239,68,68,0.1)" }}>
          <Trash2 size={20} style={{ color: "var(--danger)" }} />
        </div>
        <h3 className="text-center font-bold t-fg-strong text-[16px] mb-2">Confirmar exclusao</h3>
        <p className="text-center text-[12px] t-fg-muted mb-6">
          Remover <strong className="t-fg">{cabo.nome_completo}</strong>? Esta acao nao pode ser desfeita.
        </p>
        <div className="flex gap-3">
          <button onClick={onFechar} className="btn-ghost flex-1">Cancelar</button>
          <button onClick={onConfirmar}
            className="flex-1 py-2 rounded-xl text-[13px] font-semibold text-white"
            style={{ background: "var(--danger)" }}>
            Remover
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Pagina principal ──────────────────────────────────────────────────────────

export function CabosGestao() {
  const [cabos, setCabos]         = useState([]);
  const [total, setTotal]         = useState(0);
  const [page, setPage]           = useState(1);
  const [loading, setLoading]     = useState(true);
  const [modal, setModal]         = useState(null);       // null | "criar" | objeto cabo
  const [confirmar, setConfirmar] = useState(null);
  const [perfil, setPerfil]       = useState(null);
  const [errorMsg, setErrorMsg]   = useState("");
  const [statusLoad, setStatusLoad] = useState("loading");

  const [q, setQ]             = useState("");
  const [perfFiltro, setPerf] = useState("");
  const [statusFiltro, setSt] = useState("");

  const PER_PAGE = 24;

  useEffect(() => {
    fetchJson("/auth/me")
      .then(d => setPerfil(d?.perfil ?? null))
      .catch(() => {});
  }, []);

  const carregar = useCallback(async () => {
    setLoading(true);
    setErrorMsg("");
    try {
      const params = new URLSearchParams({ page, per_page: PER_PAGE });
      if (q)            params.set("q",          q);
      if (perfFiltro)   params.set("performance", perfFiltro);
      if (statusFiltro) params.set("status",      statusFiltro);
      const d = await fetchJson(`/cabos/?${params}`);
      setCabos(d.items ?? []);
      setTotal(d.total ?? 0);
      setStatusLoad("ok");
    } catch (e) {
      setErrorMsg(e.message ?? "Erro ao carregar cabos");
      setStatusLoad(e instanceof ApiError && (e.status === 401 || e.status === 403) ? "unauth" : "error");
    } finally {
      setLoading(false);
    }
  }, [page, q, perfFiltro, statusFiltro]);

  useEffect(() => { carregar(); }, [carregar]);

  async function deletar(c) {
    try {
      await fetchJson(`/cabos/${c.id}`, { method: "DELETE" });
      setConfirmar(null);
      carregar();
    } catch (e) {
      setErrorMsg(e.message ?? "Erro ao remover");
    }
  }

  const podeEditar = ["PRESIDENTE", "DIRETORIA", "FUNCIONARIO"].includes(perfil);
  const totalPags  = Math.ceil(total / PER_PAGE);

  const qtdVerde    = cabos.filter(c => c.performance === "VERDE").length;
  const qtdAmarelo  = cabos.filter(c => c.performance === "AMARELO").length;
  const qtdVermelho = cabos.filter(c => c.performance === "VERMELHO").length;
  const qtdAtivos   = cabos.filter(c => c.status === "ATIVO").length;

  return (
    <div className="bg-page-grad min-h-full">
      <div className="max-w-[1600px] mx-auto px-8 py-7">
        <StatusBanner status={statusLoad} errorMsg={errorMsg} />

        {/* Header */}
        <div className="flex items-end justify-between mb-6">
          <div>
            <div className="text-[11px] t-fg-dim tracking-[0.18em] uppercase font-semibold">Cabos Eleitorais</div>
            <h1 className="text-[32px] font-display font-bold t-fg-strong mt-1 leading-none">Gestao de Campo</h1>
            <div className="text-[13px] t-fg-muted mt-1.5">
              {total} cabo{total !== 1 ? "s" : ""} cadastrado{total !== 1 ? "s" : ""} - agentes de conversao territorial
            </div>
          </div>
          {podeEditar && (
            <button onClick={() => setModal("criar")} className="btn-primary flex items-center gap-2">
              <Plus size={13} />
              Novo Cabo
            </button>
          )}
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {[
            { icon: Users,        val: qtdAtivos,   label: "Ativos",              color: "var(--brand)"  },
            { icon: TrendingUp,   val: qtdVerde,    label: "Performance Verde",   color: "var(--ok)"     },
            { icon: Minus,        val: qtdAmarelo,  label: "Performance Amarela", color: "var(--warn)"   },
            { icon: TrendingDown, val: qtdVermelho, label: "Performance Vermelha",color: "var(--danger)" },
          ].map(({ icon: KpiIcon, val, label, color }) => (
            <div key={label} className="rounded-xl p-4 flex items-center gap-3"
                 style={{ background: "var(--bg-card)", border: "1px solid var(--rule)" }}>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                   style={{ background: `${color}18` }}>
                <KpiIcon size={18} style={{ color }} />
              </div>
              <div>
                <p className="text-[22px] font-bold t-fg-strong leading-none">{val}</p>
                <p className="text-[11px] t-fg-muted mt-0.5">{label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Info performance */}
        <div className="rounded-xl px-4 py-3 mb-5 flex items-start gap-2 text-[11px]"
             style={{ background: "rgba(59,130,246,0.06)", border: "1px solid rgba(59,130,246,0.2)", color: "#3b82f6" }}>
          <Award size={13} style={{ flexShrink: 0, marginTop: 1 }} />
          <span>
            <strong>Como a performance e calculada:</strong> Votos obtidos nas escolas vinculadas / eleitorado da area = taxa de conversao.
            Comparado ao ciclo eleitoral anterior.
            <strong> Verde</strong> = manteve ou cresceu |
            <strong> Amarelo</strong> = queda ate 15% |
            <strong> Vermelho</strong> = queda acima de 15%.
            Os dados sao preenchidos automaticamente apos importacao do TSE.
          </span>
        </div>

        {/* Filtros */}
        <div className="rounded-xl p-4 mb-6 flex flex-wrap gap-3"
             style={{ background: "var(--bg-card)", border: "1px solid var(--rule)" }}>
          <div className="relative flex-1 min-w-[200px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 t-fg-dim" />
            <input
              className="input w-full pl-9"
              placeholder="Buscar por nome..."
              value={q}
              onChange={e => { setQ(e.target.value); setPage(1); }}
            />
          </div>

          <select className="input-v2" value={statusFiltro} onChange={e => { setSt(e.target.value); setPage(1); }}>
            <option value="">Qualquer status</option>
            <option value="ATIVO">Ativo</option>
            <option value="INATIVO">Inativo</option>
            <option value="RESCINDIDO">Rescindido</option>
          </select>

          <select className="input-v2" value={perfFiltro} onChange={e => { setPerf(e.target.value); setPage(1); }}>
            <option value="">Todas as performances</option>
            <option value="VERDE">Verde</option>
            <option value="AMARELO">Amarelo</option>
            <option value="VERMELHO">Vermelho</option>
            <option value="SEM_DADOS">Sem dados</option>
          </select>

          {(q || perfFiltro || statusFiltro) && (
            <button onClick={() => { setQ(""); setPerf(""); setSt(""); setPage(1); }}
              className="btn-ghost flex items-center gap-1 text-[12px]">
              <X size={13} /> Limpar
            </button>
          )}
        </div>

        {/* Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 size={32} className="animate-spin" style={{ color: "var(--brand)" }} />
          </div>
        ) : cabos.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 t-fg-muted">
            <Zap size={44} className="mb-4 opacity-30" />
            <p className="text-[16px] font-semibold t-fg">Nenhum cabo eleitoral encontrado</p>
            <p className="text-[13px] mt-1 t-fg-muted">Cadastre os agentes de campo da sua estrutura</p>
            {podeEditar && (
              <button onClick={() => setModal("criar")} className="btn-primary mt-4 flex items-center gap-2">
                <Plus size={13} /> Cadastrar primeiro cabo
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {cabos.map(c => (
              <CardCabo
                key={c.id}
                c={c}
                onEditar={cabo => setModal(cabo)}
                onDeletar={cabo => setConfirmar(cabo)}
                podeEditar={podeEditar}
              />
            ))}
          </div>
        )}

        {/* Paginacao */}
        {totalPags > 1 && (
          <div className="flex items-center justify-center gap-2 mt-8">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
              className="btn-ghost p-2 disabled:opacity-40">
              <ChevronLeft size={15} />
            </button>
            <span className="text-[13px] t-fg-muted px-3">Pagina {page} de {totalPags}</span>
            <button onClick={() => setPage(p => Math.min(totalPags, p + 1))} disabled={page === totalPags}
              className="btn-ghost p-2 disabled:opacity-40">
              <ChevronRight size={15} />
            </button>
          </div>
        )}
      </div>

      {/* Modais */}
      {modal && (
        <ModalCabo
          cabo={modal === "criar" ? null : modal}
          onSalvar={() => { setModal(null); carregar(); }}
          onFechar={() => setModal(null)}
        />
      )}

      {confirmar && (
        <ModalConfirmar
          cabo={confirmar}
          onConfirmar={() => deletar(confirmar)}
          onFechar={() => setConfirmar(null)}
        />
      )}
    </div>
  );
}
