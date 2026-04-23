/**
 * Hooks SWR — Modulo Admin
 * Acesso restrito: apenas PRESIDENTE. API retorna 403 para outros perfis.
 */
"use client";

import useSWR from "swr";
import {
  listarUsuarios,
  listarAuditoria,
  adminKeys,
  type AdminUsuario,
  type AdminAuditResponse,
} from "@/lib/apiAdmin";

const SWR_OPTS = {
  revalidateOnFocus: false,
  keepPreviousData: true,
  shouldRetryOnError: false, // 403 nao deve fazer retry
};

// ---------------------------------------------------------------------------
// useAdminUsuarios — lista todos os usuarios (apenas PRESIDENTE)
// ---------------------------------------------------------------------------

export function useAdminUsuarios() {
  const { data, error, isLoading, mutate } = useSWR<AdminUsuario[]>(
    adminKeys.usuarios,
    () => listarUsuarios(),
    SWR_OPTS
  );

  return {
    usuarios: data ?? [],
    total: data?.length ?? 0,
    isLoading,
    isError: !!error,
    isMock: !isLoading && (!!error || !data || data.length === 0),
    mutate,
  };
}

// ---------------------------------------------------------------------------
// useAdminAudit — log de auditoria (apenas PRESIDENTE)
// ---------------------------------------------------------------------------

export function useAdminAudit(params?: { limit?: number; offset?: number }) {
  const key = adminKeys.auditoria(params);
  const { data, error, isLoading, mutate } = useSWR<AdminAuditResponse>(
    key,
    () => listarAuditoria(params),
    SWR_OPTS
  );

  return {
    logs: data?.items ?? [],
    total: data?.total ?? 0,
    isLoading,
    isError: !!error,
    isMock: !isLoading && (!!error || !data || (data?.items?.length ?? 0) === 0),
    mutate,
  };
}

// ---------------------------------------------------------------------------
// useAdminPapeis — papeis estaticos (sem endpoint dedicado no backend)
// Retorna array vazio para indicar que deve usar mock.
// ---------------------------------------------------------------------------

export function useAdminPapeis() {
  // Backend nao tem endpoint /admin/papeis. Dados sao estaticos na UI.
  return {
    papeis: [],
    isMock: true,
    isLoading: false,
    isError: false,
  };
}
