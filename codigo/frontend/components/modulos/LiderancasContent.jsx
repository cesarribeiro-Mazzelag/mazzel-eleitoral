"use client";

/**
 * Módulo Lideranças — Inteligência Territorial
 *
 * Lista, cria e edita lideranças políticas.
 * Exibe score (OURO/PRATA/BRONZE/CRITICO), filtros por município,
 * coordenador e classificação.
 */

import { useEffect, useState, useCallback } from "react";
import {
  Network, Plus, Search, Pencil, Trash2, X, Check,
  Phone, Mail, MapPin, Star, TrendingUp, AlertCircle,
  Loader2, ChevronLeft, ChevronRight, Users, Award,
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

const SCORE_CONFIG = {
  OURO:    { label: "Ouro",    bg: "bg-yellow-100", text: "text-yellow-800", border: "border-yellow-300", dot: "bg-yellow-500" },
  PRATA:   { label: "Prata",   bg: "bg-gray-100",   text: "text-gray-700",   border: "border-gray-300",   dot: "bg-gray-400" },
  BRONZE:  { label: "Bronze",  bg: "bg-orange-100", text: "text-orange-800", border: "border-orange-300", dot: "bg-orange-500" },
  CRITICO: { label: "Crítico", bg: "bg-red-100",    text: "text-red-800",    border: "border-red-300",    dot: "bg-red-500" },
};

function BadgeScore({ cls }) {
  if (!cls) return <span className="text-xs text-gray-400">-</span>;
  const cfg = SCORE_CONFIG[cls] ?? {};
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-xs font-semibold ${cfg.bg} ${cfg.text} ${cfg.border}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}

function ScoreBar({ valor }) {
  if (valor == null) return null;
  const pct = Math.min(Math.max(valor, 0), 100);
  const color = pct >= 75 ? "bg-yellow-500" : pct >= 50 ? "bg-gray-400" : pct >= 25 ? "bg-orange-500" : "bg-red-500";
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-gray-500 w-8 text-right">{pct.toFixed(0)}</span>
    </div>
  );
}

// ── Modal Criar/Editar ────────────────────────────────────────────────────────

