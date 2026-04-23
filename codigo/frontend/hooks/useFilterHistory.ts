"use client";

import { useState, useCallback, useRef, useEffect } from "react";

/**
 * Hook de historico de estado com undo/redo (Cmd+Z / Cmd+Shift+Z).
 *
 * Em memoria, nao persiste. Ideal para filtros que o usuario
 * experimenta - voltar ao estado anterior sem perder trabalho.
 *
 * Low-latency by design: push/undo/redo sao O(1).
 */
export function useFilterHistory<T>(inicial: T, maxSize = 30) {
  const [stack, setStack] = useState<T[]>([inicial]);
  const [cursor, setCursor] = useState(0);
  const isNavegandoRef = useRef(false);

  const atual = stack[cursor];

  const push = useCallback((novo: T) => {
    if (isNavegandoRef.current) {
      isNavegandoRef.current = false;
      return;
    }
    setStack((prev) => {
      const truncado = prev.slice(0, cursor + 1);
      const proximo = [...truncado, novo];
      if (proximo.length > maxSize) proximo.shift();
      return proximo;
    });
    setCursor((c) => Math.min(c + 1, maxSize - 1));
  }, [cursor, maxSize]);

  const undo = useCallback(() => {
    setCursor((c) => {
      const novo = Math.max(0, c - 1);
      if (novo !== c) isNavegandoRef.current = true;
      return novo;
    });
  }, []);

  const redo = useCallback(() => {
    setCursor((c) => {
      const novo = Math.min(stack.length - 1, c + 1);
      if (novo !== c) isNavegandoRef.current = true;
      return novo;
    });
  }, [stack.length]);

  const canUndo = cursor > 0;
  const canRedo = cursor < stack.length - 1;

  // Atalhos de teclado: Cmd+Z / Cmd+Shift+Z
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      if (!mod) return;
      const tgt = e.target as HTMLElement;
      if (tgt && ["INPUT", "TEXTAREA"].includes(tgt.tagName)) return;

      if (e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        undo();
      } else if ((e.key === "z" && e.shiftKey) || e.key === "y") {
        e.preventDefault();
        redo();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [undo, redo]);

  return { estado: atual, push, undo, redo, canUndo, canRedo };
}
