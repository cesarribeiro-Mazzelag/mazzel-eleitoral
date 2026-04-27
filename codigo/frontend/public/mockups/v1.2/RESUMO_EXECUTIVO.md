# Mazzel Eleitoral · Resumo Executivo

> Plataforma SaaS de gestão político-partidária. Tenant inicial **União Brasil-SP**.
> Esta entrega cobre 4 fases (F1 Fundação · F2 Dossiês · F3 Operação · F4 Estatutário) em **16 telas hi-fi**, todas alinhadas a um único sistema de design (`F1-fundacao/tokens.css`).

---

## Estado da entrega · Lote 3 · 27 abr 2026

| Lote | Escopo | Status |
|------|--------|--------|
| **L1** | F1 Fundação + F2 Dossiês + F3 Operação + F4 Estatutário base (1.0) | ✅ entregue |
| **L1A–D** | Light/Dark persistido · Mapa Estratégico 3 modos · placeholder mapa Dossiê | ✅ entregue |
| **L2 · Sigiloso** | **Módulo Emendas** (5 componentes em 1 tela) | ✅ entregue |
| **L3 · Sigiloso** | **Saúde das Nominatas** (5 abas internas em 1 tela) | ✅ entregue |
| **L4** | Tweaks fine-tuning + auditoria pós-handoff | a iniciar |

---

## L2 · Módulo Emendas (F3.4) · sigiloso

**Problema.** Emendas parlamentares são o vetor mais opaco da política orçamentária; conhecer fluxo, padrinho e execução é vantagem estratégica decisiva.

**Solução em 5 abas:**
1. **Mapa de Emendas SP** — heat por município, 645 munis, drill-down clicável
2. **Dossiê da Emenda** — 9 seções, caso âncora **Santa Bárbara d'Oeste · score 92** (estrutura/intensidade/redes)
3. **Fluxo Sankey** — origem (autor) → destino (prefeitura/orgão), com massa = R$
4. **Painel de Inconsistências** — 8 regras de consistência (NF × empenho × pagamento × execução)
5. **Sistema de Alertas** — push/email/whatsapp · 12 regras configuradas

**Topbar Milton-CEO** com 3 perguntas-chave em ≤3s ("quem mais executou no meu raio?", "onde estão minhas emendas paradas?", "que prefeituras estão fora do padrão?").

**RBAC** restrito (Pres. Estadual + Jurídico). Linguagem neutra ("padrão atípico"), nunca acusatória.

---

## L3 · Saúde das Nominatas (F4.7) · sigiloso

**Problema.** Em 645 comissões municipais SP, identificar quais estão saudáveis × atenção × críticas antes da janela de registro de candidaturas. Risco-chave: nominatas inviáveis indeferidas pelo TSE no último minuto.

**Solução em 5 abas:**
1. **Hexágono Score** — 7 sub-medidas ponderadas (paridade · faixa etária · vinculação territorial · experiência · conformidade documental · ativação de base · histórico eleitoral). Nota 0–100. Tier verde/amarelo/vermelho.
2. **Heatmap SP** — 18 amostras + 3 destaques pulsantes (Bauru/Marília/Tatuí). Drill clica e abre micro-dossiê.
3. **Ranking** — 3 cards comparativos lado a lado + tabela amostral ordenada.
4. **Dossiê Comissão** — caso âncora **Tatuí · score 30 · diligência aberta**. 7 seções: identificação, sub-medidas, sinalizações, **pulso de filiação** (412 filiações em 1 dia · 21× a média móvel), cronologia, conformidade jurídica, recomendações Mazzel.
5. **Alertas Anti-Fraude** — 6 alertas ativos · 6 regras configuradas · 3 níveis (crítico/alto/médio). Linguagem **estritamente neutra**: "padrão atípico detectado", "concentração de origem geográfica", "filiação em pulso". Nunca "fraude" ou "crime".

**3 casos âncora calibrados** para validação do método:
- **Bauru · score 87 · saudável** (paridade 92, vinculação 95, conformidade 96 — sem sinalizações)
- **Marília · score 69 · atenção** (cota gênero 25% < 30% legal, 2 fichas pendentes)
- **Tatuí · score 30 · crítica** (pulso anômalo, 9/22 sem domicílio local, prestação TSE em mora 4 meses, 4 fichas pendentes, cota 18%)

---

## Sistema transversal (resumo)

- **A · Tokens** — `F1-fundacao/tokens.css` é fonte única. Trocar `data-tenant` no <html> = trocar partido.
- **B · Tipografia** — Bebas Neue (display/dados grandes) + Inter (UI) + JetBrains Mono (audit/IDs).
- **C · Sidebar** — 10 perfis condicionais sobre o mesmo shell.
- **D · Dossiê** — 8 cargos × seções priorizadas dinamicamente (motor único).
- **E · Chat** — 3 modos com identidade visual = base legal (permanente · sigiloso · ronda).
- **F · Tema** — Light/Dark persistido em localStorage, aplicado em todas as 16 telas via `theme-bootstrap.js`.
- **G · Topbar Milton-CEO** — em telas sigilosas: 3 perguntas críticas em ≤3s.

---

## Métricas

| KPI | Valor |
|-----|-------|
| Telas hi-fi navegáveis | **16** |
| Variações (cargos × modos × abas) | **38** |
| Perfis na sidebar condicional | **10** |
| Cargos suportados no dossiê | **8 + fallback** |
| Tenants suportados | **UB + N (via tokens)** |
| Linhas de design (CSS+HTML+JS inline) | **~5k** |

---

## Próximos passos sugeridos (L4)

1. **Tweaks fine-tuning** — expor controles de paleta/densidade/cargo em telas hi-fi para validação rápida com Milton.
2. **Handoff Claude Code** — package técnico para os engenheiros (specs, tokens, componentes). Skill `Handoff to Claude Code` disponível.
3. **Audit trail** — telas sigilosas (Emendas + Saúde Nominatas) precisam de log de quem viu o quê, quando — abordagem já mapeada nos data layers.
4. **Conexão de dados reais** — substituir mocks por integrações (TSE, Receita, CNJ, base de filiados, base de emendas SIOP).
5. **Versão mobile** — atualmente todas as 16 telas são desktop-first 1440px+. Avaliar prioridade do mobile para campo (Comando + Chat + alertas).

---

*Mazzel Eleitoral · 27 abr 2026 · Lote 3 fechado*
