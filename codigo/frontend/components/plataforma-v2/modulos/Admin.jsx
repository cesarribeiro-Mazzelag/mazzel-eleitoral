"use client";

/* Modulo Admin / White-Label - adaptado de designer/platform-admin-dossie.jsx ModuleAdmin. */

import { useState } from "react";
import { Icon } from "../Icon";
import { usePlatform } from "../PlatformContext";
import { TENANTS, ADMIN_USUARIOS, ADMIN_PAPEIS, ADMIN_AUDIT } from "../data";
import { API } from "../api";
import { useApiFetch, StatusBanner } from "../useApiFetch";
import { adminUsuariosFromApi, adminAuditoriaFromApi } from "../adapters/listagens";

const TABS = [
  { k: "tenant",   l: "White-label" },
  { k: "usuarios", l: "Usuários" },
  { k: "papeis",   l: "Papéis & permissões" },
  { k: "audit",    l: "Auditoria" },
  { k: "integ",    l: "Integrações" },
];

const INTEGRACOES = [
  { n: "TSE",          d: "Sincronização candidatos & eleitos", s: "conectado" },
  { n: "CEAF",         d: "Cadastro de expulsões e ações",      s: "conectado" },
  { n: "TCU",          d: "Processos e TCEs",                   s: "conectado" },
  { n: "STF",          d: "Ações e denúncias",                  s: "conectado" },
  { n: "CGU",          d: "Controle de emendas",                s: "conectado" },
  { n: "Câmara",       d: "Votações e presenças",               s: "conectado" },
  { n: "Senado",       d: "Atividade parlamentar",              s: "conectado" },
  { n: "X (Twitter)",  d: "Monitoramento social",               s: "conectado" },
  { n: "Meltwater",    d: "Clipping de mídia",                  s: "pendente" },
];

export function Admin() {
  const { tenant } = usePlatform();
  const t = TENANTS[tenant] || TENANTS.uniao;
  const [tab, setTab] = useState("tenant");

  return (
    <div className="bg-page-grad min-h-full">
      <div className="max-w-[1600px] mx-auto px-8 py-7">
        <div className="flex items-end justify-between mb-5">
          <div>
            <div className="text-[11px] t-fg-dim tracking-[0.18em] uppercase font-semibold">Admin · Apenas Presidente</div>
            <h1 className="text-[32px] font-display font-bold t-fg-strong mt-1 leading-none">Configurações da plataforma</h1>
            <div className="text-[13px] t-fg-muted mt-1.5">Tenant · usuários · papéis · auditoria · integrações.</div>
          </div>
          <span className="chip chip-red">
            <Icon name="AlertTriangle" size={10} />Ações aqui afetam todos os usuários
          </span>
        </div>

        <div className="flex items-center gap-1 mb-5 p-1 rounded-lg inline-flex" style={{ background: "var(--rule)" }}>
          {TABS.map((x) => (
            <button
              key={x.k}
              onClick={() => setTab(x.k)}
              className={`btn-ghost ${tab === x.k ? "active" : ""}`}
              style={{ padding: "7px 14px", fontSize: 12 }}
              type="button"
            >
              {x.l}
            </button>
          ))}
        </div>

        {tab === "tenant" && <TenantTab tenant={t} />}
        {tab === "usuarios" && <UsuariosTabApi />}
        {tab === "papeis" && <PapeisTab />}
        {tab === "audit" && <AuditTabApi />}
        {tab === "integ" && <IntegracoesTab />}
      </div>
    </div>
  );
}

