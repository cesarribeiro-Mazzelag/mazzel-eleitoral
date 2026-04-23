"use client";

import html2canvas from "html2canvas";

/**
 * Gera PNG da carta politica para download/share em redes sociais.
 *
 * @param {HTMLElement} elemento - referencia do DOM do card
 * @param {object} politico - dados do politico pra compor o nome do arquivo
 */
export async function gerarCartaPng(elemento, politico) {
  if (!elemento) return;

  const canvas = await html2canvas(elemento, {
    scale: 3,                 // alta resolucao para rede social
    backgroundColor: "#ffffff",
    logging: false,
    useCORS: true,            // fotos de dominio externo
    allowTaint: false,
  });

  const blob = await new Promise((resolve) =>
    canvas.toBlob(resolve, "image/png", 0.95),
  );
  if (!blob) return;

  const nome = (politico.nome || "carta")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

  const overall = politico.overall ?? 0;
  const nomeArquivo = `carta_${nome}_${overall}.png`;

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nomeArquivo;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
