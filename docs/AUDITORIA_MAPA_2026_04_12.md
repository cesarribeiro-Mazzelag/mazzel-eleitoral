# Auditoria ponta a ponta — Mapa Eleitoral (12/04/2026)

**Relacionado ao item P-A4 do plano mestre** (`~/.claude/plans/reflective-popping-cocoa.md`).

Este documento registra o que foi modificado na sessão de 12/04/2026 (noite), o que passou em verificação automática e o que precisa de validação manual no browser antes de considerar "entregue".

---

## 1. Itens entregues nesta sessão

| # | Item | Arquivos tocados |
|---|------|------------------|
| P-A1 | Documento `PESQUISA_SIDEBAR_NAVEGACAO.md` gravado (regra arquitetural + 496 linhas do agente) | `docs/PESQUISA_SIDEBAR_NAVEGACAO.md` |
| 5 / P0.1 | Escala 5-0 vertical com labels semânticos | `frontend/components/map/BarraLateral.tsx` (LegendaSelecao) |
| 17 / P-B2 / P0.2 | Candidato persiste ao trocar de nível (não é mais limpo em `irParaEstado`/`voltarParaBrasil`); filter de cargo só limpa candidato quando o cargo diverge | `frontend/components/map/MapaEleitoral.tsx` (linhas ~973, ~1208, ~1220) |
| 16 / P-B3 / P0.3 | Componente `ConteudoCandidato` novo com 3 views (Brasil/Estado/Município) | `frontend/components/map/BarraLateral.tsx` |
| 6 / P-B1 / P0.4 | KPIs padronizados 4 cards em `ConteudoEstado` (Eleitos, Votos, Cargos, Partidos) e `ConteudoPartido` nível estado (Eleitos, Votos, Municípios, Cargos) | `frontend/components/map/BarraLateral.tsx` |
| 18 / P-C3 | `LegendaCity` unificada com escala 6 níveis (5-0) e labels semânticos (antes 4 níveis) | `frontend/components/map/MapaEleitoral.tsx` (LegendaCity) |
| 14 / P-A2 + P-C4 | Polígonos dos bairros OSM via ST_Union dos setores IBGE; pin roxo removido | `backend/app/api/v1/endpoints/mapa.py` (endpoint `microregioes` com `poligono=true` default); `frontend/components/map/MapaEleitoral.tsx` (camada fill/outline/label no modoMicroRegioes) |
| 2 / P-C1 | Toolbar-breadcrumb persistente no topo-esquerdo (Brasil / Estado / Município) com clique para voltar níveis | `frontend/components/map/MapaEleitoral.tsx` (substituiu botão "Voltar" simples) |
| 3 / P-C2 | "Ver pontos de votação": botão na cidade/bairro + ativação automática ao clicar num bairro | já existia; confirmado |
| 7 / P-A3 | Sidebar por partido como navegação alternativa: novo endpoint `/mapa/estado/{uf}/partido/{numero}/cidades` + render de lista clicável no `ConteudoPartido` nível estado + callback `onClickMunicipio` no `BarraLateral` | `backend/app/api/v1/endpoints/mapa.py` (endpoint novo); `frontend/components/map/BarraLateral.tsx` + `MapaEleitoral.tsx` |
| 15 | **Regra arquitetural de filtros compartilhados** documentada como zona protegida no topo do documento de pesquisa e no plano mestre | `docs/PESQUISA_SIDEBAR_NAVEGACAO.md` seção 0; `~/.claude/plans/reflective-popping-cocoa.md` |

---

## 2. Verificações automáticas realizadas

| Check | Resultado |
|-------|-----------|
| `npx tsc --noEmit --skipLibCheck` (frontend) | ✅ zero erros de código (apenas 2 warnings de deprecation no `tsconfig.json`, não-bloqueantes) |
| `docker restart ub_backend` + `GET /health` | ✅ HTTP 200 |
| Logs backend após restart | ✅ sem exceptions |

---

## 3. Checklist de validação manual no browser (Cesar)

### 3.1. Escala 5-0 vertical (item 5)
- [ ] Selecionar qualquer partido no mapa
- [ ] Verificar que a **legenda lateral** (na sidebar, quando filtrado) aparece vertical com **5 no topo** ("Domínio absoluto") e **0 na base** ("Sem presença")
- [ ] Verificar que todos os 6 níveis têm label semântico ao lado

