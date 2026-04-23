"use client";

import { useState } from "react";
import { MazzelLayout } from "@/components/layout-mazzel/MazzelLayout";
import { AlertTriangle, Search, Plus, Download, Check, X, Users, Info } from "lucide-react";
import {
  ADMIN_USUARIOS, ADMIN_PAPEIS, ADMIN_AUDIT, TENANTS,
} from "@/components/mazzel-data/mock";
import { useAdminUsuarios, useAdminAudit, useAdminPapeis } from "@/hooks/useAdmin";

function MockBadge() {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9.5px] font-semibold"
      style={{ background: "rgba(99,102,241,0.1)", color: "#6366f1", border: "1px solid rgba(99,102,241,0.2)" }}>
      <Info size={8} />dados de demonstracao
    </span>
  );
}

// Adapta usuario da API para formato visual
function adaptarUsuario(u) {
  return {
    nome: u.nome,
    email: u.email,
    papel: u.perfil,
    uf: u.estado_uf ?? "-",
    status: u.ativo ? "ativo" : "suspenso",
    mfa: u.tem_2fa,
    last: u.ultimo_acesso
      ? new Date(u.ultimo_acesso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })
      : "nunca",
  };
}

// Adapta log de auditoria da API para formato visual
function adaptarLog(log) {
  return {
    quando: log.criado_em
      ? new Date(log.criado_em).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
      : "-",
    quem: `Usuario #${log.usuario_id ?? "?"}`,
    acao: log.acao ?? "-",
    obj: log.tabela ?? "-",
    ip: log.ip ?? "-",
  };
}

