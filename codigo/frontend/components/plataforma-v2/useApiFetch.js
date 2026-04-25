"use client";

/* Hook generico pra fetch + loading. 401 ja foi tratado no fetchJson (redirect /login). */

import { useEffect, useState } from "react";

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
        setStatus("error");
        setErrorMsg(msg);
        setData(fallback);
      });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { data, status, errorMsg };
}

export function StatusBanner() {
  return null;
}
