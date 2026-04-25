"use client";

/**
 * Modulo Liderancas - plataforma-v2
 *
 * Porta LiderancasContent do sistema legado para o design system
 * da plataforma Mazzel (Shell + tokens CSS plataforma-v2).
 */

import { useEffect, useState, useCallback } from "react";
import {
  Network, Search, Pencil, Trash2,
  Phone, Mail, MapPin, AlertCircle,
  Loader2, ChevronLeft, ChevronRight, Users, Award,
} from "lucide-react";
import { API, fetchJson } from "../api";
import { StatusBanner } from "../useApiFetch";
import { Icon } from "../Icon";

const INPUT_STYLE = {
  width: "100%",
  padding: "8px 12px",
  fontSize: 13,
  borderRadius: 8,
  border: "1px solid var(--rule-strong)",
  background: "var(--bg-card)",
  color: "var(--fg)",
  outline: "none",
  boxSizing: "border-box",
};

const UFS = [
  "AC","AL","AM","AP","BA","CE","DF","ES","GO",
  "MA","MG","MS","MT","PA","PB","PE","PI","PR",
  "RJ","RN","RO","RR","RS","SC","SE","SP","TO",
];

const SCORE_CONFIG = {
  OURO:    { label: "Ouro",    cls: "chip-amber" },
  PRATA:   { label: "Prata",   cls: "chip-blue"  },
  BRONZE:  { label: "Bronze",  cls: "chip-amber" },
  CRITICO: { label: "Critico", cls: "chip-red"   },
};

function BadgeScore({ cls }) {
  if (!cls) return <span style={{ color: "var(--fg-dim)", fontSize: 12 }}>-</span>;
  const cfg = SCORE_CONFIG[cls] ?? {};
  return <span className={cfg.cls ?? "chip-blue"} style={{ fontSize: 11 }}>{cfg.label}</span>;
}

function ScoreBar({ valor }) {
  if (valor == null) return null;
  const pct = Math.min(Math.max(valor, 0), 100);
  const color =
    pct >= 75 ? "var(--warn)"  :
    pct >= 50 ? "var(--blue)"  :
    pct >= 25 ? "var(--amber)" :
    "var(--red)";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
      <div style={{
        flex: 1, height: 4, borderRadius: 99,
        background: "var(--border)", overflow: "hidden",
      }}>
        <div style={{ width: `${pct}%`, height: "100%", background: color, borderRadius: 99 }} />
      </div>
      <span style={{ fontSize: 11, color: "var(--fg-dim)", width: 28, textAlign: "right" }}>{pct.toFixed(0)}</span>
    </div>
  );
}

// ── Modal Criar/Editar ────────────────────────────────────────────────────────