### 3.2. LegendaCity unificada (item 18)
- [ ] Entrar num município (ex: São Paulo)
- [ ] Ativar modo "Bairros"
- [ ] Verificar que a legenda "POR BAIRRO" no canto inferior esquerdo tem **6 níveis** (antes tinha 4): Domínio absoluto / Zona forte / Competitivo favorável / Competitivo desfavorável / Zona fraca / Sem presença
- [ ] Labels semânticos consistentes com a sidebar

### 3.3. Candidato persiste ao navegar (item 17) — teste crítico
- [ ] Filtrar **Tarcísio** (candidato GOVERNADOR SP 2022)
- [ ] Navegar pra Brasil → voltar pra SP → descer pra SP capital
- [ ] Em **cada um dos 3 níveis**, Tarcísio deve continuar filtrado e as informações da sidebar devem ser relativas a ele
- [ ] Abrir debug overlay e verificar que `candidato_id` permanece setado

### 3.4. ConteudoCandidato (item 16)
- [ ] Com Tarcísio filtrado, em Brasil: sidebar mostra "Base de Tarcísio" + top estados onde teve votos
- [ ] Em SP: sidebar mostra top municípios + reduto
- [ ] Em SP capital: sidebar mostra top bairros

### 3.5. KPIs 4 cards padronizados (item 6)
- [ ] Em qualquer estado (sem filtro): sidebar mostra 4 cards (Eleitos, Votos, Cargos, Partidos)
- [ ] Em qualquer estado com partido filtrado: sidebar mostra 4 cards (Eleitos, Votos, Municípios, Cargos)
- [ ] Nenhum `Conteudo*` com apenas 1 card

### 3.6. Polígonos dos bairros OSM (itens 14 + P-A2)
- [ ] Em SP capital, modo "Bairros"
- [ ] Verificar que os bairros aparecem como **polígonos roxos com contorno** (não como pins redondos)
- [ ] Verificar que o nome do bairro aparece no centro do polígono
- [ ] Bairros sem polígono ainda aparecem como pin (fallback)

### 3.7. Toolbar-breadcrumb persistente (item 2)
- [ ] Topo-esquerdo do mapa sempre mostra: `📍 Brasil [> Estado [> Município]]`
- [ ] Clicar em "Brasil" volta pra nível Brasil (habilitado só quando não está no Brasil)
- [ ] Clicar no nome do Estado volta pra nível Estado (habilitado só quando não está no Estado)
- [ ] Nome do município só aparece quando está no município (não é clicável, é o atual)

### 3.8. Sidebar por partido como navegação (item 7 / P-A3)
- [ ] Em SP, filtrar um partido (ex: PT)
- [ ] Abaixo dos KPIs aparece o bloco "**Cidades com eleitos · N**" com lista clicável
- [ ] Clicar numa cidade navega para o município (o mapa zooma + sidebar troca contexto)

### 3.9. Regra de filtros compartilhados (item 15)
- [ ] Trocar cargo no topo: candidato só é limpo se o cargo do candidato for diferente do novo cargo
- [ ] Trocar estado: candidato persiste
- [ ] Voltar pra Brasil: candidato persiste
- [ ] Nenhum componente volta ao estado default enquanto o filtro está ativo

---

## 4. Pendências fora do escopo desta sessão

- **Gráfico principal contextual** (P1.1 do plano antigo): série temporal / mapa de calor / barras empilhadas conforme o modo
- **Lista ranqueada top 5 + "ver todos"** (P1.2)
- **Seletor de modo explícito** (P1.4): botões Partido / Candidato / Cargo no topo da sidebar
- **Insight IA no rodapé** (P2.1)
- **Drawer expandível estilo ESRI** (P2.2)
- **Heatmap overlay secundário** (P2.3)

---

## 5. Referência cruzada

- Plano mestre completo: `~/.claude/plans/reflective-popping-cocoa.md`
- Pesquisa de sidebar (regra arquitetural + matriz KPIs): `docs/PESQUISA_SIDEBAR_NAVEGACAO.md`
- Plano do agente de pesquisa (fonte das 496 linhas): `~/.claude/plans/reflective-popping-cocoa-agent-a78fe148ebd461982.md`
- Conversa compactada: `~/.claude/projects/-Users-cesarribeiro/d4e29981-af5c-4d43-8808-892708a0a80f.jsonl`

---

**Autor:** sessão Cesar + assistente, 12/04/2026 (noite), imediatamente após a recuperação do plano pré-compactação.
