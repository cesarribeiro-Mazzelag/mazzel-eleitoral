"use client";

import { API } from "../utils";

export function Avatar({ nome, fotoUrl, size = 10 }: {
  nome: string; fotoUrl: string | null; size?: number;
}) {
  const sz = `w-${size} h-${size}`;
  return (
    <div className={`relative ${sz} flex-shrink-0`}>
      <div className={`absolute inset-0 ${sz} rounded-full bg-brand-100 flex items-center justify-center text-sm font-bold text-brand-700`}>
        {nome[0]}
      </div>
      {fotoUrl && (
        <img
          src={`${API}${fotoUrl}`}
          alt={nome}
          className={`absolute inset-0 ${sz} rounded-full object-cover object-top border-2 border-gray-100`}
          onError={(ev) => { (ev.target as HTMLImageElement).style.display = "none"; }}
        />
      )}
    </div>
  );
}