function ModalLideranca({ lideranca, onSalvar, onFechar }) {
  const [form, setForm] = useState({
    nome_completo: lideranca?.nome_completo ?? "",
    nome_politico: lideranca?.nome_politico ?? "",
    telefone:      lideranca?.telefone      ?? "",
    whatsapp:      lideranca?.whatsapp      ?? "",
    email:         lideranca?.email         ?? "",
    municipio_id:  lideranca?.municipio_id  ?? "",
    bairro:        lideranca?.bairro        ?? "",
    equipe:        lideranca?.equipe        ?? "",
    observacoes:   lideranca?.observacoes   ?? "",
    status:        lideranca?.status        ?? "ATIVO",
  });
  const [municipios, setMunicipios] = useState([]);
  const [ufFiltro, setUfFiltro] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");

  useEffect(() => {
    if (!ufFiltro) { setMunicipios([]); return; }
    API.liderancaMunicipios(ufFiltro)
      .then(d => setMunicipios(Array.isArray(d) ? d : []))
      .catch(() => setMunicipios([]));
  }, [ufFiltro]);

  function set(k, v) { setForm(p => ({ ...p, [k]: v })); }

  async function salvar() {
    setErro("");
    if (!form.nome_completo.trim()) { setErro("Nome e obrigatorio"); return; }
    if (!form.municipio_id)         { setErro("Municipio e obrigatorio"); return; }
    setSalvando(true);
    try {
      const payload = { ...form, municipio_id: Number(form.municipio_id), escola_ids: [] };
      const data = lideranca
        ? await API.liderancaAtualizar(lideranca.id, payload)
        : await API.liderancaCriar(payload);
      onSalvar(data);
    } catch (e) {
      setErro(e.message ?? "Erro ao salvar");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 999,
      display: "flex", alignItems: "center", justifyContent: "center",
      background: "rgba(0,0,0,0.55)", backdropFilter: "blur(4px)",
    }}>
      <div className="t-bg-card ring-soft rounded-xl" style={{
        width: "100%", maxWidth: 520, margin: "0 16px",
        maxHeight: "90vh", overflowY: "auto", padding: 0,
      }}>
        {/* header */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "20px 24px 16px", borderBottom: "1px solid var(--border)",
        }}>
          <span className="t-fg-strong" style={{ fontWeight: 700, fontSize: 16 }}>
            {lideranca ? "Editar Lideranca" : "Nova Lideranca"}
          </span>
          <button className="btn-ghost" onClick={onFechar} style={{ padding: "4px 8px" }}>
            <Icon name="X" size={16} />
          </button>
        </div>

        {/* body */}
        <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 14 }}>
          {erro && (
            <div style={{
              background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.3)",
              borderRadius: 8, padding: "8px 12px", fontSize: 13, color: "var(--red)",
            }}>{erro}</div>
          )}

          <div>
            <label className="text-[11px] t-fg-dim font-semibold uppercase tracking-wider block mb-1">Nome completo *</label>
            <input style={INPUT_STYLE} value={form.nome_completo} onChange={e => set("nome_completo", e.target.value)} />
          </div>

          <div>
            <label className="text-[11px] t-fg-dim font-semibold uppercase tracking-wider block mb-1">Nome politico</label>
            <input style={INPUT_STYLE} value={form.nome_politico} onChange={e => set("nome_politico", e.target.value)} />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label className="text-[11px] t-fg-dim font-semibold uppercase tracking-wider block mb-1">Estado</label>
              <select style={INPUT_STYLE} value={ufFiltro} onChange={e => { setUfFiltro(e.target.value); set("municipio_id", ""); }}>
                <option value="">Selecione</option>
                {UFS.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[11px] t-fg-dim font-semibold uppercase tracking-wider block mb-1">Municipio *</label>
              <select style={INPUT_STYLE} value={form.municipio_id} onChange={e => set("municipio_id", e.target.value)}>
                <option value="">{ufFiltro ? "Selecione" : "Escolha o estado"}</option>
                {municipios.map(m => <option key={m.id} value={m.id}>{m.nome}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="text-[11px] t-fg-dim font-semibold uppercase tracking-wider block mb-1">Bairro</label>
            <input style={INPUT_STYLE} value={form.bairro} onChange={e => set("bairro", e.target.value)} />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label className="text-[11px] t-fg-dim font-semibold uppercase tracking-wider block mb-1">Telefone</label>
              <input style={INPUT_STYLE} value={form.telefone} onChange={e => set("telefone", e.target.value)} />
            </div>
            <div>
              <label className="text-[11px] t-fg-dim font-semibold uppercase tracking-wider block mb-1">WhatsApp</label>
              <input style={INPUT_STYLE} value={form.whatsapp} onChange={e => set("whatsapp", e.target.value)} />
            </div>
          </div>

          <div>
            <label className="text-[11px] t-fg-dim font-semibold uppercase tracking-wider block mb-1">E-mail</label>
            <input type="email" style={INPUT_STYLE} value={form.email} onChange={e => set("email", e.target.value)} />
          </div>

          <div>
            <label className="text-[11px] t-fg-dim font-semibold uppercase tracking-wider block mb-1">Equipe / grupo</label>
            <input style={INPUT_STYLE} value={form.equipe} onChange={e => set("equipe", e.target.value)} />
          </div>

          <div>
            <label className="text-[11px] t-fg-dim font-semibold uppercase tracking-wider block mb-1">Status</label>
            <select style={INPUT_STYLE} value={form.status} onChange={e => set("status", e.target.value)}>
              <option value="ATIVO">Ativo</option>
              <option value="INATIVO">Inativo</option>
            </select>
          </div>

          <div>
            <label className="text-[11px] t-fg-dim font-semibold uppercase tracking-wider block mb-1">Observacoes</label>
            <textarea rows={3} style={{ ...INPUT_STYLE, resize: "none" }}
              value={form.observacoes} onChange={e => set("observacoes", e.target.value)} />
          </div>
        </div>

        {/* footer */}
        <div style={{
          display: "flex", gap: 10, padding: "0 24px 20px",
        }}>
          <button className="btn-ghost" onClick={onFechar} style={{ flex: 1, justifyContent: "center" }}>
            Cancelar
          </button>
          <button className="btn-primary" onClick={salvar} disabled={salvando} style={{ flex: 1, justifyContent: "center" }}>
            {salvando ? <Loader2 size={14} className="animate-spin" /> : <Icon name="Check" size={14} />}
            {salvando ? "Salvando..." : "Salvar"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Card Lideranca ────────────────────────────────────────────────────────────

function CardLideranca({ l, onEditar, onDeletar, podeEditar, podeAdmin }) {
  return (
    <div className="t-bg-card ring-soft rounded-xl" style={{ padding: 16 }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8, marginBottom: 6 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p className="t-fg-strong" style={{ fontWeight: 700, fontSize: 14, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {l.nome_completo}
          </p>
          {l.nome_politico && (
            <p style={{ fontSize: 12, color: "var(--accent)", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {l.nome_politico}
            </p>
          )}
        </div>
        <BadgeScore cls={l.score_classificacao} />
      </div>

      <ScoreBar valor={l.score_valor} />

      <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 5 }}>
        {l.municipio_nome && (
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <MapPin size={12} style={{ color: "var(--accent)", flexShrink: 0 }} />
            <span className="t-fg-muted" style={{ fontSize: 12, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {l.municipio_nome}{l.bairro ? ` - ${l.bairro}` : ""}
            </span>
          </div>
        )}
        {l.equipe && (
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <Users size={12} style={{ color: "var(--accent)", flexShrink: 0 }} />
            <span className="t-fg-muted" style={{ fontSize: 12, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {l.equipe}
            </span>
          </div>
        )}
        {(l.telefone || l.whatsapp) && (
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <Phone size={12} style={{ color: "var(--green)", flexShrink: 0 }} />
            <span className="t-fg-muted" style={{ fontSize: 12 }}>{l.whatsapp ?? l.telefone}</span>
          </div>
        )}
        {l.email && (
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <Mail size={12} style={{ color: "var(--blue)", flexShrink: 0 }} />
            <span className="t-fg-muted" style={{ fontSize: 12, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {l.email}
            </span>
          </div>
        )}
      </div>

      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        marginTop: 12, paddingTop: 10, borderTop: "1px solid var(--border)",
      }}>
        <span className={l.status === "ATIVO" ? "chip-green" : "chip-blue"} style={{ fontSize: 11 }}>
          {l.status === "ATIVO" ? "Ativo" : "Inativo"}
        </span>
        {podeEditar && (
          <div style={{ display: "flex", gap: 4 }}>
            <button className="btn-ghost" onClick={() => onEditar(l)} style={{ padding: "4px 8px" }}>
              <Pencil size={13} />
            </button>
            {podeAdmin && (
              <button className="btn-ghost" onClick={() => onDeletar(l)}
                style={{ padding: "4px 8px", color: "var(--red)" }}>
                <Trash2 size={13} />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Pagina principal ──────────────────────────────────────────────────────────

const PER_PAGE = 24;

export function Liderancas() {
  const [liderancas, setLiderancas] = useState([]);
  const [total, setTotal]           = useState(0);
  const [page, setPage]             = useState(1);
  const [loading, setLoading]       = useState(true);
  const [apiStatus, setApiStatus]   = useState("loading");
  const [apiError, setApiError]     = useState("");
  const [modal, setModal]           = useState(null); // null | "criar" | {lideranca}
  const [confirmar, setConfirmar]   = useState(null);
  const [perfil, setPerfil]         = useState(null);
  const [deleting, setDeleting]     = useState(false);
  const [deleteErro, setDeleteErro] = useState("");

  // Filtros
  const [q, setQ]                   = useState("");
  const [ufFiltro, setUfFiltro]     = useState("");
  const [statusFiltro, setStatus]   = useState("");
  const [classFiltro, setClass_]    = useState("");

  useEffect(() => {
    fetchJson("/auth/me")
      .then(d => setPerfil(d?.perfil ?? null))
      .catch(() => {});
  }, []);

  const carregar = useCallback(async () => {
    setLoading(true);
    setApiStatus("loading");
    try {
      const params = { page, per_page: PER_PAGE };
      if (q)            params.q             = q;
      if (ufFiltro)     params.estado_uf     = ufFiltro;
      if (statusFiltro) params.status        = statusFiltro;
      if (classFiltro)  params.classificacao = classFiltro;

      const d = await API.liderancas(params);
      setLiderancas(d.items ?? []);
      setTotal(d.total ?? 0);
      setApiStatus("ok");
    } catch (e) {
      setApiStatus(e?.status === 401 || e?.status === 403 ? "unauth" : "error");
      setApiError(e?.message ?? "Falha ao carregar dados.");
      setLiderancas([]);
    } finally {
      setLoading(false);
    }
  }, [page, q, ufFiltro, statusFiltro, classFiltro]);

  useEffect(() => { carregar(); }, [carregar]);

  function aoSalvar() { setModal(null); carregar(); }

  async function deletar(l) {
    setDeleting(true);
    setDeleteErro("");
    try {
      await API.liderancaDeletar(l.id);
      setConfirmar(null);
      carregar();
    } catch (e) {
      setDeleteErro(e?.message ?? "Erro ao deletar");
    } finally {
      setDeleting(false);
    }
  }

  const podeEditar = ["PRESIDENTE", "DIRETORIA", "FUNCIONARIO"].includes(perfil);
  const podeAdmin  = perfil === "PRESIDENTE";
  const totalPags  = Math.ceil(total / PER_PAGE);

  const qtdAtivos  = liderancas.filter(l => l.status === "ATIVO").length;
  const qtdOuro    = liderancas.filter(l => l.score_classificacao === "OURO").length;
  const qtdCritico = liderancas.filter(l => l.score_classificacao === "CRITICO").length;

  return (
    <div className="bg-page-grad min-h-full">
      <div className="max-w-[1600px] mx-auto px-8 py-7">
        <StatusBanner status={apiStatus} errorMsg={apiError} />

        {/* Header */}
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 20 }}>
          <div>
            <div className="text-[11px] t-fg-dim tracking-[0.18em] uppercase font-semibold">Estrutura</div>
            <h1 className="text-[32px] font-display font-bold t-fg-strong mt-1 leading-none">
              Liderancas
            </h1>
            <div className="text-[13px] t-fg-muted mt-1.5">
              Inteligencia territorial &middot; {total} lideranca{total !== 1 ? "s" : ""} cadastrada{total !== 1 ? "s" : ""}
            </div>
          </div>
          {podeEditar && (
            <button className="btn-primary" onClick={() => setModal("criar")}>
              <Icon name="Plus" size={13} />
              Nova Lideranca
            </button>
          )}
        </div>

        {/* KPI strip */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 20 }}>
          <div className="t-bg-card ring-soft rounded-xl" style={{ padding: 16, display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{
              width: 40, height: 40, borderRadius: 10,
              background: "rgba(16,185,129,0.1)", display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <Users size={18} style={{ color: "var(--green)" }} />
            </div>
            <div>
              <p className="t-fg-strong" style={{ fontWeight: 700, fontSize: 22 }}>{qtdAtivos}</p>
              <p className="t-fg-muted" style={{ fontSize: 12 }}>Ativos</p>
            </div>
          </div>
          <div className="t-bg-card ring-soft rounded-xl" style={{ padding: 16, display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{
              width: 40, height: 40, borderRadius: 10,
              background: "rgba(245,158,11,0.1)", display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <Award size={18} style={{ color: "var(--amber)" }} />
            </div>
            <div>
              <p className="t-fg-strong" style={{ fontWeight: 700, fontSize: 22 }}>{qtdOuro}</p>
              <p className="t-fg-muted" style={{ fontSize: 12 }}>Score Ouro</p>
            </div>
          </div>
          <div className="t-bg-card ring-soft rounded-xl" style={{ padding: 16, display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{
              width: 40, height: 40, borderRadius: 10,
              background: "rgba(239,68,68,0.1)", display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <AlertCircle size={18} style={{ color: "var(--red)" }} />
            </div>
            <div>
              <p className="t-fg-strong" style={{ fontWeight: 700, fontSize: 22 }}>{qtdCritico}</p>
              <p className="t-fg-muted" style={{ fontSize: 12 }}>Criticos</p>
            </div>
          </div>
        </div>

        {/* Filtros */}
        <div className="t-bg-card ring-soft rounded-xl" style={{ padding: 14, marginBottom: 20, display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center" }}>
          <div style={{ position: "relative", flex: 1, minWidth: 200 }}>
            <Search size={14} style={{
              position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)",
              color: "var(--fg-dim)",
            }} />
            <input
              style={{ ...INPUT_STYLE, paddingLeft: 32 }}
              placeholder="Buscar por nome..."
              value={q}
              onChange={e => { setQ(e.target.value); setPage(1); }}
            />
          </div>

          <select style={{ ...INPUT_STYLE, width: "auto" }}
            value={ufFiltro} onChange={e => { setUfFiltro(e.target.value); setPage(1); }}>
            <option value="">Todos os estados</option>
            {UFS.map(u => <option key={u} value={u}>{u}</option>)}
          </select>

          <select style={{ ...INPUT_STYLE, width: "auto" }}
            value={statusFiltro} onChange={e => { setStatus(e.target.value); setPage(1); }}>
            <option value="">Qualquer status</option>
            <option value="ATIVO">Ativo</option>
            <option value="INATIVO">Inativo</option>
          </select>

          <select style={{ ...INPUT_STYLE, width: "auto" }}
            value={classFiltro} onChange={e => { setClass_(e.target.value); setPage(1); }}>
            <option value="">Todas as classificacoes</option>
            <option value="OURO">Ouro</option>
            <option value="PRATA">Prata</option>
            <option value="BRONZE">Bronze</option>
            <option value="CRITICO">Critico</option>
          </select>

          {(q || ufFiltro || statusFiltro || classFiltro) && (
            <button className="btn-ghost"
              onClick={() => { setQ(""); setUfFiltro(""); setStatus(""); setClass_(""); setPage(1); }}>
              <Icon name="X" size={13} /> Limpar
            </button>
          )}
        </div>

        {/* Grid */}
        {loading ? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "80px 0" }}>
            <Loader2 size={32} className="animate-spin" style={{ color: "var(--accent)" }} />
          </div>
        ) : liderancas.length === 0 ? (
          <div style={{
            display: "flex", flexDirection: "column", alignItems: "center",
            justifyContent: "center", padding: "80px 0",
          }}>
            <Network size={48} style={{ color: "var(--fg-dim)", opacity: 0.3, marginBottom: 16 }} />
            <p className="t-fg-strong" style={{ fontWeight: 600, fontSize: 16 }}>Nenhuma lideranca encontrada</p>
            <p className="t-fg-muted" style={{ fontSize: 13, marginTop: 4 }}>
              Ajuste os filtros ou cadastre uma nova lideranca
            </p>
          </div>
        ) : (
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
            gap: 14,
          }}>
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

        {/* Paginacao */}
        {totalPags > 1 && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 28 }}>
            <button className="btn-ghost" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
              style={{ padding: "6px 10px" }}>
              <ChevronLeft size={16} />
            </button>
            <span className="t-fg-muted" style={{ fontSize: 13, padding: "0 12px" }}>
              Pagina {page} de {totalPags}
            </span>
            <button className="btn-ghost" onClick={() => setPage(p => Math.min(totalPags, p + 1))} disabled={page === totalPags}
              style={{ padding: "6px 10px" }}>
              <ChevronRight size={16} />
            </button>
          </div>
        )}
      </div>

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
        <div style={{
          position: "fixed", inset: 0, zIndex: 999,
          display: "flex", alignItems: "center", justifyContent: "center",
          background: "rgba(0,0,0,0.55)", backdropFilter: "blur(4px)",
        }}>
          <div className="t-bg-card ring-soft rounded-xl" style={{ width: "100%", maxWidth: 380, margin: "0 16px", padding: 28, textAlign: "center" }}>
            <div style={{
              width: 48, height: 48, borderRadius: "50%",
              background: "rgba(239,68,68,0.1)", display: "flex",
              alignItems: "center", justifyContent: "center", margin: "0 auto 16px",
            }}>
              <Trash2 size={22} style={{ color: "var(--red)" }} />
            </div>
            <p className="t-fg-strong" style={{ fontWeight: 700, fontSize: 16, marginBottom: 8 }}>Confirmar exclusao</p>
            <p className="t-fg-muted" style={{ fontSize: 13, marginBottom: 20 }}>
              Remover <strong>{confirmar.nome_completo}</strong>? Esta acao nao pode ser desfeita.
            </p>
            {deleteErro && (
              <p style={{ fontSize: 12, color: "var(--red)", marginBottom: 12 }}>{deleteErro}</p>
            )}
            <div style={{ display: "flex", gap: 10 }}>
              <button className="btn-ghost" onClick={() => { setConfirmar(null); setDeleteErro(""); }}
                style={{ flex: 1, justifyContent: "center" }}>
                Cancelar
              </button>
              <button onClick={() => deletar(confirmar)} disabled={deleting}
                className="btn-primary"
                style={{ flex: 1, justifyContent: "center", background: "var(--red)" }}>
                {deleting ? <Loader2 size={14} className="animate-spin" /> : null}
                Remover
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