function TenantTab({ tenant: t }) {
  return (
    <div className="grid grid-cols-[1fr_380px] gap-3">
      <div className="t-bg-card ring-soft rounded-xl p-6">
        <div className="text-[11px] t-fg-dim uppercase tracking-[0.14em] font-semibold mb-3">Identidade visual</div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Nome do cliente"  defaultValue={t.nome} />
          <Field label="Sigla (2-3 letras)" defaultValue={t.sigla} />
          <FieldColor label="Cor primária"  color={t.primary} />
          <FieldColor label="Cor de destaque" color={t.accent} />
          <Field label="Domínio customizado" defaultValue="plataforma.unionbrasil.org.br" fullWidth />
        </div>
        <div className="flex items-center gap-2 mt-5 pt-5 border-t" style={{ borderColor: "var(--rule)" }}>
          <button className="btn-primary" type="button">Salvar alterações</button>
          <button className="btn-ghost" type="button">Descartar</button>
          <div className="flex-1" />
          <div className="text-[11px] t-fg-dim">Última edição: 23 nov · Paulo Guedes</div>
        </div>
      </div>

      <div className="t-bg-card ring-soft rounded-xl overflow-hidden">
        <div className="px-5 py-3.5 border-b" style={{ borderColor: "var(--rule)" }}>
          <div className="text-[10.5px] t-fg-dim uppercase tracking-[0.14em] font-semibold">Pré-visualização</div>
          <div className="text-[15px] font-bold t-fg-strong">Como os usuários vão ver</div>
        </div>
        <div className="p-4">
          <div className="rounded-lg overflow-hidden ring-soft">
            <div
              className="flex items-center gap-2.5 px-4 py-3"
              style={{ background: "linear-gradient(180deg, rgba(var(--tenant-primary-rgb),0.15), transparent)" }}
            >
              <div
                className="w-8 h-8 rounded-md flex items-center justify-center text-white font-bold text-[11px] flex-shrink-0"
                style={{ background: t.primary }}
              >
                {t.logoText}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[12px] font-bold t-fg-strong truncate leading-tight">{t.nome}</div>
                <div className="text-[10px] t-fg-dim uppercase tracking-wider leading-tight mt-0.5">{t.plano}</div>
              </div>
            </div>
            <div className="px-4 py-3 border-t" style={{ borderColor: "var(--rule)" }}>
              <div className="text-[10px] t-fg-dim uppercase tracking-wider">Dashboard</div>
              <div className="text-[13px] font-bold t-fg-strong">Bom dia, equipe.</div>
              <button className="btn-primary mt-3" style={{ padding: "6px 10px", fontSize: 11 }} type="button">
                Botão primário
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, defaultValue, fullWidth = false }) {
  return (
    <div className={fullWidth ? "col-span-2" : ""}>
      <label className="text-[10.5px] t-fg-dim uppercase tracking-wider font-semibold">{label}</label>
      <input
        defaultValue={defaultValue}
        className="w-full mt-1.5 px-3 py-2 rounded-md text-[13px] t-fg bg-transparent"
        style={{ border: "1px solid var(--rule-strong)" }}
      />
    </div>
  );
}

function FieldColor({ label, color }) {
  return (
    <div>
      <label className="text-[10.5px] t-fg-dim uppercase tracking-wider font-semibold">{label}</label>
      <div className="flex items-center gap-2 mt-1.5">
        <div className="w-9 h-9 rounded-md shrink-0 ring-soft" style={{ background: color }} />
        <input
          defaultValue={color}
          className="flex-1 px-3 py-2 rounded-md text-[13px] tnum t-fg bg-transparent"
          style={{ border: "1px solid var(--rule-strong)" }}
        />
      </div>
    </div>
  );
}

function UsuariosTabApi() {
  const { data, status, errorMsg } = useApiFetch(
    () => API.adminUsuarios().then(adminUsuariosFromApi),
    null,
    [],
  );
  return <><StatusBanner status={status} errorMsg={errorMsg} /><UsuariosTab list={data || ADMIN_USUARIOS} /></>;
}

