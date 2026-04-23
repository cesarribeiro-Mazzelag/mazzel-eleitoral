"use client";

/**
 * Módulo Cabos Eleitorais
 *
 * Agentes de campo contratados por coordenadores.
 * Performance medida por conversão de voto na urna (dados TSE).
 * Verde = bateu/superou ciclo anterior | Amarelo = queda ≤15% | Vermelho = queda >15%
 */

import { useEffect, useState, useCallback } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import {
  Zap, Plus, Search, Pencil, Trash2, X, Check,
  Phone, MapPin, Users, TrendingUp, TrendingDown,
  AlertCircle, Loader2, ChevronLeft, ChevronRight,
  Award, Target, Minus,
} from "lucide-react";
import { useToast } from "@/lib/toast";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8002";

function tkn() {
  if (typeof window === "undefined") return "";
  return localStorage.getItem("ub_token") ?? "";
}
function hdr() {
  return { Authorization: `Bearer ${tkn()}`, "Content-Type": "application/json" };
}

const UFS = [
  "AC","AL","AM","AP","BA","CE","DF","ES","GO",
  "MA","MG","MS","MT","PA","PB","PE","PI","PR",
  "RJ","RN","RO","RR","RS","SC","SE","SP","TO",
];

const PERF_CONFIG = {
  VERDE:     { label: "Verde",     bg: "bg-green-50",  text: "text-green-700",  border: "border-green-200",  dot: "bg-green-500",  Icon: TrendingUp   },
  AMARELO:   { label: "Amarelo",   bg: "bg-yellow-50", text: "text-yellow-700", border: "border-yellow-200", dot: "bg-yellow-500", Icon: Minus        },
  VERMELHO:  { label: "Vermelho",  bg: "bg-red-50",    text: "text-red-700",    border: "border-red-200",    dot: "bg-red-500",    Icon: TrendingDown },
  SEM_DADOS: { label: "Sem dados", bg: "bg-gray-50",   text: "text-gray-500",   border: "border-gray-200",   dot: "bg-gray-300",   Icon: AlertCircle  },
};

function BadgePerformance({ perf }) {
  const cfg = PERF_CONFIG[perf] ?? PERF_CONFIG.SEM_DADOS;
  const Icon = cfg.Icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-xs font-semibold ${cfg.bg} ${cfg.text} ${cfg.border}`}>
      <Icon size={11} />
      {cfg.label}
    </span>
  );
}

function ConversaoBar({ pct, meta }) {
  if (pct == null) return <span className="text-xs text-gray-300">Aguardando TSE</span>;
  const cor = pct >= 30 ? "#16A34A" : pct >= 15 ? "#B45309" : "#DC2626";
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-gray-500">Conversão</span>
        <span className="font-bold" style={{ color: cor }}>{pct.toFixed(1)}%</span>
      </div>
      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(pct, 100)}%`, background: cor }} />
      </div>
      {meta && (
        <div className="text-[10px] text-gray-400">Meta: {meta.toLocaleString("pt-BR")} votos</div>
      )}
    </div>
  );
}

