"use client";

/**
 * Divider - linha separadora usando token de regra do design system.
 * Portado de platform/primitives.jsx para TSX.
 */
export function Divider() {
  return (
    <div
      className="h-px"
      style={{ background: "var(--mz-rule)" }}
    />
  );
}
