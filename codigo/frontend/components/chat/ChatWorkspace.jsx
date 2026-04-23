"use client";

/**
 * ChatWorkspace — UI compartilhada do Chat Sigiloso.
 * Usada em:
 *   - app/mazzel-preview/campanha/_tabs/CampanhaChat.jsx
 *   - app/mazzel-preview/chat/page.jsx
 *
 * Props:
 *   campanhaId?: string   — filtra salas por campanha
 *   altura?: string       — altura do container (default "calc(100vh - 140px)")
 *
 * Conectado ao backend via hooks/useChat.ts.
 * Fallback: exibe dados mock quando API retorna vazio (badge "demo").
 */

import { useState, useRef, useEffect } from "react";
import {
  Shield, Search, Plus, Lock, Eye, EyeOff, Phone, MoreHorizontal,
  Send, Paperclip, FileText, User, Users, Info,
} from "lucide-react";
import {
  useChatSalas,
  useChatSala,
  useChatMensagens,
  useEnviarMensagem,
} from "@/hooks/useChat";
import { CHAT_CANAIS, CHAT_MENSAGENS } from "@/components/mazzel-data/campanha";

// ---------------------------------------------------------------------------
// Usuario logado (do localStorage ub_user)
// ---------------------------------------------------------------------------

function getUsuarioAtual() {
  if (typeof window === "undefined") return null;
  try {
    return JSON.parse(localStorage.getItem("ub_user") ?? "null");
  } catch {
    return null;
  }
}

function decodificarConteudo(base64) {
  if (!base64) return "";
  try {
    // atob com suporte a UTF-8
    const bin = atob(base64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new TextDecoder("utf-8").decode(bytes);
  } catch {
    return base64;
  }
}

// ---------------------------------------------------------------------------
// Helpers visuais
// ---------------------------------------------------------------------------

function Avatar({ nome, size = 28 }) {
  const colors = ["#3b82f6","#10b981","#f59e0b","#ef4444","#8b5cf6","#06b6d4"];
  const initials = nome.split(" ").slice(0, 2).map(n => n[0]).join("").toUpperCase();
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%",
      background: colors[nome.charCodeAt(0) % colors.length],
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: size * 0.38, fontWeight: 700, color: "#fff", flexShrink: 0,
    }}>
      {initials}
    </div>
  );
}

function MockBadge() {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9.5px] font-semibold"
      style={{ background: "rgba(99,102,241,0.1)", color: "#6366f1", border: "1px solid rgba(99,102,241,0.2)" }}>
      <Info size={8} />dados de demonstracao
    </span>
  );
}

