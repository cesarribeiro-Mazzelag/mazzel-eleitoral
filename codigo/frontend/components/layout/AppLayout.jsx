"use client";
/**
 * Layout principal - Plataforma de Inteligência Eleitoral Mazzel Tech
 *
 * Sidebar híbrida adaptativa (19/04/2026):
 *   - 3 estados: expanded (240px) / rail (64px) / peek overlay (240px temporário)
 *   - Auto-colapsa em módulos densos (mapa/radar/dossiê) na 1ª visita
 *   - Manual sobrescreve e salva no localStorage
 *   - Cmd+B / Ctrl+B toggle global
 *   - Hover em rail abre peek (overlay sobre conteúdo)
 *   - NUNCA desaparece: mínimo 64px sempre visível (sem hambúrguer/dead end)
 *
 * Brand: Mazzel violet #7C3AED (--brand-primary default no produto-base).
 */
import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Map, MapPin, Users, UserCheck, Bell, BarChart2, Settings,
  LogOut, ChevronLeft, ChevronRight, PanelLeftClose, PanelLeftOpen,
  Shield, FileText, BookOpen, Landmark, Network, Zap, Radar, HelpCircle,
} from "lucide-react";
import { api } from "@/lib/api";
import { useToast } from "@/lib/toast";
import { LogoUniaoB } from "@/components/ui/LogoUniao";
import { BadgePerfil } from "@/components/ui/BadgePerfil";
import { ChatIA } from "@/components/ia/ChatIA";
import { useSidebarState } from "@/hooks/useSidebarState";

// ─── Navegação ────────────────────────────────────────────────────────────────

const NAV_GROUPS = [
  {
    titulo: "Inteligência",
    itens: [
      { path: "/dashboard", label: "Visão Geral",    icon: BarChart2 },
      { path: "/mapa",      label: "Mapa Eleitoral", icon: Map },
      { path: "/radar",     label: "Radar Político", icon: Radar },
    ],
  },
  {
    titulo: "Operacional",
    itens: [
      { path: "/suplentes",     label: "Suplentes",        icon: Landmark },
      { path: "/coordenadores", label: "Coordenadores",    icon: MapPin },
      { path: "/liderancas",    label: "Lideranças",       icon: Network },
      { path: "/cabos",         label: "Cabos Eleitorais", icon: Zap },
      { path: "/delegados",     label: "Delegados",        icon: Users },
    ],
  },
  {
    titulo: "Gestão",
    itens: [
      { path: "/filiados",   label: "Filiados",   icon: BookOpen },
      { path: "/alertas",    label: "Alertas",    icon: Bell, badge: true },
      { path: "/relatorios", label: "Relatórios", icon: FileText },
    ],
  },
  {
    titulo: "Sistema",
    itens: [
      { path: "/glossario", label: "Glossário", icon: HelpCircle },
    ],
  },
];

const NAV_ADMIN = [
  { path: "/admin",         label: "Admin",         icon: Shield },
  { path: "/configuracoes", label: "Configurações", icon: Settings },
];

const POLITICO_NAV = [
  { titulo: "Meu espaço", itens: [
    { path: "/meu-painel", label: "Meu Painel", icon: BarChart2 },
    { path: "/meus-votos", label: "Meus Votos", icon: Map },
    { path: "/meu-dossie", label: "Meu Dossiê", icon: FileText },
  ]},
];

function gruposPorPerfil(perfil) {
  if (perfil === "POLITICO") return POLITICO_NAV;
  if (perfil === "DELEGADO") {
    return [{
      titulo: "Minha operação",
      itens: [
        { path: "/dashboard", label: "Visão Geral",    icon: BarChart2 },
        { path: "/mapa",      label: "Meu Mapa",       icon: Map },
        { path: "/radar",     label: "Radar Político", icon: Radar },
        { path: "/filiados",  label: "Filiados",       icon: BookOpen },
        { path: "/alertas",   label: "Alertas",        icon: Bell, badge: true },
      ],
    }];
  }
  // PRESIDENTE, DIRETORIA, FUNCIONARIO = completo
  return NAV_GROUPS;
}

// ─── NavItem ──────────────────────────────────────────────────────────────────

