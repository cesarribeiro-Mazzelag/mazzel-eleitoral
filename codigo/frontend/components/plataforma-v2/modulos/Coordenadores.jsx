"use client";

/**
 * Modulo Coordenadores - portado de app/coordenadores/page.jsx
 *
 * Adaptacoes para mazzel-preview:
 * - Removido AppLayout (shell proprio do mazzel-preview via layout.jsx)
 * - API calls via fetchJson de @/components/plataforma-v2/api
 * - Token lido via tokenFromStorage (localStorage ub_token) igual ao resto da plataforma
 */

import { useEffect, useState, useMemo, useCallback } from "react";
import {
  Users, Plus, Pencil, Trash2, Search, ChevronRight,
  X, Check, MapPin, BarChart2, Trophy, AlertCircle, Loader2,
} from "lucide-react";
import { fetchJson } from "@/components/plataforma-v2/api";
import { useToast } from "@/lib/toast";

function fmt(n) {
  if (n == null) return "-";
  return Number(n).toLocaleString("pt-BR");
}

const UFS = [
  "AC","AL","AM","AP","BA","CE","DF","ES","GO",
  "MA","MG","MS","MT","PA","PB","PE","PI","PR",
  "RJ","RN","RO","RR","RS","SC","SE","SP","TO",
];

// ── Modal Criar/Editar Coordenador ────────────────────────────────────────────

