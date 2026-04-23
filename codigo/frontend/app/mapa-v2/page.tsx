import { redirect } from "next/navigation";

/**
 * Alias da URL temporária `/mapa-v2`.
 *
 * Em 11/04/2026 promovemos o Mapa V2 para a rota principal `/mapa`.
 * Mantemos este redirect por 1 release para não quebrar bookmarks/links
 * salvos durante a fase de desenvolvimento. Pode ser deletado depois.
 */
export default function MapaV2Redirect() {
  redirect("/mapa");
}