function UsuariosTab({ list = ADMIN_USUARIOS }) {
  return (
    <div className="t-bg-card ring-soft rounded-xl overflow-hidden">
      <div className="px-5 py-3.5 border-b flex items-center gap-3" style={{ borderColor: "var(--rule)" }}>
        <div className="flex-1">
          <div className="text-[10.5px] t-fg-dim uppercase tracking-[0.14em] font-semibold">Gestão de usuários</div>
          <div className="text-[15px] font-bold t-fg-strong">{list.length} usuários ativos</div>
        </div>
        <div className="flex items-center gap-2 h-8 px-3 rounded-md" style={{ background: "var(--rule)" }}>
          <Icon name="Search" size={12} className="t-fg-dim" />
          <input placeholder="Buscar..." className="bg-transparent outline-none text-[12px] w-52 t-fg" />
        </div>
        <button className="btn-primary" style={{ padding: "6px 12px", fontSize: 11 }} type="button">
          <Icon name="Plus" size={11} />Novo usuário
        </button>
      </div>
      <div className="row-striped">
        <div
          className="grid grid-cols-[2fr_2fr_1fr_70px_90px_60px_90px_80px] gap-3 px-5 py-2.5 text-[10px] t-fg-dim uppercase tracking-wider font-semibold border-b"
          style={{ borderColor: "var(--rule)", background: "var(--bg-card-2)" }}
        >
          <div>Nome</div><div>E-mail</div><div>Papel</div><div>UF</div>
          <div>Status</div><div>MFA</div><div>Último acesso</div><div></div>
        </div>
        {list.map((u, i) => (
          <div
            key={i}
            className="grid grid-cols-[2fr_2fr_1fr_70px_90px_60px_90px_80px] gap-3 px-5 py-2.5 items-center text-[12px]"
          >
            <div className="font-semibold t-fg-strong">{u.nome}</div>
            <div className="t-fg-muted truncate">{u.email}</div>
            <div className="t-fg">{u.papel}</div>
            <div className="tnum t-fg">{u.uf}</div>
            <div>
              <span
                className={`chip ${
                  u.status === "ativo" ? "chip-green" :
                  u.status === "pendente" ? "chip-amber" : "chip-red"
                }`}
                style={{ height: 20 }}
              >
                {u.status}
              </span>
            </div>
            <div>
              {u.mfa
                ? <Icon name="Check" size={13} className="t-ok" />
                : <Icon name="X" size={13} className="t-danger" />}
            </div>
            <div className="t-fg-dim text-[11px] tnum">{u.last}</div>
            <div className="text-right">
              <button className="btn-ghost" style={{ padding: "3px 9px", fontSize: 10 }} type="button">Editar</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function PapeisTab() {
  return (
    <div className="space-y-3">
      {ADMIN_PAPEIS.map((p, i) => (
        <div key={i} className="t-bg-card ring-soft rounded-xl p-5">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-lg t-bg-tenant-soft flex items-center justify-center shrink-0">
              <Icon name="Users" size={20} className="t-tenant" />
            </div>
            <div className="flex-1">
              <div className="flex items-baseline gap-3 mb-1">
                <div className="text-[15px] font-bold t-fg-strong">{p.papel}</div>
                <div className="chip chip-muted" style={{ height: 20 }}>
                  {p.qtd} {p.qtd === 1 ? "usuário" : "usuários"}
                </div>
              </div>
              <div className="text-[12px] t-fg-muted mb-3">{p.desc}</div>
              <div className="flex items-center gap-1.5 flex-wrap">
                {p.perm.map((pm) => (
                  <span key={pm} className="chip chip-blue" style={{ height: 22 }}>{pm}</span>
                ))}
              </div>
            </div>
            <button className="btn-ghost" style={{ padding: "5px 10px" }} type="button">Editar permissões</button>
          </div>
        </div>
      ))}
    </div>
  );
}

function AuditTabApi() {
  const { data, status, errorMsg } = useApiFetch(
    () => API.adminAuditoria().then(adminAuditoriaFromApi),
    null,
    [],
  );
  return <><StatusBanner status={status} errorMsg={errorMsg} /><AuditTab logs={data || ADMIN_AUDIT} /></>;
}

function AuditTab({ logs = ADMIN_AUDIT }) {
  return (
    <div className="t-bg-card ring-soft rounded-xl overflow-hidden">
      <div className="px-5 py-3.5 border-b flex items-center justify-between" style={{ borderColor: "var(--rule)" }}>
        <div>
          <div className="text-[10.5px] t-fg-dim uppercase tracking-[0.14em] font-semibold">Auditoria · LGPD-compliant</div>
          <div className="text-[15px] font-bold t-fg-strong">Log de ações · retenção 90 dias</div>
        </div>
        <button className="btn-ghost" type="button"><Icon name="Download" size={12} />Exportar</button>
      </div>
      <div>
        <div
          className="grid grid-cols-[80px_2fr_1.5fr_2fr_120px] gap-3 px-5 py-2.5 text-[10px] t-fg-dim uppercase tracking-wider font-semibold border-b"
          style={{ borderColor: "var(--rule)", background: "var(--bg-card-2)" }}
        >
          <div>Quando</div><div>Quem</div><div>Ação</div><div>Objeto</div><div>IP</div>
        </div>
        {logs.map((a, i) => (
          <div
            key={i}
            className="grid grid-cols-[80px_2fr_1.5fr_2fr_120px] gap-3 px-5 py-2.5 items-center text-[12px] border-b last:border-0"
            style={{ borderColor: "var(--rule)" }}
          >
            <div className="tnum font-bold t-fg">{a.quando}</div>
            <div className="t-fg-strong font-semibold">{a.quem}</div>
            <div><span className="chip chip-purple" style={{ height: 20 }}>{a.acao}</span></div>
            <div className="t-fg-muted">{a.obj}</div>
            <div className="tnum t-fg-dim">{a.ip}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function IntegracoesTab() {
  return (
    <div className="grid grid-cols-3 gap-3">
      {INTEGRACOES.map((it, i) => (
        <div key={i} className="t-bg-card ring-soft rounded-xl p-4">
          <div className="flex items-start justify-between mb-2">
            <div className="text-[14px] font-bold t-fg-strong">{it.n}</div>
            <span className={`chip ${it.s === "conectado" ? "chip-green" : "chip-amber"}`} style={{ height: 20 }}>
              {it.s}
            </span>
          </div>
          <div className="text-[11.5px] t-fg-muted">{it.d}</div>
          <button className="btn-ghost mt-3" style={{ padding: "5px 10px", fontSize: 11 }} type="button">
            Configurar
          </button>
        </div>
      ))}
    </div>
  );
}
