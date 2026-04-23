"use client";

import React from "react";

type TraitTier = "gold" | "silver";

interface TraitBadgeProps {
  label: string;
  tier?: TraitTier;
  className?: string;
}

/**
 * TraitBadge - badge de trait político (Fenômeno, Campeão, Lenda, etc).
 * Portado de theme.css (.trait-gold / .trait-silver) para componente TSX.
 */
export function TraitBadge({ label, tier = "silver", className = "" }: TraitBadgeProps) {
  return (
    <span
      className={`mz-chip mz-trait-${tier} ${className}`}
      style={{
        height: 20,
        fontSize: 9.5,
        padding: "0 6px",
        borderRadius: 3,
        textTransform: "uppercase",
        letterSpacing: "0.06em",
        fontWeight: 700,
      }}
    >
      {label}
    </span>
  );
}