function AdminContent() {
  const [tab, setTab] = useState("tenant");
  const t = TENANTS["uniao"];

  // Hooks de API
  const { usuarios: usuariosApi, isMock: isMockUsuarios, isLoading: loadingUsuarios } = useAdminUsuarios();
  const { logs: logsApi, isMock: isMockAudit, isLoading: loadingAudit } = useAdminAudit({ limit: 50 });
  const { papeis: papeisApi, isMock: isMockPapeis } = useAdminPapeis();

  // Fallback mock
  const usarMockUsuarios = isMockUsuarios || usuariosApi.length === 0;
  const usarMockAudit = isMockAudit || logsApi.length === 0;
  const usarMockPapeis = true; // sem endpoint no backend

  const usuarios = usarMockUsuarios ? ADMIN_USUARIOS : usuariosApi.map(adaptarUsuario);
  const auditLogs = usarMockAudit ? ADMIN_AUDIT : logsApi.map(adaptarLog);
  const papeis = ADMIN_PAPEIS; // sempre mock

  return (
    <div className="min-h-full" style={{ background: "var(--mz-bg-page)" }}>
      <div className="max-w-[1600px] mx-auto px-8 py-7">
        <div className="flex items-end justify-between mb-5">
          <div>
            <div className="text-[11px] mz-t-fg-dim tracking-[0.18em] uppercase font-semibold">Admin · Apenas Presidente</div>
            <h1 className="text-[32px] font-bold mz-t-fg-strong mt-1 leading-none">Configuracoes da plataforma</h1>
            <div className="text-[13px] mz-t-fg-muted mt-1.5">Tenant · usuarios · papeis · auditoria · integracoes.</div>
          </div>
          <span className="mz-chip mz-chip-red flex items-center gap-1 w-fit">
            <AlertTriangle size={10}/>Acoes aqui afetam todos os usuarios
          </span>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 mb-5 p-1 rounded-lg inline-flex" style={{ background: "var(--mz-rule)" }}>
          {[
            {k:"tenant",   l:"White-label"},
            {k:"usuarios", l:"Usuarios"},
            {k:"papeis",   l:"Papeis & permissoes"},
            {k:"audit",    l:"Auditoria"},
            {k:"integ",    l:"Integracoes"},
          ].map(x => (
            <button key={x.k} onClick={() => setTab(x.k)}
              className={`mz-btn-ghost ${tab === x.k ? "active" : ""}`} style={{ padding: "7px 14px", fontSize: 12 }}>
              {x.l}
            </button>
          ))}
        </div>

        {/* White-label */}
        {tab === "tenant" && (
          <div className="grid grid-cols-[1fr_380px] gap-3">
            <div className="mz-ring-soft rounded-xl p-6" style={{ background: "var(--mz-bg-card)" }}>
              <div className="text-[11px] mz-t-fg-dim uppercase tracking-[0.14em] font-semibold mb-3">Identidade visual</div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10.5px] mz-t-fg-dim uppercase tracking-wider font-semibold">Nome do cliente</label>
                  <input defaultValue={t.nome} className="w-full mt-1.5 px-3 py-2 rounded-md text-[13px] mz-t-fg bg-transparent"
                    style={{ border: "1px solid var(--mz-rule-strong, var(--mz-rule))" }}/>
                </div>
                <div>
                  <label className="text-[10.5px] mz-t-fg-dim uppercase tracking-wider font-semibold">Sigla (2-3 letras)</label>
                  <input defaultValue={t.sigla} className="w-full mt-1.5 px-3 py-2 rounded-md text-[13px] mz-t-fg bg-transparent"
                    style={{ border: "1px solid var(--mz-rule-strong, var(--mz-rule))" }}/>
                </div>
                <div>
                  <label className="text-[10.5px] mz-t-fg-dim uppercase tracking-wider font-semibold">Cor primaria</label>
                  <div className="flex items-center gap-2 mt-1.5">
                    <div className="w-9 h-9 rounded-md shrink-0 mz-ring-soft" style={{ background: t.primary }}/>
                    <input defaultValue={t.primary} className="flex-1 px-3 py-2 rounded-md text-[13px] mz-tnum mz-t-fg bg-transparent"
                      style={{ border: "1px solid var(--mz-rule-strong, var(--mz-rule))" }}/>
                  </div>
                </div>
                <div>
                  <label className="text-[10.5px] mz-t-fg-dim uppercase tracking-wider font-semibold">Cor de destaque</label>
                  <div className="flex items-center gap-2 mt-1.5">
                    <div className="w-9 h-9 rounded-md shrink-0 mz-ring-soft" style={{ background: t.accent }}/>
                    <input defaultValue={t.accent} className="flex-1 px-3 py-2 rounded-md text-[13px] mz-tnum mz-t-fg bg-transparent"
                      style={{ border: "1px solid var(--mz-rule-strong, var(--mz-rule))" }}/>
                  </div>
                </div>
                <div className="col-span-2">
                  <label className="text-[10.5px] mz-t-fg-dim uppercase tracking-wider font-semibold">Dominio customizado</label>
                  <input defaultValue="plataforma.unionbrasil.org.br" className="w-full mt-1.5 px-3 py-2 rounded-md text-[13px] mz-tnum mz-t-fg bg-transparent"
                    style={{ border: "1px solid var(--mz-rule-strong, var(--mz-rule))" }}/>
                </div>
              </div>
              <div className="flex items-center gap-2 mt-5 pt-5 border-t" style={{ borderColor: "var(--mz-rule)" }}>
                <button className="mz-btn-primary">Salvar alteracoes</button>
                <button className="mz-btn-ghost">Descartar</button>
                <div className="flex-1"/>
                <div className="text-[11px] mz-t-fg-dim">Ultima edicao: 23 nov · Paulo Guedes</div>
              </div>
            </div>

            <div className="mz-ring-soft rounded-xl overflow-hidden" style={{ background: "var(--mz-bg-card)" }}>
              <div className="px-5 py-3.5 border-b" style={{ borderColor: "var(--mz-rule)" }}>
                <div className="text-[10.5px] mz-t-fg-dim uppercase tracking-[0.14em] font-semibold">Pre-visualizacao</div>
                <div className="text-[15px] font-bold mz-t-fg-strong">Como os usuarios vao ver</div>
              </div>
              <div className="p-4">
                <div className="rounded-lg overflow-hidden mz-ring-soft">
                  <div className="flex items-center gap-2.5 px-4 py-3" style={{ background: `linear-gradient(180deg, ${t.primary}26, transparent)` }}>
                    <div className="w-8 h-8 rounded-md flex items-center justify-center text-white font-bold text-[11px] flex-shrink-0"
                      style={{ background: t.primary }}>{t.logoText}</div>
                    <div className="min-w-0 flex-1">
                      <div className="text-[12px] font-bold mz-t-fg-strong truncate leading-tight">{t.nome}</div>
                      <div className="text-[10px] mz-t-fg-dim uppercase tracking-wider leading-tight mt-0.5">{t.plano}</div>
                    </div>
                  </div>
                  <div className="px-4 py-3 border-t" style={{ borderColor: "var(--mz-rule)" }}>
                    <div className="text-[10px] mz-t-fg-dim uppercase tracking-wider">Dashboard</div>
                    <div className="text-[13px] font-bold mz-t-fg-strong">Bom dia, equipe.</div>
                    <button className="mz-btn-primary mt-3" style={{ padding: "6px 10px", fontSize: 11 }}>Botao primario</button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Usuarios */}
        {tab === "usuarios" && (
          <div className="mz-ring-soft rounded-xl overflow-hidden" style={{ background: "var(--mz-bg-card)" }}>
            <div className="px-5 py-3.5 border-b flex items-center gap-3" style={{ borderColor: "var(--mz-rule)" }}>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <div className="text-[10.5px] mz-t-fg-dim uppercase tracking-[0.14em] font-semibold">Gestao de usuarios</div>
                  {usarMockUsuarios && <MockBadge />}
                </div>
                <div className="text-[15px] font-bold mz-t-fg-strong">
                  {loadingUsuarios ? "Carregando..." : `${usuarios.length} usuarios`}
                </div>
              </div>
              <div className="flex items-center gap-2 h-8 px-3 rounded-md" style={{ background: "var(--mz-rule)" }}>
                <Search size={12} className="mz-t-fg-dim"/>
                <input placeholder="Buscar..." className="bg-transparent outline-none text-[12px] w-52 mz-t-fg"/>
              </div>
              <button className="mz-btn-primary flex items-center gap-1" style={{ padding: "6px 12px", fontSize: 11 }}>
                <Plus size={11}/>Novo usuario
              </button>
            </div>
            <div>
              <div className="grid grid-cols-[2fr_2fr_1fr_70px_90px_60px_90px_80px] gap-3 px-5 py-2.5 text-[10px] mz-t-fg-dim uppercase tracking-wider font-semibold border-b"
                style={{ borderColor: "var(--mz-rule)", background: "var(--mz-bg-card-2)" }}>
                <div>Nome</div><div>E-mail</div><div>Papel</div><div>UF</div><div>Status</div><div>MFA</div><div>Ultimo acesso</div><div></div>
              </div>
              {usuarios.map((u, i) => (
                <div key={i} className="grid grid-cols-[2fr_2fr_1fr_70px_90px_60px_90px_80px] gap-3 px-5 py-2.5 items-center text-[12px] border-b last:border-0"
                  style={{ borderColor: "var(--mz-rule)" }}>
                  <div className="font-semibold mz-t-fg-strong">{u.nome}</div>
                  <div className="mz-t-fg-muted truncate">{u.email}</div>
                  <div className="mz-t-fg">{u.papel}</div>
                  <div className="mz-tnum mz-t-fg">{u.uf}</div>
                  <div>
                    <span className={`mz-chip w-fit ${
                      u.status === "ativo" ? "mz-chip-green"
                      : u.status === "pendente" ? "mz-chip-amber"
                      : "mz-chip-red"
                    }`} style={{ height: 20 }}>{u.status}</span>
                  </div>
                  <div>
                    {u.mfa
                      ? <Check size={13} style={{ color: "var(--mz-ok, #34d399)" }}/>
                      : <X size={13} style={{ color: "var(--mz-danger, #f87171)" }}/>
                    }
                  </div>
                  <div className="mz-t-fg-dim text-[11px] mz-tnum">{u.last}</div>
                  <div className="text-right">
                    <button className="mz-btn-ghost" style={{ padding: "3px 9px", fontSize: 10 }}>Editar</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Papeis (sempre mock - sem endpoint) */}
        {tab === "papeis" && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 mb-2">
              <MockBadge />
              <span className="text-[11px] mz-t-fg-dim">Papeis e permissoes sao configurados no backend.</span>
            </div>
            {papeis.map((p, i) => (
              <div key={i} className="mz-ring-soft rounded-xl p-5" style={{ background: "var(--mz-bg-card)" }}>
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-lg flex items-center justify-center shrink-0"
                    style={{ background: "rgba(var(--mz-tenant-primary-rgb), 0.12)" }}>
                    <Users size={20} style={{ color: "var(--mz-tenant-primary)" }}/>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-baseline gap-3 mb-1">
                      <div className="text-[15px] font-bold mz-t-fg-strong">{p.papel}</div>
                      <span className="mz-chip mz-chip-muted w-fit" style={{ height: 20 }}>{p.qtd} {p.qtd === 1 ? "usuario" : "usuarios"}</span>
                    </div>
                    <div className="text-[12px] mz-t-fg-muted mb-3">{p.desc}</div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {p.perm.map(pm => (
                        <span key={pm} className="mz-chip mz-chip-blue w-fit" style={{ height: 22 }}>{pm}</span>
                      ))}
                    </div>
                  </div>
                  <button className="mz-btn-ghost" style={{ padding: "5px 10px" }}>Editar permissoes</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Auditoria */}
        {tab === "audit" && (
          <div className="mz-ring-soft rounded-xl overflow-hidden" style={{ background: "var(--mz-bg-card)" }}>
            <div className="px-5 py-3.5 border-b flex items-center justify-between" style={{ borderColor: "var(--mz-rule)" }}>
              <div>
                <div className="flex items-center gap-2">
                  <div className="text-[10.5px] mz-t-fg-dim uppercase tracking-[0.14em] font-semibold">Auditoria · LGPD-compliant</div>
                  {usarMockAudit && <MockBadge />}
                </div>
                <div className="text-[15px] font-bold mz-t-fg-strong">
                  {loadingAudit ? "Carregando..." : "Log de acoes · retencao 90 dias"}
                </div>
              </div>
              <button className="mz-btn-ghost flex items-center gap-1">
                <Download size={12}/>Exportar
              </button>
            </div>
            <div>
              <div className="grid grid-cols-[80px_2fr_1.5fr_2fr_120px] gap-3 px-5 py-2.5 text-[10px] mz-t-fg-dim uppercase tracking-wider font-semibold border-b"
                style={{ borderColor: "var(--mz-rule)", background: "var(--mz-bg-card-2)" }}>
                <div>Quando</div><div>Quem</div><div>Acao</div><div>Objeto</div><div>IP</div>
              </div>
              {auditLogs.map((a, i) => (
                <div key={i} className="grid grid-cols-[80px_2fr_1.5fr_2fr_120px] gap-3 px-5 py-2.5 items-center text-[12px] border-b last:border-0"
                  style={{ borderColor: "var(--mz-rule)" }}>
                  <div className="mz-tnum font-bold mz-t-fg">{a.quando}</div>
                  <div className="mz-t-fg-strong font-semibold">{a.quem}</div>
                  <div><span className="mz-chip mz-chip-purple w-fit" style={{ height: 20 }}>{a.acao}</span></div>
                  <div className="mz-t-fg-muted">{a.obj}</div>
                  <div className="mz-tnum mz-t-fg-dim">{a.ip}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Integracoes (estatico) */}
        {tab === "integ" && (
          <div className="grid grid-cols-3 gap-3">
            {[
              { n:"TSE",        d:"Sincronizacao candidatos & eleitos", s:"conectado" },
              { n:"CEAF",       d:"Cadastro de expulsoes e acoes",      s:"conectado" },
              { n:"TCU",        d:"Processos e TCEs",                   s:"conectado" },
              { n:"STF",        d:"Acoes e denuncias",                  s:"conectado" },
              { n:"CGU",        d:"Controle de emendas",                s:"conectado" },
              { n:"Camara",     d:"Votacoes e presencas",               s:"conectado" },
              { n:"Senado",     d:"Atividade parlamentar",              s:"conectado" },
              { n:"X (Twitter)",d:"Monitoramento social",               s:"conectado" },
              { n:"Meltwater",  d:"Clipping de midia",                  s:"pendente"  },
            ].map((it, i) => (
              <div key={i} className="mz-ring-soft rounded-xl p-4" style={{ background: "var(--mz-bg-card)" }}>
                <div className="flex items-start justify-between mb-2">
                  <div className="text-[14px] font-bold mz-t-fg-strong">{it.n}</div>
                  <span className={`mz-chip w-fit ${it.s === "conectado" ? "mz-chip-green" : "mz-chip-amber"}`} style={{ height: 20 }}>{it.s}</span>
                </div>
                <div className="text-[11.5px] mz-t-fg-muted">{it.d}</div>
                <button className="mz-btn-ghost mt-3" style={{ padding: "5px 10px", fontSize: 11 }}>Configurar</button>
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  );
}

export default function AdminPage() {
  return (
    <MazzelLayout activeModule="admin" breadcrumbs={["Uniao Brasil", "Admin"]} alertCount={12}>
      <AdminContent />
    </MazzelLayout>
  );
}
