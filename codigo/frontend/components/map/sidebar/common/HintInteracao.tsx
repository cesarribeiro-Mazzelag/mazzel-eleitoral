"use client";

// ── Hint de interacao ───────────────────────────────────────────────────────

export function HintInteracao({ texto }: { texto: string }) {
  return (
    <div className="px-3 py-1 bg-gray-50 border-b border-gray-100 flex-shrink-0">
      <p className="text-[9px] text-gray-400">{texto}</p>
    </div>
  );
}