function ModalLideranca({ lideranca, onSalvar, onFechar }) {
  const [form, setForm] = useState({
    nome_completo:  lideranca?.nome_completo  ?? "",
    nome_politico:  lideranca?.nome_politico  ?? "",
    telefone:       lideranca?.telefone       ?? "",
    whatsapp:       lideranca?.whatsapp       ?? "",
    email:          lideranca?.email          ?? "",
    municipio_id:   lideranca?.municipio_id   ?? "",
    bairro:         lideranca?.bairro         ?? "",
    equipe:         lideranca?.equipe         ?? "",
    observacoes:    lideranca?.observacoes    ?? "",
    status:         lideranca?.status         ?? "ATIVO",
  });
  const [municipios, setMunicipios] = useState([]);
  const [ufFiltro, setUfFiltro] = useState("");
  const [salvando, setSalvando] = useState(false);
  const toast = useToast();

  useEffect(() => {
    if (!ufFiltro) { setMunicipios([]); return; }
    fetch(`${API}/liderancas/util/municipios/${ufFiltro}`, { headers: hdr() })
      .then(r => r.json())
      .then(d => setMunicipios(Array.isArray(d) ? d : []))
      .catch(() => setMunicipios([]));
  }, [ufFiltro]);

  function set(k, v) { setForm(p => ({ ...p, [k]: v })); }

  async function salvar() {
    if (!form.nome_completo.trim()) { toast.error("Nome é obrigatório"); return; }
    if (!form.municipio_id) { toast.error("Município é obrigatório"); return; }
    setSalvando(true);
    try {
      const payload = { ...form, municipio_id: Number(form.municipio_id), escola_ids: [] };
      const url  = lideranca ? `${API}/liderancas/${lideranca.id}` : `${API}/liderancas/`;
      const meth = lideranca ? "PATCH" : "POST";
      const res  = await fetch(url, { method: meth, headers: hdr(), body: JSON.stringify(payload) });
      if (!res.ok) { const e = await res.json(); throw new Error(e.detail ?? "Erro"); }
      const data = await res.json();
      toast.success(lideranca ? "Liderança atualizada" : "Liderança criada");
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
          <h2 className="text-lg font-bold text-gray-900">
            {lideranca ? "Editar Liderança" : "Nova Liderança"}
          </h2>
          <button onClick={onFechar} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          {/* Nome */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Nome completo *</label>
            <input className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
              value={form.nome_completo} onChange={e => set("nome_completo", e.target.value)} />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Nome político</label>
            <input className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
              value={form.nome_politico} onChange={e => set("nome_politico", e.target.value)} />
          </div>

          {/* Território */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Estado</label>
              <select className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 outline-none"
                value={ufFiltro} onChange={e => { setUfFiltro(e.target.value); set("municipio_id", ""); }}>
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
            <label className="block text-xs font-semibold text-gray-500 mb-1">Bairro</label>
            <input className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
              value={form.bairro} onChange={e => set("bairro", e.target.value)} />
          </div>

          {/* Contato */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Telefone</label>
              <input className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
                value={form.telefone} onChange={e => set("telefone", e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">WhatsApp</label>
              <input className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
                value={form.whatsapp} onChange={e => set("whatsapp", e.target.value)} />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">E-mail</label>
            <input type="email" className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
              value={form.email} onChange={e => set("email", e.target.value)} />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Equipe / grupo</label>
            <input className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
              value={form.equipe} onChange={e => set("equipe", e.target.value)} />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Status</label>
            <select className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 outline-none"
              value={form.status} onChange={e => set("status", e.target.value)}>
              <option value="ATIVO">Ativo</option>
              <option value="INATIVO">Inativo</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Observações</label>
            <textarea rows={3} className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none resize-none"
              value={form.observacoes} onChange={e => set("observacoes", e.target.value)} />
          </div>
        </div>

        <div className="flex gap-3 px-6 pb-6">
          <button onClick={onFechar}
            className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors">
            Cancelar
          </button>
          <button onClick={salvar} disabled={salvando}
            className="flex-1 py-2.5 rounded-xl bg-purple-700 text-white text-sm font-semibold hover:bg-purple-800 disabled:opacity-50 transition-colors flex items-center justify-center gap-2">
            {salvando ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />}
            {salvando ? "Salvando..." : "Salvar"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Card Liderança ────────────────────────────────────────────────────────────

function CardLideranca({ l, onEditar, onDeletar, podeEditar, podeAdmin }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow p-5">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <p className="font-bold text-gray-900 text-base truncate">{l.nome_completo}</p>
          {l.nome_politico && (
            <p className="text-sm text-purple-700 font-medium truncate">{l.nome_politico}</p>
          )}
        </div>
        <BadgeScore cls={l.score_classificacao} />
      </div>

      <ScoreBar valor={l.score_valor} />

      <div className="mt-3 space-y-1.5">
        {l.municipio_nome && (
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <MapPin size={13} className="text-purple-500 shrink-0" />
            <span className="truncate">{l.municipio_nome}{l.bairro ? ` - ${l.bairro}` : ""}</span>
          </div>
        )}
        {l.equipe && (
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <Users size={13} className="text-purple-500 shrink-0" />
            <span className="truncate">{l.equipe}</span>
          </div>
        )}
        {(l.telefone || l.whatsapp) && (
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <Phone size={13} className="text-green-500 shrink-0" />
            <span>{l.whatsapp ?? l.telefone}</span>
          </div>
        )}
        {l.email && (
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <Mail size={13} className="text-blue-500 shrink-0" />
            <span className="truncate">{l.email}</span>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-50">
        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${l.status === "ATIVO" ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-500"}`}>
          {l.status === "ATIVO" ? "Ativo" : "Inativo"}
        </span>
        {podeEditar && (
          <div className="flex items-center gap-2">
            <button onClick={() => onEditar(l)}
              className="p-1.5 rounded-lg text-gray-400 hover:text-purple-700 hover:bg-purple-50 transition-colors">
              <Pencil size={14} />
            </button>
            {podeAdmin && (
              <button onClick={() => onDeletar(l)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors">
                <Trash2 size={14} />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Página principal ──────────────────────────────────────────────────────────

export function LiderancasContent() {
  const [liderancas, setLiderancas] = useState([]);
  const [total, setTotal]           = useState(0);
  const [page, setPage]             = useState(1);
  const [loading, setLoading]       = useState(true);
  const [modal, setModal]           = useState(null); // null | "criar" | {lideranca}
  const [confirmar, setConfirmar]   = useState(null);
  const [perfil, setPerfil]         = useState(null);

  // Filtros
  const [q, setQ]                   = useState("");
  const [ufFiltro, setUfFiltro]     = useState("");
  const [statusFiltro, setStatus]   = useState("");
  const [classFiltro, setClass_]    = useState("");

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
      if (q)            params.set("q",              q);
      if (ufFiltro)     params.set("estado_uf",      ufFiltro);
      if (statusFiltro) params.set("status",         statusFiltro);
      if (classFiltro)  params.set("classificacao",  classFiltro);

      const res = await fetch(`${API}/liderancas/?${params}`, { headers: hdr() });
      if (!res.ok) throw new Error("Erro ao carregar");
      const d = await res.json();
      setLiderancas(d.items ?? []);
      setTotal(d.total ?? 0);
    } catch (e) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  }, [page, q, ufFiltro, statusFiltro, classFiltro]);

  useEffect(() => { carregar(); }, [carregar]);

  function aoSalvar() { setModal(null); carregar(); }

  async function deletar(l) {
    try {
      const res = await fetch(`${API}/liderancas/${l.id}`, { method: "DELETE", headers: hdr() });
      if (!res.ok && res.status !== 204) throw new Error("Erro ao deletar");
      toast.success("Liderança removida");
      setConfirmar(null);
      carregar();
    } catch (e) {
      toast.error(e.message);
    }
  }

  const podeEditar = ["PRESIDENTE", "DIRETORIA", "FUNCIONARIO"].includes(perfil);
  const podeAdmin  = perfil === "PRESIDENTE";
  const totalPags  = Math.ceil(total / PER_PAGE);

  // KPIs rápidos
  const qtdOuro    = liderancas.filter(l => l.score_classificacao === "OURO").length;
  const qtdCritico = liderancas.filter(l => l.score_classificacao === "CRITICO").length;
  const qtdAtivos  = liderancas.filter(l => l.status === "ATIVO").length;

  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Network size={22} className="text-purple-700" />
            <h1 className="text-2xl font-bold text-gray-900">Lideranças</h1>
          </div>
          <p className="text-sm text-gray-500">
            Inteligência territorial - {total} liderança{total !== 1 ? "s" : ""} cadastrada{total !== 1 ? "s" : ""}
          </p>
        </div>
        {podeEditar && (
          <button onClick={() => setModal("criar")}
            className="flex items-center gap-2 px-4 py-2.5 bg-purple-700 text-white rounded-xl text-sm font-semibold hover:bg-purple-800 transition-colors shadow-sm">
            <Plus size={16} />
            Nova Liderança
          </button>
        )}
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center">
            <Users size={18} className="text-green-600" />
          </div>
          <div>
            <p className="text-xl font-bold text-gray-900">{qtdAtivos}</p>
            <p className="text-xs text-gray-500">Ativos</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-yellow-50 flex items-center justify-center">
            <Award size={18} className="text-yellow-600" />
          </div>
          <div>
            <p className="text-xl font-bold text-gray-900">{qtdOuro}</p>
            <p className="text-xs text-gray-500">Score Ouro</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center">
            <AlertCircle size={18} className="text-red-600" />
          </div>
          <div>
            <p className="text-xl font-bold text-gray-900">{qtdCritico}</p>
            <p className="text-xs text-gray-500">Críticos</p>
          </div>
        </div>
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
          value={ufFiltro} onChange={e => { setUfFiltro(e.target.value); setPage(1); }}>
          <option value="">Todos os estados</option>
          {UFS.map(u => <option key={u} value={u}>{u}</option>)}
        </select>

        <select className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 outline-none"
          value={statusFiltro} onChange={e => { setStatus(e.target.value); setPage(1); }}>
          <option value="">Qualquer status</option>
          <option value="ATIVO">Ativo</option>
          <option value="INATIVO">Inativo</option>
        </select>

        <select className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 outline-none"
          value={classFiltro} onChange={e => { setClass_(e.target.value); setPage(1); }}>
          <option value="">Todas as classificações</option>
          <option value="OURO">Ouro</option>
          <option value="PRATA">Prata</option>
          <option value="BRONZE">Bronze</option>
          <option value="CRITICO">Crítico</option>
        </select>

        {(q || ufFiltro || statusFiltro || classFiltro) && (
          <button onClick={() => { setQ(""); setUfFiltro(""); setStatus(""); setClass_(""); setPage(1); }}
            className="flex items-center gap-1 px-3 py-2 text-sm text-gray-500 hover:text-red-600 border border-gray-200 rounded-lg hover:border-red-200 transition-colors">
            <X size={14} /> Limpar
          </button>
        )}
      </div>

      {/* Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 size={32} className="animate-spin text-purple-600" />
        </div>
      ) : liderancas.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-gray-400">
          <Network size={48} className="mb-4 opacity-30" />
          <p className="text-lg font-semibold text-gray-600">Nenhuma liderança encontrada</p>
          <p className="text-sm mt-1">Ajuste os filtros ou cadastre uma nova liderança</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {liderancas.map(l => (
            <CardLideranca
              key={l.id}
              l={l}
              onEditar={lideranca => setModal(lideranca)}
              onDeletar={lideranca => setConfirmar(lideranca)}
              podeEditar={podeEditar}
              podeAdmin={podeAdmin}
            />
          ))}
        </div>
      )}

      {/* Paginação */}
      {totalPags > 1 && (
        <div className="flex items-center justify-center gap-2 mt-8">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
            className="p-2 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40 transition-colors">
            <ChevronLeft size={16} />
          </button>
          <span className="text-sm text-gray-600 px-3">
            Página {page} de {totalPags}
          </span>
          <button onClick={() => setPage(p => Math.min(totalPags, p + 1))} disabled={page === totalPags}
            className="p-2 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40 transition-colors">
            <ChevronRight size={16} />
          </button>
        </div>
      )}

      {/* Modal criar/editar */}
      {modal && (
        <ModalLideranca
          lideranca={modal === "criar" ? null : modal}
          onSalvar={aoSalvar}
          onFechar={() => setModal(null)}
        />
      )}

      {/* Confirmar delete */}
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
                className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors">
                Cancelar
              </button>
              <button onClick={() => deletar(confirmar)}
                className="flex-1 py-2.5 rounded-xl bg-red-600 text-white text-sm font-semibold hover:bg-red-700 transition-colors">
                Remover
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