function NavItem({ item, expanded, pathname, alertasNaoLidos, onNavigate }) {
  const ativo = pathname === item.path || pathname.startsWith(item.path + "/");
  const Icon = item.icon;

  return (
    <Link
      href={item.path}
      onClick={onNavigate}
      className={[
        "relative flex items-center gap-3 rounded-lg text-sm transition-all duration-150 group",
        expanded ? "px-3 py-2.5" : "w-10 h-10 mx-auto justify-center",
        ativo
          ? "bg-white/15 text-white font-semibold"
          : "text-white/75 hover:bg-white/10 hover:text-white font-medium",
      ].join(" ")}
    >
      {/* Indicador vertical de ativo */}
      {ativo && (
        <span className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-r-full bg-white" />
      )}

      <Icon className="w-[18px] h-[18px] flex-shrink-0" />

      {expanded && (
        <span className="truncate leading-none">{item.label}</span>
      )}

      {/* Badge alertas */}
      {item.badge && alertasNaoLidos > 0 && (
        <span className={[
          "flex items-center justify-center text-[10px] font-bold rounded-full",
          "bg-yellow-400 text-brand-900 min-w-[16px] h-4 px-1",
          expanded ? "ml-auto" : "absolute -top-0.5 -right-0.5",
        ].join(" ")}>
          {alertasNaoLidos > 99 ? "99+" : alertasNaoLidos}
        </span>
      )}

      {/* Tooltip quando em rail (delay 400ms) */}
      {!expanded && (
        <span className="
          absolute left-full ml-3 px-2.5 py-1 rounded-md
          bg-gray-900 text-white text-xs font-semibold whitespace-nowrap
          opacity-0 group-hover:opacity-100 pointer-events-none
          transition-opacity duration-150 delay-300 z-50 shadow-lg
        ">
          {item.label}
        </span>
      )}
    </Link>
  );
}

// ─── SidebarContent ──────────────────────────────────────────────────────────