function ModalCoordenador({ coord, uf, onSalvar, onFechar }) {
  const [form, setForm] = useState({
    nome:       coord?.nome       ?? "",
    email:      coord?.email      ?? "",
    telefone:   coord?.telefone   ?? "",
    estado_uf:  coord?.estado_uf  ?? uf ?? "",
    cor_hex:    coord?.cor_hex    ?? "#3B82F6",
  });
  const [salvando, setSalvando] = useState(false);
  const toast = useToast();

  async function salvar() {
    if (!form.nome.trim()) { toast.error("Nome e obrigatorio"); return; }
    if (!form.estado_uf)   { toast.error("Estado e obrigatorio"); return; }
    setSalvando(true);
    try {
      const path  = coord ? `/coordenadores/${coord.id}` : `/coordenadores`;
      const meth  = coord ? "PUT" : "POST";
      const data  = await fetchJson(path, { method: meth, body: JSON.stringify(form) });
      toast.success(coord ? "Coordenador atualizado" : "Coordenador criado");
      onSalvar(data);
    } catch (e) {
      toast.error(e.message);
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-gray-100">
          <h2 className="text-base font-bold text-gray-900">
            {coord ? "Editar Coordenador" : "Novo Coordenador"}
          </h2>
          <button onClick={onFechar} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Nome *</label>
            <input
              type="text"
              value={form.nome}
              onChange={e => setForm(f => ({ ...f, nome: e.target.value }))}
              placeholder="Nome do coordenador"
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Estado *</label>
              <select
                value={form.estado_uf}
                onChange={e => setForm(f => ({ ...f, estado_uf: e.target.value }))}
                disabled={!!coord}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-400"
              >
                <option value="">UF</option>
                {UFS.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Cor no mapa</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={form.cor_hex}
                  onChange={e => setForm(f => ({ ...f, cor_hex: e.target.value }))}
                  className="w-10 h-10 rounded-lg border border-gray-200 cursor-pointer p-0.5"
                />
                <span className="text-xs text-gray-500 font-mono">{form.cor_hex}</span>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">E-mail</label>
            <input
              type="email"
              value={form.email}
              onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              placeholder="email@exemplo.com"
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Telefone</label>
            <input
              type="text"
              value={form.telefone}
              onChange={e => setForm(f => ({ ...f, telefone: e.target.value }))}
              placeholder="(11) 99999-9999"
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="flex gap-3 px-6 pb-6">
          <button
            onClick={onFechar}
            className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={salvar}
            disabled={salvando}
            className="flex-1 py-2.5 rounded-xl bg-blue-900 text-white text-sm font-semibold hover:bg-blue-800 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
          >
            {salvando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            {coord ? "Salvar" : "Criar"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Painel de Detalhe do Coordenador ─────────────────────────────────────────

function PainelDetalhe({ coordId, onFechar, onEditar, onExcluir, perfil }) {
  const [dados, setDados]           = useState(null);
  const [carregando, setCarregando] = useState(true);
  const podeGerenciar = ["PRESIDENTE", "DIRETORIA"].includes(perfil);

  useEffect(() => {
    if (!coordId) return;
    setCarregando(true);
    fetchJson(`/coordenadores/${coordId}`)
      .then(setDados)
      .catch(console.error)
      .finally(() => setCarregando(false));
  }, [coordId]);

  if (!coordId) return null;

  const c     = dados?.coordenador;
  const stats = dados?.stats;

  return (
    <div className="w-96 border-l border-gray-200 bg-white flex flex-col overflow-hidden shadow-xl">
      {/* Header */}
      <div className="px-5 pt-5 pb-4 border-b border-gray-100 bg-gradient-to-b from-blue-900 to-blue-800">
        <div className="flex items-start justify-between">
          <div className="min-w-0 flex-1 pr-3">
            <p className="text-[10px] font-bold text-blue-300 uppercase tracking-widest mb-1">
              Coordenador
            </p>
            {carregando ? (
              <div className="h-5 w-36 bg-white/20 rounded animate-pulse" />
            ) : (
              <>
                <div className="flex items-center gap-2">
                  <span
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: c?.cor_hex }}
                  />
                  <h2 className="text-base font-bold text-white truncate">{c?.nome}</h2>
                </div>
                <p className="text-xs text-blue-300 mt-0.5">{c?.estado_uf} · {stats?.total_municipios} municipios</p>
              </>
            )}
          </div>
          <button onClick={onFechar} className="p-1.5 rounded-lg hover:bg-white/10 text-white/50 hover:text-white transition-colors flex-shrink-0">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {carregando ? (
        <div className="flex-1 p-5 space-y-3">
          {[1,2,3,4].map(i => <div key={i} className="h-14 bg-gray-100 rounded-xl animate-pulse" />)}
        </div>
      ) : dados ? (
        <div className="flex-1 overflow-y-auto">
          {/* KPIs */}
          <div className="grid grid-cols-4 divide-x divide-gray-100 border-b border-gray-100">
            {[
              { label: "municipios", val: stats.total_municipios },
              { label: "eleitos",    val: stats.total_eleitos },
              { label: "votos",      val: fmt(stats.total_votos) },
              { label: "com eleito", val: stats.azuis + stats.verdes },
            ].map(k => (
              <div key={k.label} className="p-3 text-center">
                <div className="text-sm font-bold text-blue-900">{k.val}</div>
                <p className="text-[10px] text-gray-400 leading-tight">{k.label}</p>
              </div>
            ))}
          </div>

          {/* Farol summary */}
          {stats.total_municipios > 0 && (
            <div className="flex border-b border-gray-100 divide-x divide-gray-100">
              {[
                { label: "Azul",     val: stats.azuis,     bg: "bg-blue-100",   text: "text-blue-800" },
                { label: "Verde",    val: stats.verdes,    bg: "bg-green-100",  text: "text-green-800" },
                { label: "Amarelo",  val: stats.amarelos,  bg: "bg-yellow-100", text: "text-yellow-800" },
                { label: "Vermelho", val: stats.vermelhos, bg: "bg-red-100",    text: "text-red-800" },
              ].map(f => (
                <div key={f.label} className="flex-1 p-2 text-center">
                  <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full ${f.bg} ${f.text}`}>
                    {f.val}
                  </span>
                  <p className="text-[10px] text-gray-400 mt-0.5">{f.label}</p>
                </div>
              ))}
            </div>
          )}

          {/* Contato */}
          {(c.email || c.telefone) && (
            <div className="px-5 py-3 border-b border-gray-100 space-y-1">
              {c.email    && <p className="text-xs text-gray-500"><span className="font-semibold text-gray-700">Email:</span> {c.email}</p>}
              {c.telefone && <p className="text-xs text-gray-500"><span className="font-semibold text-gray-700">Telefone:</span> {c.telefone}</p>}
            </div>
          )}

          {/* Lista municipios */}
          <div className="px-4 py-3">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">
              Municipios do territorio
            </p>
            {dados.municipios.length === 0 ? (
              <p className="text-xs text-gray-400 py-4 text-center">Nenhum municipio atribuido</p>
            ) : (
              <div className="space-y-1.5">
                {dados.municipios.map(m => {
                  const COR_FAROL = {
                    AZUL: "bg-blue-500", VERDE: "bg-green-500",
                    AMARELO: "bg-yellow-400", VERMELHO: "bg-red-500", SEM_DADOS: "bg-gray-300",
                  }[m.farol] ?? "bg-gray-300";
                  return (
                    <div key={m.id} className="flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-gray-50">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${COR_FAROL}`} />
                        <span className="text-xs text-gray-700 truncate">{m.nome}</span>
                      </div>
                      <span className="text-[10px] text-gray-400 flex-shrink-0 ml-2">{fmt(m.votos)} votos</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center text-sm text-gray-400">
          Dados nao disponiveis
        </div>
      )}

      {/* Acoes */}
      {podeGerenciar && c && (
        <div className="px-4 py-3 border-t border-gray-100 flex gap-2">
          <button
            onClick={() => onEditar(c)}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl border border-gray-200 text-xs font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
          >
            <Pencil className="w-3.5 h-3.5" /> Editar
          </button>
          <button
            onClick={() => onExcluir(c)}
            className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl border border-red-200 text-xs font-semibold text-red-600 hover:bg-red-50 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}

// ── Card de Coordenador ───────────────────────────────────────────────────────

function CardCoordenador({ c, selecionado, onClick }) {
  const pct = c.total_municipios > 0
    ? Math.round((c.municipios_com_eleito / c.total_municipios) * 100)
    : 0;

  return (
    <button
      onClick={onClick}
      className={`w-full text-left rounded-2xl border transition-all duration-150 overflow-hidden ${
        selecionado
          ? "border-blue-500 shadow-lg shadow-blue-100 bg-blue-50"
          : "border-gray-100 bg-white hover:border-blue-200 hover:shadow-md"
      }`}
    >
      {/* Barra de cor no topo */}
      <div className="h-1.5 w-full" style={{ backgroundColor: c.cor_hex }} />

      <div className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="min-w-0 flex-1 pr-2">
            <div className="flex items-center gap-2 mb-0.5">
              <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: c.cor_hex }} />
              <h3 className={`text-sm font-bold truncate ${selecionado ? "text-blue-900" : "text-gray-900"}`}>
                {c.nome}
              </h3>
            </div>
            <p className="text-[10px] text-gray-400">{c.estado_uf}</p>
          </div>
          <ChevronRight className={`w-4 h-4 flex-shrink-0 mt-0.5 ${selecionado ? "text-blue-400" : "text-gray-300"}`} />
        </div>

        <div className="grid grid-cols-3 gap-2 mb-3">
          <div className="text-center">
            <p className="text-base font-bold text-gray-800">{c.total_municipios}</p>
            <p className="text-[10px] text-gray-400">municipios</p>
          </div>
          <div className="text-center">
            <p className="text-base font-bold text-gray-800">{c.municipios_com_eleito}</p>
            <p className="text-[10px] text-gray-400">c/ eleito</p>
          </div>
          <div className="text-center">
            <p className="text-base font-bold text-gray-800">{fmt(c.total_votos)}</p>
            <p className="text-[10px] text-gray-400">votos</p>
          </div>
        </div>

        {/* Barra de progresso */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] text-gray-400">Municipios com eleito</span>
            <span className="text-[10px] font-semibold text-gray-600">{pct}%</span>
          </div>
          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${pct}%`, backgroundColor: c.cor_hex }}
            />
          </div>
        </div>
      </div>
    </button>
  );
}

// ── Painel de Atribuicao de Municipios ────────────────────────────────────────

function PainelAtribuicao({ coordId, coordNome, coordUf, corHex, onFechar, onAtualizar }) {
  const [semCoord, setSemCoord] = useState([]);
  const [selecionados, setSel]  = useState(new Set());
  const [busca, setBusca]       = useState("");
  const [salvando, setSalvando] = useState(false);
  const toast = useToast();

  useEffect(() => {
    if (!coordId || !coordUf) return;
    fetchJson(`/coordenadores/sem-coordenador/${coordUf}`)
      .then(d => setSemCoord(d.municipios ?? []))
      .catch(console.error);
  }, [coordId, coordUf]);

  const filtrados = useMemo(() => {
    if (!busca.trim()) return semCoord;
    const q = busca.toLowerCase();
    return semCoord.filter(m => m.nome.toLowerCase().includes(q));
  }, [semCoord, busca]);

  function toggle(id) {
    setSel(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  async function atribuir() {
    if (selecionados.size === 0) { toast.error("Selecione ao menos um municipio"); return; }
    setSalvando(true);
    try {
      await fetchJson(`/coordenadores/${coordId}/municipios`, {
        method: "POST",
        body: JSON.stringify({ municipio_ids: [...selecionados] }),
      });
      toast.success(`${selecionados.size} municipio(s) atribuido(s)`);
      setSel(new Set());
      onAtualizar();
      onFechar();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 flex flex-col max-h-[80vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-gray-100">
          <div>
            <h2 className="text-base font-bold text-gray-900">Atribuir Municipios</h2>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: corHex }} />
              <p className="text-xs text-gray-500">{coordNome} · {coordUf}</p>
            </div>
          </div>
          <button onClick={onFechar} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Busca */}
        <div className="px-6 py-3 border-b border-gray-100">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={busca}
              onChange={e => setBusca(e.target.value)}
              placeholder="Buscar municipio..."
              className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          {selecionados.size > 0 && (
            <p className="text-xs text-blue-600 font-semibold mt-2">
              {selecionados.size} municipio(s) selecionado(s)
            </p>
          )}
        </div>

        {/* Lista */}
        <div className="flex-1 overflow-y-auto px-3 py-2">
          {filtrados.length === 0 ? (
            <div className="py-8 text-center text-sm text-gray-400">
              {semCoord.length === 0
                ? "Todos os municipios ja tem coordenador"
                : "Nenhum municipio encontrado"}
            </div>
          ) : (
            filtrados.map(m => {
              const sel = selecionados.has(m.id);
              return (
                <button
                  key={m.id}
                  onClick={() => toggle(m.id)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl mb-1 transition-all ${
                    sel
                      ? "bg-blue-50 border border-blue-200"
                      : "hover:bg-gray-50 border border-transparent"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <div className={`w-4 h-4 rounded-md border-2 flex items-center justify-center transition-all ${
                      sel ? "bg-blue-600 border-blue-600" : "border-gray-300"
                    }`}>
                      {sel && <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />}
                    </div>
                    <span className={`text-sm ${sel ? "font-semibold text-blue-900" : "text-gray-700"}`}>
                      {m.nome}
                    </span>
                  </div>
                  <div className="text-right">
                    {m.eleitos > 0 && (
                      <span className="text-[10px] bg-green-100 text-green-700 font-semibold px-1.5 py-0.5 rounded-full">
                        {m.eleitos} eleito{m.eleitos !== 1 ? "s" : ""}
                      </span>
                    )}
                    <p className="text-[10px] text-gray-400 mt-0.5">{fmt(m.votos)} votos</p>
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-6 py-4 border-t border-gray-100">
          <button
            onClick={onFechar}
            className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={atribuir}
            disabled={salvando || selecionados.size === 0}
            className="flex-1 py-2.5 rounded-xl bg-blue-900 text-white text-sm font-semibold hover:bg-blue-800 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
          >
            {salvando ? <Loader2 className="w-4 h-4 animate-spin" /> : <MapPin className="w-4 h-4" />}
            Atribuir {selecionados.size > 0 ? `(${selecionados.size})` : ""}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Componente principal exportavel ──────────────────────────────────────────

export function Coordenadores() {
  const [coordenadores, setCoordenadores] = useState([]);
  const [carregando, setCarregando]       = useState(true);
  const [uf, setUf]                       = useState("");
  const [busca, setBusca]                 = useState("");
  const [coordSelecionado, setCoordSel]   = useState(null);
  const [modalCriar, setModalCriar]       = useState(false);
  const [modalEditar, setModalEditar]     = useState(null);
  const [atribuir, setAtribuir]           = useState(null);
  const [perfil, setPerfil]               = useState(null);
  const toast = useToast();

  const podeGerenciar = ["PRESIDENTE", "DIRETORIA"].includes(perfil);

  useEffect(() => {
    const raw = localStorage.getItem("ub_usuario");
    if (raw) {
      try { setPerfil(JSON.parse(raw).perfil); } catch {}
    }
  }, []);

  const carregar = useCallback(async () => {
    setCarregando(true);
    try {
      const params = new URLSearchParams();
      if (uf) params.set("uf", uf);
      const data = await fetchJson(`/coordenadores?${params}`);
      setCoordenadores(data.coordenadores ?? []);
    } catch (e) {
      toast.error("Erro ao carregar coordenadores");
    } finally {
      setCarregando(false);
    }
  }, [uf]);

  useEffect(() => { carregar(); }, [carregar]);

  const lista = useMemo(() => {
    if (!busca.trim()) return coordenadores;
    const q = busca.toLowerCase();
    return coordenadores.filter(c =>
      c.nome.toLowerCase().includes(q) || c.estado_uf.toLowerCase().includes(q)
    );
  }, [coordenadores, busca]);

  // KPIs globais
  const kpis = useMemo(() => {
    const total      = lista.length;
    const totalMuns  = lista.reduce((a, c) => a + c.total_municipios, 0);
    const totalVotos = lista.reduce((a, c) => a + c.total_votos, 0);
    const comEleito  = lista.reduce((a, c) => a + c.municipios_com_eleito, 0);
    return { total, totalMuns, totalVotos, comEleito };
  }, [lista]);

  async function excluir(coord) {
    if (!confirm(`Desativar coordenador "${coord.nome}"?`)) return;
    try {
      await fetchJson(`/coordenadores/${coord.id}`, { method: "DELETE" });
      toast.success("Coordenador desativado");
      setCoordSel(null);
      carregar();
    } catch {
      toast.error("Erro ao desativar");
    }
  }

  return (
    <div className="flex h-full overflow-hidden">

      {/* Painel principal */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* Toolbar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-white flex-shrink-0">
          <div>
            <h1 className="text-lg font-bold text-gray-900">Coordenadores Territoriais</h1>
            <p className="text-xs text-gray-500">Gestao de territorios e performance por coordenador</p>
          </div>
          <div className="flex items-center gap-3">
            {/* Filtro UF */}
            <select
              value={uf}
              onChange={e => { setUf(e.target.value); setCoordSel(null); }}
              className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Todos os estados</option>
              {UFS.map(u => <option key={u} value={u}>{u}</option>)}
            </select>

            {/* Busca */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={busca}
                onChange={e => setBusca(e.target.value)}
                placeholder="Buscar coordenador..."
                className="pl-9 pr-3 py-2 border border-gray-200 rounded-xl text-sm w-52 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Botao novo */}
            {podeGerenciar && (
              <button
                onClick={() => setModalCriar(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-900 text-white text-sm font-semibold hover:bg-blue-800 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Novo coordenador
              </button>
            )}
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-4 gap-4 px-6 py-4 border-b border-gray-100 bg-gray-50 flex-shrink-0">
          {[
            { label: "Coordenadores",  val: kpis.total,            icon: Users,    color: "text-blue-700",   bg: "bg-blue-50" },
            { label: "Municipios",     val: kpis.totalMuns,        icon: MapPin,   color: "text-green-700",  bg: "bg-green-50" },
            { label: "Com eleito",     val: kpis.comEleito,        icon: Trophy,   color: "text-yellow-700", bg: "bg-yellow-50" },
            { label: "Total de votos", val: fmt(kpis.totalVotos),  icon: BarChart2, color: "text-purple-700", bg: "bg-purple-50" },
          ].map(k => (
            <div key={k.label} className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${k.bg}`}>
                <k.icon className={`w-5 h-5 ${k.color}`} />
              </div>
              <div>
                <p className="text-xl font-bold text-gray-900">{k.val}</p>
                <p className="text-xs text-gray-500">{k.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Lista */}
        <div className="flex-1 overflow-y-auto p-6">
          {carregando ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1,2,3,4,5,6].map(i => (
                <div key={i} className="h-40 bg-gray-100 rounded-2xl animate-pulse" />
              ))}
            </div>
          ) : lista.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-center">
              <AlertCircle className="w-12 h-12 text-gray-300 mb-3" />
              <p className="text-base font-semibold text-gray-500 mb-1">
                {coordenadores.length === 0
                  ? "Nenhum coordenador cadastrado"
                  : "Nenhum resultado para a busca"}
              </p>
              {podeGerenciar && coordenadores.length === 0 && (
                <button
                  onClick={() => setModalCriar(true)}
                  className="mt-4 flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-900 text-white text-sm font-semibold hover:bg-blue-800 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Criar primeiro coordenador
                </button>
              )}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {lista.map(c => (
                  <CardCoordenador
                    key={c.id}
                    c={c}
                    selecionado={coordSelecionado === c.id}
                    onClick={() => setCoordSel(coordSelecionado === c.id ? null : c.id)}
                  />
                ))}
              </div>

              {/* Acao: atribuir municipios ao coordenador selecionado */}
              {podeGerenciar && coordSelecionado && (() => {
                const c = lista.find(x => x.id === coordSelecionado);
                return c ? (
                  <div className="mt-6 flex items-center justify-between bg-blue-50 border border-blue-200 rounded-2xl px-5 py-3">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: c.cor_hex }} />
                      <span className="text-sm font-semibold text-blue-900">{c.nome}</span>
                      <span className="text-xs text-blue-600">- {c.total_municipios} municipios</span>
                    </div>
                    <button
                      onClick={() => setAtribuir({ id: c.id, nome: c.nome, uf: c.estado_uf, cor: c.cor_hex })}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-900 text-white text-xs font-semibold hover:bg-blue-800 transition-colors"
                    >
                      <MapPin className="w-3.5 h-3.5" />
                      Atribuir municipios
                    </button>
                  </div>
                ) : null;
              })()}
            </>
          )}
        </div>
      </div>

      {/* Painel lateral de detalhe */}
      {coordSelecionado && (
        <PainelDetalhe
          coordId={coordSelecionado}
          onFechar={() => setCoordSel(null)}
          onEditar={c => setModalEditar(c)}
          onExcluir={excluir}
          perfil={perfil}
        />
      )}

      {/* Modal criar */}
      {modalCriar && (
        <ModalCoordenador
          uf={uf}
          onSalvar={() => { setModalCriar(false); carregar(); }}
          onFechar={() => setModalCriar(false)}
        />
      )}

      {/* Modal editar */}
      {modalEditar && (
        <ModalCoordenador
          coord={modalEditar}
          uf={uf}
          onSalvar={() => { setModalEditar(null); carregar(); setCoordSel(null); }}
          onFechar={() => setModalEditar(null)}
        />
      )}

      {/* Modal atribuir municipios */}
      {atribuir && (
        <PainelAtribuicao
          coordId={atribuir.id}
          coordNome={atribuir.nome}
          coordUf={atribuir.uf}
          corHex={atribuir.cor}
          onFechar={() => setAtribuir(null)}
          onAtualizar={() => { carregar(); if (coordSelecionado) setCoordSel(coordSelecionado); }}
        />
      )}
    </div>
  );
}
