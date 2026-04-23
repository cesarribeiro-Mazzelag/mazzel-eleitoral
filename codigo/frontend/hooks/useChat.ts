/**
 * Hooks SWR — Modulo Chat Sigiloso
 *
 * Polling de 3s nas mensagens da sala ativa (refreshInterval).
 * isMock: true quando API retorna vazio ou falha — componente exibe badge "demo".
 */
"use client";

import useSWR from "swr";
import { useCallback, useState } from "react";
import {
  listarSalas,
  getSala,
  listarMensagens,
  enviarMensagem,
  deletarMensagem,
  addParticipante,
  removerParticipante,
  marcarLida,
  chatKeys,
  decifrarTexto,
  type ChatSala,
  type ChatSalaDetail,
  type ChatMensagem,
  type ChatParticipante,
  type EnviarMensagemPayload,
  type ChatParticipanteCreate,
} from "@/lib/apiChat";

const SWR_OPTS = {
  revalidateOnFocus: false,
  keepPreviousData: true,
};

// ---------------------------------------------------------------------------
// useChatSalas — lista salas do usuario, com filtro opcional por campanha
// ---------------------------------------------------------------------------

export function useChatSalas(campanhaId?: string) {
  const key = chatKeys.salas(campanhaId);
  const { data, error, isLoading, mutate } = useSWR(
    key,
    () => listarSalas(campanhaId),
    SWR_OPTS
  );

  const salas: ChatSala[] = data?.salas ?? [];
  const totalNaoLidas = salas.reduce((acc: number) => acc, 0); // salas nao traz nao_lidas, usa getSala

  return {
    salas,
    total: data?.total ?? 0,
    totalNaoLidas,
    isLoading,
    isError: !!error,
    isMock: !isLoading && (!!error || salas.length === 0),
    mutate,
  };
}

// ---------------------------------------------------------------------------
// useChatSala — detalhe de uma sala (participantes + nao_lidas)
// ---------------------------------------------------------------------------

export function useChatSala(salaId: string | null | undefined) {
  const key = salaId ? chatKeys.sala(salaId) : null;
  const { data, error, isLoading, mutate } = useSWR<ChatSalaDetail>(
    key,
    salaId ? () => getSala(salaId) : null,
    { ...SWR_OPTS, shouldRetryOnError: false }
  );

  return {
    sala: data ?? null,
    participantes: data?.participantes ?? [],
    naoLidas: data?.nao_lidas ?? 0,
    isLoading,
    isError: !!error,
    isMock: !isLoading && (!!error || !data),
    mutate,
  };
}

// ---------------------------------------------------------------------------
// useChatMensagens — mensagens da sala ativa com polling 3s
// Descriptografa conteudo ao retornar.
// ---------------------------------------------------------------------------

export function useChatMensagens(salaId: string | null | undefined) {
  const key = salaId ? chatKeys.mensagens(salaId) : null;
  const { data, error, isLoading, mutate } = useSWR(
    key,
    salaId ? () => listarMensagens(salaId) : null,
    {
      ...SWR_OPTS,
      refreshInterval: 3000, // polling 3s na sala ativa
      shouldRetryOnError: false,
    }
  );

  // Descriptografa e inverte ordem (backend retorna mais recentes primeiro)
  const mensagens: (ChatMensagem & { texto: string })[] = (
    data?.mensagens ?? []
  )
    .slice()
    .reverse()
    .map((m) => ({
      ...m,
      texto: decifrarTexto(m.conteudo_criptografado),
    }));

  return {
    mensagens,
    total: data?.total ?? 0,
    proximoCursor: data?.proximo_cursor ?? null,
    isLoading,
    isError: !!error,
    isMock: !isLoading && (!!error || mensagens.length === 0),
    mutate,
  };
}

// ---------------------------------------------------------------------------
// useEnviarMensagem — mutation para enviar mensagem
// ---------------------------------------------------------------------------

export function useEnviarMensagem(salaId: string | null | undefined) {
  const { mutate } = useChatMensagens(salaId);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const enviar = useCallback(
    async (payload: EnviarMensagemPayload) => {
      if (!salaId) return null;
      setLoading(true);
      setErro(null);
      try {
        const msg = await enviarMensagem(salaId, payload);
        await mutate();
        return msg;
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "Erro ao enviar mensagem.";
        setErro(msg);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [salaId, mutate]
  );

  return { enviar, loading, erro };
}

// ---------------------------------------------------------------------------
// useDeletarMensagem — mutation para apagar mensagem
// ---------------------------------------------------------------------------

export function useDeletarMensagem() {
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const deletar = useCallback(async (mensagemId: string) => {
    setLoading(true);
    setErro(null);
    try {
      await deletarMensagem(mensagemId);
      return true;
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Erro ao apagar mensagem.";
      setErro(msg);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  return { deletar, loading, erro };
}

// ---------------------------------------------------------------------------
// useAddParticipante — mutation para adicionar participante (moderador)
// ---------------------------------------------------------------------------

export function useAddParticipante(salaId: string | null | undefined) {
  const { mutate } = useChatSala(salaId);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const adicionar = useCallback(
    async (payload: ChatParticipanteCreate): Promise<ChatParticipante | null> => {
      if (!salaId) return null;
      setLoading(true);
      setErro(null);
      try {
        const result = await addParticipante(salaId, payload);
        await mutate();
        return result;
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "Erro ao adicionar participante.";
        setErro(msg);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [salaId, mutate]
  );

  return { adicionar, loading, erro };
}

// ---------------------------------------------------------------------------
// useRemoverParticipante — mutation para remover participante
// ---------------------------------------------------------------------------

export function useRemoverParticipante(salaId: string | null | undefined) {
  const { mutate } = useChatSala(salaId);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const remover = useCallback(
    async (usuarioId: number) => {
      if (!salaId) return false;
      setLoading(true);
      setErro(null);
      try {
        await removerParticipante(salaId, usuarioId);
        await mutate();
        return true;
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "Erro ao remover participante.";
        setErro(msg);
        return false;
      } finally {
        setLoading(false);
      }
    },
    [salaId, mutate]
  );

  return { remover, loading, erro };
}

// ---------------------------------------------------------------------------
// useMarcarLida — mutation para marcar mensagem como lida
// ---------------------------------------------------------------------------

export function useMarcarLida() {
  const marcar = useCallback(async (mensagemId: string) => {
    try {
      return await marcarLida(mensagemId);
    } catch {
      return null;
    }
  }, []);

  return { marcar };
}
