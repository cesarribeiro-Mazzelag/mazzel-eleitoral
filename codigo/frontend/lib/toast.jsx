"use client";
/**
 * Sistema de notificações (Toast)
 * Reaproveitado e adaptado do Jarbis
 */
import { createContext, useContext, useState, useCallback } from "react";
import { CheckCircle, XCircle, AlertTriangle, Info, X } from "lucide-react";

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const toast = useCallback((msg, type = "info", duration = 4000) => {
    const id = Math.random().toString(36).slice(2);
    setToasts((t) => [...t, { id, msg, type }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), duration);
  }, []);

  const remover = (id) => setToasts((t) => t.filter((x) => x.id !== id));

  const ESTILOS = {
    success: {
      bg: "bg-green-50 border-green-200",
      text: "text-green-800",
      icon: <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />,
    },
    error: {
      bg: "bg-red-50 border-red-200",
      text: "text-red-800",
      icon: <XCircle className="w-4 h-4 text-red-600 flex-shrink-0" />,
    },
    warn: {
      bg: "bg-amber-50 border-amber-200",
      text: "text-amber-800",
      icon: <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />,
    },
    info: {
      bg: "bg-blue-50 border-blue-200",
      text: "text-blue-800",
      icon: <Info className="w-4 h-4 text-blue-600 flex-shrink-0" />,
    },
  };

  return (
    <ToastContext.Provider value={toast}>
      {children}

      {/* Container de toasts */}
      <div className="fixed bottom-5 right-5 z-[9999] flex flex-col gap-2 pointer-events-none">
        {toasts.map(({ id, msg, type }) => {
          const e = ESTILOS[type] ?? ESTILOS.info;
          return (
            <div
              key={id}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl border shadow-lg
                         max-w-sm text-sm pointer-events-auto animate-fade-in ${e.bg} ${e.text}`}
            >
              {e.icon}
              <span className="flex-1">{msg}</span>
              <button
                onClick={() => remover(id)}
                className="text-gray-400 hover:text-gray-600 ml-1 flex-shrink-0"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast deve ser usado dentro de ToastProvider");
  return ctx;
}
