"use client";

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell,
} from "recharts";
import type { DossieEleicao } from "@/lib/types";

interface Props {
  dados: DossieEleicao[];
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-200 rounded-xl px-3 py-2 shadow-lg text-xs">
      <p className="font-semibold text-gray-700">{label}</p>
      <p className="text-uniao-azul font-bold">
        {payload[0].value?.toLocaleString("pt-BR")} votos
      </p>
    </div>
  );
};

export function GraficoEvolucaoVotos({ dados }: Props) {
  const ordenados = [...dados].sort((a, b) => a.ano - b.ano);

  return (
    <div>
      <h4 className="font-semibold text-gray-800 mb-3 flex items-center gap-2 text-sm">
        <span className="w-1 h-5 bg-uniao-azul rounded-full inline-block" />
        Evolução de Votos
      </h4>
      <ResponsiveContainer width="100%" height={160}>
        <BarChart data={ordenados} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
          <XAxis
            dataKey="ano"
            tick={{ fontSize: 11, fill: "#6b7280" }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 10, fill: "#9ca3af" }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v) => (v != null ? Number(v).toLocaleString("pt-BR") : "")}
          />
          <Tooltip content={<CustomTooltip />} />
          <Bar dataKey="votos" radius={[6, 6, 0, 0]}>
            {ordenados.map((entry, i) => (
              <Cell
                key={i}
                fill={entry.eleito ? "#2441B2" : "#93c5fd"}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <p className="text-xs text-gray-400 text-center mt-1">
        Azul escuro = eleito · Azul claro = não eleito
      </p>
    </div>
  );
}
