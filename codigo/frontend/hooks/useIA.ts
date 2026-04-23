/**
 * Hooks SWR — Modulo IA
 */
"use client";

import useSWR from "swr";
import { useCallback, useState } from "react";
import {
  chatIA,
  getSugestoes,
  iaKeys,
  type IASugestoesResponse,
} from "@/lib/apiIA";

const SWR_OPTS = {
  revalidateOnFocus: false,
  keepPreviousData: true,
  shouldRetryOnError: false,
};

// ---------------------------------------------------------------------------
// useIASugestoes — sugestoes personalizadas por perfil
// ---------------------------------------------------------------------------

export function useIASugestoes() {
  const { data, error, isLoading } = useSWR<IASugestoesResponse>(
    iaKeys.sugestoes,
    () => getSugestoes(),
    SWR_OPTS
  );

  return {
    sugestoes: data?.sugestoes ?? [],
    isLoading,
    isError: !!error,
    isMock: !isLoading && (!!error || !data || (data?.sugestoes?.length ?? 0) === 0),
  };
}

// ---------------------------------------------------------------------------
// useIAChat — envia pergunta e acumula historico
// ---------------------------------------------------------------------------

export type MensagemIA = {
  role: "user" | "assistant";
  msg: string;
  t: string;
  citations?: Array<{ ref: string; texto: string }>;
  followup?: string;
};

export function useIAChat(mensagensIniciais: MensagemIA[] = []) {
  const [msgs, setMsgs] = useState<MensagemIA[]>(mensagensIniciais);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const enviar = useCallback(async (pergunta: string) => {
    if (!pergunta.trim()) return;
    const agora = new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

    const msgUsuario: MensagemIA = { role: "user", msg: pergunta, t: agora };
    setMsgs(prev => [...prev, msgUsuario]);
    setLoading(true);
    setErro(null);

    try {
      const historico = msgs.map(m => ({
        role: m.role === "assistant" ? "assistant" : "user",
        content: m.msg,
      }));
      const resp = await chatIA({ pergunta, historico });
      const agoraResp = new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
      const msgIA: MensagemIA = { role: "assistant", msg: resp.resposta, t: agoraResp };
      setMsgs(prev => [...prev, msgIA]);
    } catch (e: unknown) {
      const msgErr = e instanceof Error ? e.message : "Erro ao consultar IA.";
      setErro(msgErr);
      // Adiciona mensagem de erro inline
      const agoraErr = new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
      setMsgs(prev => [...prev, {
        role: "assistant",
        msg: `Erro ao consultar IA: ${msgErr}. Verifique a conexao.`,
        t: agoraErr,
      }]);
    } finally {
      setLoading(false);
    }
  }, [msgs]);

  return { msgs, setMsgs, enviar, loading, erro };
}