// ── Modal criar/editar ────────────────────────────────────────────────────────

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
  const toast = useToast();

  useEffect(() => {
    if (!ufFiltro) { setMuns([]); return; }
    fetch(`${API}/liderancas/util/municipios/${ufFiltro}`, { headers: hdr() })
      .then(r => r.json())
      .then(d => setMuns(Array.isArray(d) ? d : []))
      .catch(() => setMuns([]));
  }, [ufFiltro]);

  function set(k, v) { setForm(p => ({ ...p, [k]: v })); }

  async function salvar() {
    if (!form.nome_completo.trim()) { toast.error("Nome é obrigatório"); return; }
    if (!form.municipio_id) { toast.error("Município é obrigatório"); return; }
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
      const url  = cabo ? `${API}/cabos/${cabo.id}` : `${API}/cabos/`;
      const meth = cabo ? "PATCH" : "POST";
      const res  = await fetch(url, { method: meth, headers: hdr(), body: JSON.stringify(payload) });
      if (!res.ok) { const e = await res.json(); throw new Error(e.detail ?? "Erro"); }
      const data = await res.json();
      toast.success(cabo ? "Cabo atualizado" : "Cabo criado");
      onSalvar(data);
    } catch (e) {
      toast.error(e.message);
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900">{cabo ? "Editar Cabo Eleitoral" : "Novo Cabo Eleitoral"}</h2>
          <button onClick={onFechar} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
        </div>

        <div className="px-6 py-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="block text-xs font-semibold text-gray-500 mb-1">Nome completo *</label>
              <input className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 outline-none"
                value={form.nome_completo} onChange={e => set("nome_completo", e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Nome de guerra</label>
              <input className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 outline-none"
                value={form.nome_guerra} onChange={e => set("nome_guerra", e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Status</label>
              <select className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 outline-none"
                value={form.status} onChange={e => set("status", e.target.value)}>
                <option value="ATIVO">Ativo</option>
                <option value="INATIVO">Inativo</option>
                <option value="RESCINDIDO">Rescindido</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Estado</label>
              <select className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 outline-none"
                value={ufFiltro} onChange={e => { setUf(e.target.value); set("municipio_id", ""); }}>
                <option value="">Selecione</option>
                {UFS.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Município *</label>
              <select className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 outline-none"
                value={form.municipio_id} onChange={e => set("municipio_id", e.target.value)}>
                <option value="">{ufFiltro ? "Selecione" : "Escolha o estado"}</option>
                {municipios.map(m => <option key={m.id} value={m.id}>{m.nome}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Bairros (área de atuação)</label>
            <input className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 outline-none"
              placeholder="Ex: Brasilândia, Freguesia do Ó, Cachoeirinha"
              value={form.bairros} onChange={e => set("bairros", e.target.value)} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">WhatsApp</label>
              <input className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 outline-none"
                value={form.whatsapp} onChange={e => set("whatsapp", e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Telefone</label>
              <input className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 outline-none"
                value={form.telefone} onChange={e => set("telefone", e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Início contrato</label>
              <input type="date" className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 outline-none"
                value={form.data_inicio} onChange={e => set("data_inicio", e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Valor (R$)</label>
              <input type="number" className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 outline-none"
                value={form.valor_contrato} onChange={e => set("valor_contrato", e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Meta de votos</label>
              <input type="number" className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 outline-none"
                value={form.meta_votos} onChange={e => set("meta_votos", e.target.value)} />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Observações</label>
            <textarea rows={3} className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 outline-none resize-none"
              value={form.observacoes} onChange={e => set("observacoes", e.target.value)} />
          </div>
        </div>

        <div className="flex gap-3 px-6 pb-6">
          <button onClick={onFechar} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50">Cancelar</button>
          <button onClick={salvar} disabled={salvando}
            className="flex-1 py-2.5 rounded-xl bg-purple-700 text-white text-sm font-semibold hover:bg-purple-800 disabled:opacity-50 flex items-center justify-center gap-2">
            {salvando ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />}
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
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow p-5">
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex-1 min-w-0">
          <p className="font-bold text-gray-900 truncate">{c.nome_completo}</p>
          {c.nome_guerra && <p className="text-sm text-purple-700 font-medium">"{c.nome_guerra}"</p>}
        </div>
        <BadgePerformance perf={c.performance} />
      </div>

      <ConversaoBar pct={c.conversao_pct} meta={c.meta_votos} />

      {variacao != null && (
        <div className={`flex items-center gap-1 mt-2 text-xs font-semibold ${variacao >= 0 ? "text-green-600" : "text-red-600"}`}>
          {variacao >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
          {variacao >= 0 ? "+" : ""}{variacao.toFixed(1)}% vs ciclo anterior
        </div>
      )}

      <div className="mt-3 space-y-1.5">
        {c.municipio_nome && (
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <MapPin size={13} className="text-purple-500 shrink-0" />
            <span className="truncate">{c.municipio_nome}</span>
          </div>
        )}
        {c.bairros && (
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <Zap size={13} className="text-amber-500 shrink-0" />
            <span className="truncate">{c.bairros}</span>
          </div>
        )}
        {(c.whatsapp || c.telefone) && (
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <Phone size={13} className="text-green-500 shrink-0" />
            <span>{c.whatsapp ?? c.telefone}</span>
          </div>
        )}
        {c.escola_ids?.length > 0 && (
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <Target size={13} className="text-blue-500 shrink-0" />
            <span>{c.escola_ids.length} escola{c.escola_ids.length > 1 ? "s" : ""} vinculada{c.escola_ids.length > 1 ? "s" : ""}</span>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-50">
        <div className="flex items-center gap-2">
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
            c.status === "ATIVO"      ? "bg-green-50 text-green-700" :
            c.status === "RESCINDIDO" ? "bg-red-50 text-red-600"    :
                                        "bg-gray-100 text-gray-500"
          }`}>
            {c.status === "ATIVO" ? "Ativo" : c.status === "RESCINDIDO" ? "Rescindido" : "Inativo"}
          </span>
          {c.valor_contrato && (
            <span className="text-xs text-gray-400">
              R$ {Number(c.valor_contrato).toLocaleString("pt-BR")}
            </span>
          )}
        </div>
        {podeEditar && (
          <div className="flex items-center gap-2">
            <button onClick={() => onEditar(c)} className="p-1.5 rounded-lg text-gray-400 hover:text-purple-700 hover:bg-purple-50 transition-colors">
              <Pencil size={14} />
            </button>
            <button onClick={() => onDeletar(c)} className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors">
              <Trash2 size={14} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Página principal ──────────────────────────────────────────────────────────

export default function CabosPage() {
  const [cabos, setCabos]       = useState([]);
  const [total, setTotal]       = useState(0);
  const [page, setPage]         = useState(1);
  const [loading, setLoading]   = useState(true);
  const [modal, setModal]       = useState(null);
  const [confirmar, setConfirmar] = useState(null);
  const [perfil, setPerfil]     = useState(null);

  const [q, setQ]               = useState("");
  const [perfFiltro, setPerf]   = useState("");
  const [statusFiltro, setSt]   = useState("");

  const PER_PAGE = 24;
  const toast = useToast();

  useEffect(() => {
    fetch(`${API}/auth/me`, { headers: hdr() })
      .then(r => r.json())
      .then(d => setPerfil(d?.perfil ?? null))
      .catch(() => {});
  }, []);

  const carregar = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, per_page: PER_PAGE });
      if (q)           params.set("q",           q);
      if (perfFiltro)  params.set("performance",  perfFiltro);
      if (statusFiltro) params.set("status",      statusFiltro);
      const res = await fetch(`${API}/cabos/?${params}`, { headers: hdr() });
      if (!res.ok) throw new Error("Erro ao carregar");
      const d = await res.json();
      setCabos(d.items ?? []);
      setTotal(d.total ?? 0);
    } catch (e) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  }, [page, q, perfFiltro, statusFiltro]);

  useEffect(() => { carregar(); }, [carregar]);

  async function deletar(c) {
    try {
      const res = await fetch(`${API}/cabos/${c.id}`, { method: "DELETE", headers: hdr() });
      if (!res.ok && res.status !== 204) throw new Error("Erro ao remover");
      toast.success("Cabo removido");
      setConfirmar(null);
      carregar();
    } catch (e) {
      toast.error(e.message);
    }
  }

  const podeEditar = ["PRESIDENTE", "DIRETORIA", "FUNCIONARIO"].includes(perfil);
  const totalPags  = Math.ceil(total / PER_PAGE);

  const qtdVerde    = cabos.filter(c => c.performance === "VERDE").length;
  const qtdAmarelo  = cabos.filter(c => c.performance === "AMARELO").length;
  const qtdVermelho = cabos.filter(c => c.performance === "VERMELHO").length;
  const qtdAtivos   = cabos.filter(c => c.status === "ATIVO").length;

  return (
    <AppLayout>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Zap size={22} className="text-purple-700" />
            <h1 className="text-2xl font-bold text-gray-900">Cabos Eleitorais</h1>
          </div>
          <p className="text-sm text-gray-500">
            Agentes de campo - {total} cabo{total !== 1 ? "s" : ""} cadastrado{total !== 1 ? "s" : ""}
          </p>
        </div>
        {podeEditar && (
          <button onClick={() => setModal("criar")}
            className="flex items-center gap-2 px-4 py-2.5 bg-purple-700 text-white rounded-xl text-sm font-semibold hover:bg-purple-800 shadow-sm">
            <Plus size={16} />
            Novo Cabo
          </button>
        )}
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { icon: Users,       cor: "text-purple-600", bg: "bg-purple-50", val: qtdAtivos,   label: "Ativos" },
          { icon: TrendingUp,  cor: "text-green-600",  bg: "bg-green-50",  val: qtdVerde,    label: "Performance Verde" },
          { icon: Minus,       cor: "text-yellow-600", bg: "bg-yellow-50", val: qtdAmarelo,  label: "Performance Amarela" },
          { icon: TrendingDown,cor: "text-red-600",    bg: "bg-red-50",    val: qtdVermelho, label: "Performance Vermelha" },
        ].map(({ icon: Icon, cor, bg, val, label }) => (
          <div key={label} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center`}>
              <Icon size={18} className={cor} />
            </div>
            <div>
              <p className="text-xl font-bold text-gray-900">{val}</p>
              <p className="text-xs text-gray-500">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Nota sobre performance */}
      <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-2.5 mb-5 text-xs text-blue-700 flex items-start gap-2">
        <Award size={14} className="shrink-0 mt-0.5" />
        <span>
          <strong>Como a performance é calculada:</strong> Votos obtidos nas escolas vinculadas ÷ eleitorado da área = taxa de conversão.
          Comparado ao ciclo eleitoral anterior. <strong>Verde</strong> = manteve ou cresceu | <strong>Amarelo</strong> = queda até 15% | <strong>Vermelho</strong> = queda acima de 15%.
          Os dados são preenchidos automaticamente após importação do TSE.
        </span>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 mb-6 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
            placeholder="Buscar por nome..."
            value={q}
            onChange={e => { setQ(e.target.value); setPage(1); }}
          />
        </div>

        <select className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 outline-none"
          value={statusFiltro} onChange={e => { setSt(e.target.value); setPage(1); }}>
          <option value="">Qualquer status</option>
          <option value="ATIVO">Ativo</option>
          <option value="INATIVO">Inativo</option>
          <option value="RESCINDIDO">Rescindido</option>
        </select>

        <select className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 outline-none"
          value={perfFiltro} onChange={e => { setPerf(e.target.value); setPage(1); }}>
          <option value="">Todas as performances</option>
          <option value="VERDE">Verde</option>
          <option value="AMARELO">Amarelo</option>
          <option value="VERMELHO">Vermelho</option>
          <option value="SEM_DADOS">Sem dados</option>
        </select>

        {(q || perfFiltro || statusFiltro) && (
          <button onClick={() => { setQ(""); setPerf(""); setSt(""); setPage(1); }}
            className="flex items-center gap-1 px-3 py-2 text-sm text-gray-500 hover:text-red-600 border border-gray-200 rounded-lg hover:border-red-200">
            <X size={14} /> Limpar
          </button>
        )}
      </div>

      {/* Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 size={32} className="animate-spin text-purple-600" />
        </div>
      ) : cabos.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-gray-400">
          <Zap size={48} className="mb-4 opacity-30" />
          <p className="text-lg font-semibold text-gray-600">Nenhum cabo eleitoral encontrado</p>
          <p className="text-sm mt-1">Cadastre os agentes de campo da sua estrutura</p>
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

      {/* Paginação */}
      {totalPags > 1 && (
        <div className="flex items-center justify-center gap-2 mt-8">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
            className="p-2 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40">
            <ChevronLeft size={16} />
          </button>
          <span className="text-sm text-gray-600 px-3">Página {page} de {totalPags}</span>
          <button onClick={() => setPage(p => Math.min(totalPags, p + 1))} disabled={page === totalPags}
            className="p-2 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40">
            <ChevronRight size={16} />
          </button>
        </div>
      )}

      {/* Modais */}
      {modal && (
        <ModalCabo
          cabo={modal === "criar" ? null : modal}
          onSalvar={() => { setModal(null); carregar(); }}
          onFechar={() => setModal(null)}
        />
      )}

      {confirmar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 p-6">
            <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
              <Trash2 size={22} className="text-red-600" />
            </div>
            <h3 className="text-center font-bold text-gray-900 text-lg mb-2">Confirmar exclusão</h3>
            <p className="text-center text-sm text-gray-500 mb-6">
              Remover <strong>{confirmar.nome_completo}</strong>? Esta ação não pode ser desfeita.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmar(null)}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50">
                Cancelar
              </button>
              <button onClick={() => deletar(confirmar)}
                className="flex-1 py-2.5 rounded-xl bg-red-600 text-white text-sm font-semibold hover:bg-red-700">
                Remover
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
