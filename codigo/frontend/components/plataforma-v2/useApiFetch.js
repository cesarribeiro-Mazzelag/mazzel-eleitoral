"use client";

/* Hook generico pra fetch + loading + auth + fallback mock. */

import { useEffect, useState } from "react";
import { ApiError } from "./api";

/**
 * @param {() => Promise<any>} fetcher - funcao que faz a request
 * @param {any}  fallback - dado mock exibido quando sem sessao
 * @param {any[]} deps - dependencias do useEffect
 */
export function useApiFetch(fetcher, fallback, deps = []) {
  const [data, setData] = useState(fallback);
  const [status, setStatus] = useState("loading");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    let cancelled = false;
    setStatus("loading");
    Promise.resolve()
      .then(() => fetcher())
      .then((res) => {
        if (cancelled) return;
        setData(res);
        setStatus("ok");
      })
      .catch((err) => {
        if (cancelled) return;
        const msg =
          (err && typeof err.message === "string" && err.message) ||
          (err && typeof err === "string" && err) ||
          "Falha ao carregar dados.";
        if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
          setStatus("unauth");
          setErrorMsg("Sem sessão ativa. Exibindo dados fictícios.");
        } else {
          setStatus("error");
          setErrorMsg(msg);
        }
        setData(fallback);
      });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { data, status, errorMsg };
}

export function StatusBanner({ status, errorMsg }) {
  // Unauth: banner amarelo informativo (usuario precisa logar).
  // Error (network/5xx): silencioso - o fallback mock ja funciona.
  if (status !== "unauth") return null;
  return (
    <div
      className="rounded-lg px-4 py-2.5 flex items-center gap-2 text-[12px] mb-4"
      style={{
        background: "rgba(251,191,36,0.08)",
        border: "1px solid rgba(251,191,36,0.35)",
      }}
    >
      <span style={{ color: "var(--warn)" }}>⚠</span>
      <span className="t-fg">{String(errorMsg || "Sem sessão ativa. Exibindo dados fictícios.")}</span>
    </div>
  );
}
