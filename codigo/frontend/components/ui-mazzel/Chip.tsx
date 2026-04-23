"use client";

import React from "react";

type ChipVariant = "blue" | "green" | "amber" | "red" | "muted" | "purple";

interface ChipProps {
  children: React.ReactNode;
  variant?: ChipVariant;
  dot?: string; // cor CSS para o dot (ex: "#002A7B")
  className?: string;
  style?: React.CSSProperties;
}

/**
 * Chip - badge compacto uppercase.
 * Portado de platform-theme.css para componente TSX.
 * Variantes via classe CSS mz-chip-*.
 */
export function Chip({
  children,
  variant = "muted",
  dot,
  className = "",
  style,
}: ChipProps) {
  return (
    <span
      className={`mz-chip mz-chip-${variant} ${className}`}
      style={style}
    >
      {dot && (
        <span
          className="mz-chip-dot"
          style={{ background: dot }}
        />
      )}
      {children}
    </span>
  );
}
