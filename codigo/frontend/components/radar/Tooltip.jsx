"use client";

import { useState, useRef, useCallback, cloneElement, useEffect } from "react";

/**
 * Tooltip com delay de 800ms no hover, posicionado FORA do card
 * (abaixo do trigger, com setinha apontando pra cima).
 *
 * Regras aprendidas (17/04/2026):
 *   - Hover prolongado: nao aparece em passagem casual
 *   - Posicionado fora: nao sobrepoe dados do card
 *   - Esc fecha
 *   - Auto-reposiciona se cortado pelo viewport
 *
 * Uso:
 *   <Tooltip title="OVERALL 97" desc="Nota 0-100 composta..." meta="85+ = dourado">
 *     <div>{children trigger}</div>
 *   </Tooltip>
 */
const DELAY_MS = 800;

export function Tooltip({ title, desc, meta, children, className = "" }) {
  const [aberto, setAberto] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const timerRef = useRef(null);
  const triggerRef = useRef(null);

  const agendar = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      if (triggerRef.current) {
        const r = triggerRef.current.getBoundingClientRect();
        // Posicao absoluta em viewport (vamos renderizar em portal-free via position: fixed)
        const top = r.bottom + 10 + window.scrollY;
        const left = r.left + r.width / 2 + window.scrollX;
        setPos({ top, left });
      }
      setAberto(true);
    }, DELAY_MS);
  }, []);

  const cancelar = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setAberto(false);
  }, []);

  // Esc fecha
  useEffect(() => {
    if (!aberto) return;
    const onKey = (e) => { if (e.key === "Escape") cancelar(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [aberto, cancelar]);

  // Cleanup no unmount
  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  // Clone o child pra injetar handlers e ref
  const child = cloneElement(children, {
    ref: triggerRef,
    onMouseEnter: agendar,
    onMouseLeave: cancelar,
    onFocus: agendar,
    onBlur: cancelar,
  });

  return (
    <>
      {child}
      {aberto && (
        <div
          role="tooltip"
          className={`fixed z-[9999] pointer-events-none ${className}`}
          style={{
            top: pos.top,
            left: pos.left,
            transform: "translateX(-50%)",
          }}
        >
          <div className="relative bg-gray-900 text-white rounded-lg px-3 py-2.5 shadow-2xl w-[260px]">
            <span
              className="absolute w-3 h-3 bg-gray-900 rotate-45"
              style={{ top: -5, left: "50%", marginLeft: -6 }}
            />
            {title && (
              <div className="text-[11px] font-black mb-1 flex items-center gap-1.5">
                {title}
              </div>
            )}
            {desc && <div className="text-[11px] leading-snug text-white/80">{desc}</div>}
            {meta && (
              <div className="mt-1.5 pt-1.5 border-t border-white/15 text-[10px] text-white/55">
                {meta}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