function formatarHora(isoString) {
  if (!isoString) return "";
  try {
    const d = new Date(isoString);
    return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
}

// ---------------------------------------------------------------------------
// Adaptar salas da API para o formato visual
// ---------------------------------------------------------------------------

function adaptarSala(sala, detalhe) {
  const membrosCount = detalhe?.participantes?.length ?? sala.membros_count ?? 0;
  return {
    id: sala.id,
    nome: sala.nome,
    tipo: sala.tipo,
    membros: membrosCount,
    ultima: "agora",
    preview: sala.descricao ?? "",
    unread: detalhe?.nao_lidas ?? 0,
    furtivo: false,
    classificacao: sala.tipo === "canal" ? "broadcast" : "interno",
  };
}

function adaptarMensagem(msg, usuarioAtualId, mapaParticipantes) {
  const remetente = msg.remetente_id;
  const nomeRemetente = mapaParticipantes?.[remetente] ?? `Usuario ${remetente}`;
  const sou_eu = remetente != null && Number(remetente) === Number(usuarioAtualId);
  return {
    id: msg.id,
    autor: sou_eu ? "Voce" : nomeRemetente,
    papel: "",
    texto: decodificarConteudo(msg.conteudo_criptografado),
    hora: formatarHora(msg.created_at),
    me: sou_eu,
    status: msg.visualizada_em ? "lido" : "entregue",
    modo: msg.modo,
    expira_em: msg.expira_em,
  };
}

// ---------------------------------------------------------------------------
// Componente principal
// ---------------------------------------------------------------------------

export default function ChatWorkspace({ campanhaId, altura = "calc(100vh - 140px)" }) {
  // Usuario logado (pra determinar autoria das mensagens)
  const [usuarioAtual] = useState(() => getUsuarioAtual());

  // Hooks de API
  const { salas: salasApi, isMock: isMockSalas, isLoading: loadingSalas } = useChatSalas(campanhaId);

  // Determina lista de canais (API ou fallback mock)
  const usarMock = isMockSalas || salasApi.length === 0;

  const [canalSelecionadoId, setCanalSelecionadoId] = useState(null);
  const [furtivo, setFurtivo] = useState(false);
  const [viewUnico, setViewUnico] = useState(false);
  const [inputTexto, setInputTexto] = useState("");
  const mensagensRef = useRef(null);

  // Detalhe da sala selecionada (pra membros + nomes dos participantes)
  // So busca se o id parece UUID (evita 422 quando canalSelecionadoId ainda eh mock)
  const idEhUuid = canalSelecionadoId && /^[0-9a-f]{8}-[0-9a-f]{4}/i.test(canalSelecionadoId);
  const salaIdParaDetalhe = !usarMock && idEhUuid ? canalSelecionadoId : null;
  const { sala: salaDetalhe } = useChatSala(salaIdParaDetalhe);

  // Monta mapa remetente_id -> nome
  const mapaParticipantes = {};
  if (salaDetalhe?.participantes) {
    for (const p of salaDetalhe.participantes) {
      if (p.usuario_id != null) {
        mapaParticipantes[p.usuario_id] = p.usuario_nome ?? `Usuario ${p.usuario_id}`;
      }
    }
  }

  const canais = usarMock
    ? CHAT_CANAIS
    : salasApi.map(s => adaptarSala(s, s.id === canalSelecionadoId ? salaDetalhe : null));

  const canalSelecionado = canais.find(c => c.id === canalSelecionadoId) ?? canais[0] ?? null;

  // Mensagens da sala ativa (polling 3s) - so busca se id eh UUID
  const idCanalEhUuid = canalSelecionado?.id && /^[0-9a-f]{8}-[0-9a-f]{4}/i.test(canalSelecionado.id);
  const salaIdAtual = !usarMock && idCanalEhUuid ? canalSelecionado.id : null;
  const {
    mensagens: mensagensApi,
    isMock: isMockMensagens,
    isLoading: loadingMensagens,
  } = useChatMensagens(salaIdAtual);

  const { enviar, loading: enviando } = useEnviarMensagem(salaIdAtual);

  // Mensagens finais: API ou mock
  const mensagensMock = CHAT_MENSAGENS[canalSelecionado?.id] ?? [];
  const mensagens = (usarMock || isMockMensagens)
    ? mensagensMock
    : mensagensApi.map(m => adaptarMensagem(m, usuarioAtual?.id, mapaParticipantes));

  // Scroll para o fim ao receber novas mensagens
  useEffect(() => {
    if (mensagensRef.current) {
      mensagensRef.current.scrollTop = mensagensRef.current.scrollHeight;
    }
  }, [mensagens.length]);

  // Seleciona primeira sala real assim que a API responde.
  // Se estava em mock e agora tem sala real, troca pra real (bug fix: nao manter id mock).
  useEffect(() => {
    if (!usarMock && salasApi.length > 0) {
      const temSelecaoValida = salasApi.some(s => s.id === canalSelecionadoId);
      if (!temSelecaoValida) {
        setCanalSelecionadoId(salasApi[0].id);
      }
    } else if (usarMock && canalSelecionadoId == null && CHAT_CANAIS.length > 0) {
      setCanalSelecionadoId(CHAT_CANAIS[0].id);
    }
  }, [usarMock, salasApi.length, salasApi.map(s => s.id).join(",")]);

  async function handleEnviar() {
    if (!inputTexto.trim()) return;
    const texto = inputTexto;
    setInputTexto("");

    if (usarMock || !salaIdAtual) return; // mock: so limpa o input

    const modo = viewUnico ? "view_unico" : furtivo ? "sigiloso" : "padrao";
    await enviar({
      conteudo: texto,
      modo,
      ttl_segundos: furtivo && !viewUnico ? 60 : undefined,
    });
  }

  function handleKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleEnviar();
    }
  }

  if (!canalSelecionado) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-[13px] mz-t-fg-dim">
          {loadingSalas ? "Carregando salas..." : "Nenhum canal disponivel."}
        </div>
      </div>
    );
  }

  return (
    <div className="flex" style={{ height: altura, minHeight: 500, background: "var(--mz-bg-page-2,#fafafa)" }}>
      {/* Lista de canais */}
      <aside className="w-[280px] flex-shrink-0 border-r flex flex-col overflow-hidden"
        style={{ borderColor: "var(--mz-rule)", background: "var(--mz-bg-card)" }}>
        <div className="p-4 border-b" style={{ borderColor: "var(--mz-rule)" }}>
          <div className="flex items-center gap-2 mb-3">
            <Shield size={14} style={{ color: "var(--mz-tenant-primary,#002A7B)" }}/>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <div className="text-[12.5px] font-bold mz-t-fg-strong">Canais seguros</div>
                {usarMock && <MockBadge />}
              </div>
              <div className="text-[10px] mz-t-fg-dim">E2E · registros auditaveis</div>
            </div>
            <button style={{ padding: "5px 7px", background: "var(--mz-rule)", borderRadius: 6 }}>
              <Plus size={11}/>
            </button>
          </div>
          <div className="flex items-center gap-2 px-3 h-[30px] rounded-md" style={{ background: "var(--mz-rule)" }}>
            <Search size={11} style={{ color: "var(--mz-fg-dim)" }}/>
            <input placeholder="Buscar canal..." className="flex-1 bg-transparent outline-none text-[11.5px]" style={{ color: "var(--mz-fg)" }}/>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: "thin" }}>
          {canais.map(c => {
            const ativo = canalSelecionado?.id === c.id;
            return (
              <div key={c.id} onClick={() => setCanalSelecionadoId(c.id)}
                className="px-4 py-3 cursor-pointer border-b"
                style={{
                  background: ativo ? "var(--mz-rule-strong,rgba(0,0,0,0.08))" : "transparent",
                  borderColor: "var(--mz-rule)",
                }}>
                <div className="flex items-center gap-2 mb-1">
                  {c.furtivo && <Lock size={10} style={{ color: "var(--mz-warn,#fbbf24)" }}/>}
                  <div className="text-[12px] font-semibold mz-t-fg-strong flex-1 truncate">{c.nome}</div>
                  <div className="text-[9.5px] mz-t-fg-dim">{c.ultima}</div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="text-[11px] mz-t-fg-muted flex-1 truncate">
                    {c.furtivo
                      ? <span className="italic mz-t-fg-dim">Mensagem protegida</span>
                      : c.preview}
                  </div>
                  {c.unread > 0 && (
                    <span style={{
                      background: "var(--mz-danger,#ef4444)", color: "#fff",
                      fontSize: 9.5, fontWeight: 700, minWidth: 16, height: 16,
                      borderRadius: 999, display: "flex", alignItems: "center",
                      justifyContent: "center", padding: "0 4px",
                    }}>{c.unread}</span>
                  )}
                </div>
                <div className="flex items-center gap-1.5 mt-1">
                  <span className="inline-flex px-1.5 h-[14px] items-center rounded-full text-[8.5px] font-bold"
                    style={{ background: "var(--mz-rule)", color: "var(--mz-fg-dim)" }}>
                    {c.tipo?.toUpperCase()}
                  </span>
                  <span className="text-[9.5px] mz-t-fg-dim">
                    · {c.membros} membros · {c.classificacao}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </aside>

      {/* Area de mensagens */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="flex items-center gap-3 px-5 h-[56px] flex-shrink-0 border-b"
          style={{ borderColor: "var(--mz-rule)", background: "var(--mz-bg-card)" }}>
          <div className="w-9 h-9 rounded-md flex items-center justify-center"
            style={{ background: "var(--mz-tenant-primary,#002A7B)", color: "#fff" }}>
            {canalSelecionado.tipo === "direto" ? <User size={14}/> : <Users size={14}/>}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <div className="text-[13px] font-bold mz-t-fg-strong">{canalSelecionado.nome}</div>
              {(canalSelecionado.furtivo || furtivo) && (
                <span className="inline-flex items-center gap-1 px-2 h-5 rounded-full text-[9.5px] font-bold"
                  style={{ background: "rgba(217,119,6,0.1)", color: "var(--mz-warn,#fbbf24)" }}>
                  <Lock size={8}/>FURTIVO
                </span>
              )}
              {viewUnico && (
                <span className="inline-flex items-center gap-1 px-2 h-5 rounded-full text-[9.5px] font-bold"
                  style={{ background: "rgba(139,92,246,0.12)", color: "#8b5cf6" }}>
                  <Eye size={8}/>VIEW UNICO
                </span>
              )}
              <span className="inline-flex px-2 h-5 items-center rounded-full text-[9.5px] font-bold"
                style={{ background: "var(--mz-rule)", color: "var(--mz-fg-dim)" }}>
                {canalSelecionado.classificacao?.toUpperCase()}
              </span>
            </div>
            <div className="text-[10.5px] mz-t-fg-dim">
              {canalSelecionado.membros} membros · ultima atividade {canalSelecionado.ultima} atras
            </div>
          </div>
          {/* Botao Furtivo */}
          <button onClick={() => { setFurtivo(!furtivo); setViewUnico(false); }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-semibold mz-t-fg-muted"
            style={{ background: furtivo ? "rgba(217,119,6,0.12)" : "var(--mz-rule)", color: furtivo ? "var(--mz-warn,#d97706)" : undefined }}>
            {furtivo ? <EyeOff size={11}/> : <Eye size={11}/>}
            {furtivo ? "Furtivo ON" : "Furtivo OFF"}
          </button>
          {/* Botao View Unico */}
          <button onClick={() => { setViewUnico(!viewUnico); setFurtivo(false); }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-semibold"
            style={{
              background: viewUnico ? "rgba(139,92,246,0.12)" : "var(--mz-rule)",
              color: viewUnico ? "#8b5cf6" : "var(--mz-fg-dim)",
            }}>
            <Eye size={11}/>
            {viewUnico ? "1x ON" : "1x OFF"}
          </button>
          <button style={{ padding: "6px 8px", background: "var(--mz-rule)", borderRadius: 6 }}>
            <Phone size={11}/>
          </button>
          <button style={{ padding: "6px 8px", background: "var(--mz-rule)", borderRadius: 6 }}>
            <MoreHorizontal size={11}/>
          </button>
        </div>

        {/* Mensagens */}
        <div ref={mensagensRef}
          className="flex-1 overflow-y-auto px-6 py-5 space-y-3"
          style={{ scrollbarWidth: "thin", background: "var(--mz-bg-page-2,#fafafa)" }}>
          <div className="flex justify-center mb-4">
            <div className="px-3 py-1.5 rounded-full text-[10.5px] flex items-center gap-1.5"
              style={{ background: "rgba(217,119,6,0.08)", color: "var(--mz-warn,#d97706)", border: "1px solid rgba(217,119,6,0.2)" }}>
              <Shield size={10}/>
              Conversa cifrada ponta-a-ponta · log de auditoria apenas em acesso judicial
            </div>
          </div>

          {loadingMensagens && (
            <div className="text-center text-[12px] mz-t-fg-dim py-4">Carregando mensagens...</div>
          )}

          {!loadingMensagens && mensagens.length === 0 && (
            <div className="text-center text-[12px] mz-t-fg-dim py-8">Nenhuma mensagem neste canal.</div>
          )}

          {mensagens.map(m => (
            <div key={m.id} className={`flex gap-2 ${m.me ? "justify-end" : "justify-start"}`}>
              {!m.me && <Avatar nome={m.autor} size={26}/>}
              <div className={m.me ? "text-right" : ""} style={{ maxWidth: "75%" }}>
                {!m.me && (
                  <div className="text-[10px] mz-t-fg-dim font-semibold mb-0.5">
                    {m.autor} · <span className="mz-t-fg-dim font-normal">{m.papel}</span>
                  </div>
                )}
                <div className="px-3 py-2 rounded-2xl text-[12.5px]" style={{
                  background: m.me ? "var(--mz-tenant-primary,#002A7B)" : "var(--mz-bg-card,#fff)",
                  color: m.me ? "#fff" : "var(--mz-fg)",
                  border: m.me ? "none" : "1px solid var(--mz-rule)",
                  borderBottomRightRadius: m.me ? 4 : 18,
                  borderBottomLeftRadius: m.me ? 18 : 4,
                }}>
                  {m.texto}
                  {m.modo === "sigiloso" && (
                    <div className="mt-1 text-[9px] flex items-center gap-1 opacity-70">
                      <Lock size={8}/>expira em breve
                    </div>
                  )}
                  {m.modo === "view_unico" && (
                    <div className="mt-1 text-[9px] flex items-center gap-1" style={{ color: "#8b5cf6" }}>
                      <Eye size={8}/>visualizacao unica
                    </div>
                  )}
                  {m.anexo && (
                    <div className="mt-2 px-2.5 py-2 rounded-md flex items-center gap-2 text-[10.5px]"
                      style={{ background: m.me ? "rgba(255,255,255,0.14)" : "var(--mz-bg-card-2,rgba(0,0,0,0.04))" }}>
                      <FileText size={11}/>
                      {m.anexo}
                    </div>
                  )}
                </div>
                <div className="text-[9.5px] mz-t-fg-dim mt-0.5 flex items-center gap-1"
                  style={{ justifyContent: m.me ? "flex-end" : "flex-start" }}>
                  <span>{m.hora}</span>
                  {m.me && (
                    <span style={{ color: m.status === "lido" ? "var(--mz-ok,#34d399)" : "var(--mz-fg-dim)" }}>
                      {"✓✓"}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Input */}
        <div className="flex-shrink-0 px-5 py-3 border-t"
          style={{ borderColor: "var(--mz-rule)", background: "var(--mz-bg-card)" }}>
          {furtivo && (
            <div className="mb-2 px-3 py-1.5 rounded-md text-[10.5px] flex items-center gap-2"
              style={{ background: "rgba(217,119,6,0.08)", color: "var(--mz-warn,#d97706)", border: "1px solid rgba(217,119,6,0.18)" }}>
              <Lock size={10}/>
              Modo furtivo: mensagem expira em 60s e nao e armazenada apos leitura.
            </div>
          )}
          {viewUnico && (
            <div className="mb-2 px-3 py-1.5 rounded-md text-[10.5px] flex items-center gap-2"
              style={{ background: "rgba(139,92,246,0.08)", color: "#8b5cf6", border: "1px solid rgba(139,92,246,0.18)" }}>
              <Eye size={10}/>
              Visualizacao unica: mensagem desaparece apos ser lida.
            </div>
          )}
          <div className="flex items-end gap-2">
            <button style={{ padding: "8px", background: "var(--mz-rule)", borderRadius: 8 }}>
              <Paperclip size={12}/>
            </button>
            <textarea
              rows={1}
              placeholder="Escrever mensagem segura..."
              value={inputTexto}
              onChange={e => setInputTexto(e.target.value)}
              onKeyDown={handleKeyDown}
              className="flex-1 resize-none rounded-lg px-3 py-2 text-[12.5px] outline-none"
              style={{ background: "var(--mz-rule)", color: "var(--mz-fg)", minHeight: 36, maxHeight: 100 }}
            />
            <button
              onClick={handleEnviar}
              disabled={enviando || !inputTexto.trim()}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-[12px] font-bold text-white"
              style={{ background: "var(--mz-tenant-primary,#002A7B)", opacity: enviando ? 0.6 : 1 }}>
              <Send size={12}/>{enviando ? "..." : "Enviar"}
            </button>
          </div>
          <div className="flex items-center justify-between mt-2 text-[10px] mz-t-fg-dim">
            <div>Delegado &rarr; {canalSelecionado.nome} · membros vinculados a cerca</div>
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1"><Lock size={9}/>E2E</span>
              <span className="flex items-center gap-1"><Shield size={9}/>Compliance LGPD</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
