"use client";

/**
 * Chat de IA flutuante — disponível em todas as páginas.
 * O agente consulta dados reais do banco via tool use.
 * Acessível para PRESIDENTE e DIRETORIA.
 */

import { useState, useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { MessageSquare, X, Send, Loader2, Sparkles, ChevronDown } from "lucide-react";
import { useMapaStore } from "@/lib/store/mapaStore";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8002";
function tkn() {
  return typeof window !== "undefined" ? (localStorage.getItem("ub_token") ?? "") : "";
}

function MensagemMarkdown({ texto }) {
  // Renderização básica: negrito e quebras de linha
  const html = texto
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/\n/g, "<br/>");
  return <span dangerouslySetInnerHTML={{ __html: html }} />;
}

export function ChatIA() {
  const [aberto, setAberto] = useState(false);
  const [mensagens, setMensagens] = useState([]);
  const [input, setInput] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [sugestoes, setSugestoes] = useState([]);
  const [sugestoesCarregadas, setSugestoesCarregadas] = useState(false);
  const endRef = useRef(null);
  const inputRef = useRef(null);

  // Desloca o botão pra esquerda quando a sidebar do mapa está aberta,
  // senão cobre dados importantes (ranking de partidos). Em outras rotas o botão fica no canto.
  const pathname = usePathname();
  const sidebarState = useMapaStore((s) => s.ui.sidebarState);
  const noMapa = pathname === "/mapa";
  const sidebarAberta = noMapa && sidebarState === "open";
  const rightOffset = sidebarAberta ? "right-[420px]" : "right-6";
  // Sidebar tem 400px abertos + 20px respiro = 420px de offset. Se mudar a largura
  // da sidebar em BarraLateral.tsx (linha do `const width`), ajustar aqui tambem.

  // Carrega sugestões na primeira abertura
  useEffect(() => {
    if (aberto && !sugestoesCarregadas) {
      fetch(`${API}/ia/sugestoes`, { headers: { Authorization: `Bearer ${tkn()}` } })
        .then((r) => r.json())
        .then((d) => { setSugestoes(d.sugestoes ?? []); setSugestoesCarregadas(true); })
        .catch(() => {});
    }
    if (aberto) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [aberto]);

  // Auto-scroll para última mensagem
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [mensagens, carregando]);

  // Histórico para o backend (formato Anthropic)
  function buildHistorico() {
    return mensagens.map((m) => ({
      role: m.role,
      content: m.texto,
    }));
  }

  async function enviar(pergunta) {
    const texto = (pergunta ?? input).trim();
    if (!texto || carregando) return;

    setInput("");
    const novaMensagem = { role: "user", texto, id: Date.now() };
    setMensagens((prev) => [...prev, novaMensagem]);
    setCarregando(true);

    try {
      const r = await fetch(`${API}/ia/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${tkn()}`,
        },
        body: JSON.stringify({
          pergunta: texto,
          historico: buildHistorico(),
        }),
      });

      const data = await r.json();
      setMensagens((prev) => [
        ...prev,
        { role: "assistant", texto: data.resposta ?? "Erro ao processar.", id: Date.now() + 1 },
      ]);
    } catch {
      setMensagens((prev) => [
        ...prev,
        { role: "assistant", texto: "Erro de conexão. Verifique o servidor.", id: Date.now() + 1 },
      ]);
    } finally {
      setCarregando(false);
    }
  }

  function limpar() {
    setMensagens([]);
    setSugestoesCarregadas(false);
  }

  return (
    <>
      {/* Botão flutuante */}
      <button
        onClick={() => setAberto((v) => !v)}
        className={`
          print-hide
          fixed bottom-6 ${rightOffset} z-40 w-12 h-12 rounded-full shadow-xl
          flex items-center justify-center transition-all duration-200
          ${aberto
            ? "bg-gray-700 hover:bg-gray-800"
            : "bg-uniao-azul hover:bg-uniao-azul/90 hover:scale-105"}
        `}
        title="Assistente de Análise"
      >
        {aberto
          ? <X className="w-5 h-5 text-white" />
          : <Sparkles className="w-5 h-5 text-white" />
        }
      </button>

      {/* Painel do chat */}
      {aberto && (
        <div className={`fixed bottom-20 ${rightOffset} z-40 w-[420px] max-h-[600px] bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col overflow-hidden`}>

          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3.5 bg-uniao-azul">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-white/80" />
              <span className="text-white font-semibold text-sm">Análise Eleitoral</span>
              <span className="text-white/50 text-xs">• dados reais</span>
            </div>
            <div className="flex items-center gap-1">
              {mensagens.length > 0 && (
                <button
                  onClick={limpar}
                  className="text-white/60 hover:text-white text-xs px-2 py-1 hover:bg-white/10 rounded transition-colors"
                >
                  Limpar
                </button>
              )}
              <button
                onClick={() => setAberto(false)}
                className="text-white/60 hover:text-white p-1 hover:bg-white/10 rounded transition-colors"
              >
                <ChevronDown className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Corpo das mensagens */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 min-h-0 max-h-96">

            {/* Estado inicial com sugestões */}
            {mensagens.length === 0 && (
              <div className="space-y-3">
                <div className="text-center py-3">
                  <div className="w-12 h-12 rounded-full bg-uniao-azul/10 flex items-center justify-center mx-auto mb-2">
                    <Sparkles className="w-6 h-6 text-uniao-azul" />
                  </div>
                  <p className="text-sm font-semibold text-gray-700">Como posso ajudar?</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Faço consultas em tempo real nos dados eleitorais.
                  </p>
                </div>

                {sugestoes.length > 0 && (
                  <div className="space-y-1.5">
                    <p className="text-xs text-gray-400 font-medium uppercase tracking-wide px-1">
                      Perguntas sugeridas
                    </p>
                    {sugestoes.map((s, i) => (
                      <button
                        key={i}
                        onClick={() => enviar(s)}
                        className="w-full text-left text-xs px-3 py-2.5 rounded-xl border border-gray-200 hover:border-brand-500 hover:bg-brand-50 text-gray-700 hover:text-brand-700 transition-colors"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Mensagens */}
            {mensagens.map((m) => (
              <div
                key={m.id}
                className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`
                    max-w-[85%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed
                    ${m.role === "user"
                      ? "bg-uniao-azul text-white rounded-tr-sm"
                      : "bg-gray-100 text-gray-800 rounded-tl-sm"
                    }
                  `}
                >
                  {m.role === "assistant"
                    ? <MensagemMarkdown texto={m.texto} />
                    : m.texto
                  }
                </div>
              </div>
            ))}

            {/* Indicador de carregamento */}
            {carregando && (
              <div className="flex justify-start">
                <div className="bg-gray-100 px-4 py-3 rounded-2xl rounded-tl-sm flex items-center gap-2">
                  <Loader2 className="w-3.5 h-3.5 text-uniao-azul animate-spin" />
                  <span className="text-xs text-gray-500">Consultando dados...</span>
                </div>
              </div>
            )}

            <div ref={endRef} />
          </div>

          {/* Input */}
          <div className="px-4 py-3 border-t border-gray-100">
            <form
              onSubmit={(e) => { e.preventDefault(); enviar(); }}
              className="flex items-center gap-2"
            >
              <input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Faça uma pergunta sobre os dados..."
                disabled={carregando}
                className="flex-1 text-sm border border-gray-200 rounded-xl px-3.5 py-2.5 outline-none focus:ring-2 focus:ring-uniao-azul/30 focus:border-uniao-azul disabled:opacity-50 bg-gray-50 focus:bg-white transition-colors"
              />
              <button
                type="submit"
                disabled={!input.trim() || carregando}
                className="w-10 h-10 rounded-xl bg-uniao-azul flex items-center justify-center disabled:opacity-40 hover:bg-uniao-azul/90 transition-colors flex-shrink-0"
              >
                <Send className="w-4 h-4 text-white" />
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
