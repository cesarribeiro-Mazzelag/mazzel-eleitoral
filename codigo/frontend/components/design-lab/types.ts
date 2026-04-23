/**
 * Design Lab - tipos compartilhados.
 *
 * Cada seção do lab tem um id curto, um título legível e uma lista de
 * variações. Cada variação tem um código (A1, B2, C3...), um nome humano,
 * uma descrição curta, o componente React renderizável e o source code
 * (string) para mostrar no painel de código ao lado.
 */
import type { ComponentType } from "react";

export interface Variant {
  /** Código curto: A1, B2, C3... */
  code: string;
  /** Nome humano da variação */
  name: string;
  /** Descrição curta (1 linha) */
  description: string;
  /** Componente React que renderiza a variação */
  Component: ComponentType;
  /** Source code (JSX bruto) para mostrar no painel de código */
  source: string;
}

export interface Section {
  /** Id curto: tipografia, cores, botoes... */
  id: string;
  /** Letra que prefixa as variações: A, B, C... */
  letter: string;
  /** Título legível */
  title: string;
  /** Subtítulo curto */
  subtitle: string;
  /** Lista de variações desta seção */
  variants: Variant[];
}
