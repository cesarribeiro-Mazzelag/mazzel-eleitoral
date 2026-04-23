"use client";

import { useEffect, useRef } from "react";

/**
 * Hook de scroll infinito via IntersectionObserver.
 *
 * Ancora um elemento "sentinela" perto do final da lista. Quando ele
 * entra no viewport, dispara `onCarregarMais`. Padrão low-latency:
 *   - rootMargin 400px: comeca a carregar ANTES de o usuario ver o fim
 *   - threshold 0: dispara assim que a sentinela entra na margem
 *   - desconecta automaticamente quando !temMais ou quando carregando
 *
 * Retorna ref pra plugar no sentinela: <div ref={sentinelaRef} />
 */
export function useInfiniteScroll({
  onCarregarMais,
  temMais,
  carregando,
}: {
  onCarregarMais: () => void;
  temMais: boolean;
  carregando: boolean;
}) {
  const sentinelaRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!sentinelaRef.current || !temMais || carregando) return;

    const obs = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry.isIntersecting) onCarregarMais();
      },
      { rootMargin: "400px", threshold: 0 },
    );

    obs.observe(sentinelaRef.current);
    return () => obs.disconnect();
  }, [onCarregarMais, temMais, carregando]);

  return sentinelaRef;
}