function SidebarContent({
  expanded, onToggle, grupos, isPresidente, pathname,
  alertasNaoLidos, onNavigate, usuario, onLogout,
}) {
  return (
    <div className="flex flex-col h-full min-h-0">

      {/* Header: logo + botão pino */}
      <div className={[
        "flex items-center px-3 pt-4 pb-3 border-b border-white/10 flex-shrink-0",
        expanded ? "justify-between" : "justify-center",
      ].join(" ")}>
        <div className="flex items-center gap-2">
          <LogoUniaoB size={expanded ? "sm" : "icon"} variant="white" />
        </div>
        <button
          onClick={onToggle}
          className="p-1.5 text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition-colors flex-shrink-0"
          title={expanded ? "Recolher (⌘B)" : "Expandir (⌘B)"}
          aria-label={expanded ? "Recolher sidebar" : "Expandir sidebar"}
        >
          {expanded
            ? <PanelLeftClose className="w-4 h-4" />
            : <PanelLeftOpen className="w-4 h-4" />
          }
        </button>
      </div>

      {/* Nav (scroll quando muitos itens) */}
      <nav className="flex-1 min-h-0 overflow-y-auto py-3 space-y-4">
        {grupos.map((g) => (
          <div key={g.titulo} className="px-2">
            {expanded ? (
              <p className="px-2 mb-1.5 text-white/40 text-[10px] font-black uppercase tracking-[0.18em]">
                {g.titulo}
              </p>
            ) : (
              <div className="border-t border-white/10 mx-2 mb-1.5" />
            )}
            <div className="flex flex-col gap-0.5">
              {g.itens.map(item => (
                <NavItem
                  key={item.path}
                  item={item}
                  expanded={expanded}
                  pathname={pathname}
                  alertasNaoLidos={alertasNaoLidos}
                  onNavigate={onNavigate}
                />
              ))}
            </div>
          </div>
        ))}

        {/* Admin (só pra PRESIDENTE) */}
        {isPresidente && (
          <div className="px-2">
            {expanded ? (
              <p className="px-2 mb-1.5 text-white/40 text-[10px] font-black uppercase tracking-[0.18em]">
                Administração
              </p>
            ) : (
              <div className="border-t border-white/10 mx-2 mb-1.5" />
            )}
            <div className="flex flex-col gap-0.5">
              {NAV_ADMIN.map(item => (
                <NavItem
                  key={item.path}
                  item={item}
                  expanded={expanded}
                  pathname={pathname}
                  alertasNaoLidos={0}
                  onNavigate={onNavigate}
                />
              ))}
            </div>
          </div>
        )}
      </nav>

      {/* Perfil do usuário */}
      {usuario && (
        <div className="px-2 pb-3 pt-2 border-t border-white/10 flex-shrink-0">
          <div className={[
            "flex items-center gap-2.5 rounded-lg p-2",
            expanded ? "" : "justify-center",
          ].join(" ")}>
            <div className="w-9 h-9 rounded-full bg-yellow-400 flex items-center justify-center flex-shrink-0">
              <span className="text-brand-900 font-black text-sm">
                {usuario.nome?.[0]?.toUpperCase() ?? "U"}
              </span>
            </div>

            {expanded && (
              <>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-semibold truncate leading-tight">
                    {usuario.nome}
                  </p>
                  <BadgePerfil perfil={usuario.perfil} />
                </div>
                <button
                  onClick={onLogout}
                  title="Sair"
                  className="p-1.5 text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition-colors flex-shrink-0"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </>
            )}
          </div>

          {!expanded && (
            <button
              onClick={onLogout}
              title="Sair"
              className="mt-1 w-full flex justify-center p-2 text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition-colors group relative"
            >
              <LogOut className="w-4 h-4" />
              <span className="
                absolute left-full ml-3 px-2.5 py-1 rounded-md
                bg-gray-900 text-white text-xs font-semibold whitespace-nowrap
                opacity-0 group-hover:opacity-100 pointer-events-none
                transition-opacity duration-150 delay-300 z-50 shadow-lg
              ">
                Sair
              </span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ─── AppLayout ────────────────────────────────────────────────────────────────

export function AppLayout({ children, semPadding = false, semChatIA = false }) {
  const pathname = usePathname();
  const router   = useRouter();
  const toast    = useToast();

  const [usuario,         setUsuario]         = useState(null);
  const [alertasNaoLidos, setAlertasNaoLidos] = useState(0);

  const sidebar = useSidebarState(pathname);
  const { mode, peeking, railWidth, renderedWidth, toggle, setPeeking } = sidebar;
  const expanded = mode === "expanded" || peeking;

  const peekTimerRef = useRef(null);

  useEffect(() => {
    const u = api.getUser();
    if (!u) { router.replace("/login"); return; }
    setUsuario(u);

    api.alertas.list({ lido: false, limit: 1 })
      .then(d => setAlertasNaoLidos(d?.total ?? 0))
      .catch(() => {});
  }, []);

  const logout = useCallback(async () => {
    try { await api.auth.logout(); } catch {}
    api.clearSession();
    router.replace("/login");
  }, [router]);

  // Peek on hover da rail (delay pequeno pra evitar abrir sem querer)
  const handleMouseEnter = useCallback(() => {
    if (mode !== "rail") return;
    if (peekTimerRef.current) clearTimeout(peekTimerRef.current);
    peekTimerRef.current = setTimeout(() => setPeeking(true), 250);
  }, [mode, setPeeking]);

  const handleMouseLeave = useCallback(() => {
    if (peekTimerRef.current) clearTimeout(peekTimerRef.current);
    setPeeking(false);
  }, [setPeeking]);

  useEffect(() => {
    return () => { if (peekTimerRef.current) clearTimeout(peekTimerRef.current); };
  }, []);

  const grupos = gruposPorPerfil(usuario?.perfil);
  const isPresidente = usuario?.perfil === "PRESIDENTE";

  const sidebarProps = {
    expanded,
    onToggle: toggle,
    grupos,
    isPresidente,
    pathname,
    alertasNaoLidos,
    onNavigate: () => setPeeking(false),
    usuario,
    onLogout: logout,
  };

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">

      {/* Sidebar slot (ocupa sempre railWidth no fluxo).
          z-index alto garante que qualquer header/toolbar do conteudo
          NUNCA sobrepoe a sidebar (fix 19/04). */}
      <div
        className="relative flex-shrink-0 transition-[width] duration-200 ease-out z-50"
        style={{ width: railWidth }}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <aside
          className={[
            "absolute top-0 bottom-0 left-0 bg-[#1E0A3C] flex flex-col",
            "shadow-[4px_0_24px_-8px_rgba(0,0,0,0.25)]",
            "transition-[width] duration-200 ease-out",
          ].join(" ")}
          style={{ width: renderedWidth }}
        >
          <SidebarContent {...sidebarProps} />
        </aside>
      </div>

      {/* Backdrop leve quando peek aberto (atras do aside, na frente do main) */}
      {peeking && (
        <div
          className="fixed inset-0 bg-black/10 z-40 pointer-events-none"
          aria-hidden="true"
        />
      )}

      {/* Conteúdo principal (z-index padrao, fica atras da sidebar) */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0 relative">
        <main className={[
          "flex-1 min-h-0",
          semPadding ? "overflow-hidden" : "overflow-y-auto p-5 lg:p-6",
        ].join(" ")}>
          {children}
        </main>
      </div>

      {/* Chat IA (só PRESIDENTE / DIRETORIA) */}
      {!semChatIA && usuario && ["PRESIDENTE", "DIRETORIA"].includes(usuario.perfil) && (
        <ChatIA />
      )}
    </div>
  );
}
