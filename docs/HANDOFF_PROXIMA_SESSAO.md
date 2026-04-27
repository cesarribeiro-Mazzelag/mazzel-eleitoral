# Handoff pra próxima sessão Claude Code

> **Encerrar esta sessão** porque acumulei erros sistemáticos por perder contexto. Este doc + `REGUA_DESIGNER_V12.md` é o que próxima sessão precisa ler **antes de tocar em qualquer linha de código**.
>
> Atualizado em 27/04/2026.

---

## A. Princípio inegociável

**Designer desenha, Claude Code coda 1:1.** Sem inventar nome de perfil, item, label, grupo, valor de tipografia, caso âncora ou linguagem.

Antes de portar qualquer módulo:
1. Ler o mockup HTML inteiro (`public/mockups/v1.2/F*/`) + `.data.js` + `.app.js` se houver
2. Copiar tipografia (font-size/weight/letter-spacing/line-height) **valor por valor**
3. Copiar casos âncora calibrados pelo Designer
4. Copiar linguagem (telas sigilosas = neutra; CEO = direto; cabo = 1 ação por tela)
5. Validar abrindo mockup do Designer e port lado a lado antes de marcar como pronto

---

## B. Mockups do Designer (16 telas hi-fi)

Base: `codigo/frontend/public/mockups/v1.2/`

| # | Arquivo | Status do meu port |
|---|---|---|
| F1.1 | `F1-fundacao/01-login-ub.html` | ⚠️ Portado · tipografia não auditada vs mockup |
| F1.2 | `F1-fundacao/02-sidebar-condicional.html` | ✅ Refeito 1:1 (10 perfis canônicos · sidebars.js) |
| F2.1 | `F2-nucleo/01-dashboard-milton-3v.html` | ⚠️ **Variação A** corrigida (eu fiz C primeiro errado) · validar tipografia |
| F2.2 | `F2-nucleo/02-cartinha-2v.html` | ❌ Não portado |
| F2.3 | `F2-nucleo/03-dossie-8cargos.html` | ❌ Não portado (Dossies V2 atual é V1) |
| F3.1 | `F3-modulos/01-mapa-estrategico.html` | ❌ **Não portado · prioridade alta** (Cesar reclamou) |
| F3.2 | `F3-modulos/02-modulo-operacoes.html` | ⚠️ Hub portado · Wizard/Live/Relatório stub |
| F3.3 | `F3-modulos/03-chat-evoluido.html` | ⚠️ 3 modos portados · faltam salas áudio + watermark + visualização única |
| F3.4 | `F3-modulos/04-modulo-emendas.html` (+ data + app .js) | ⚠️ Inconsistências/Alertas portados · faltam topbar Milton-CEO + Mapa SVG SP + Sankey + Dossiê |
| F4.1 | `F4-estatutario/01-diretorios-comissoes.html` | ⚠️ Hero/Mesa/Comissões/Documentos portados · 4 abas (Comissões/Atas/Atos/Histórico) stub |
| F4.2 | `F4-estatutario/02-filiados.html` | ❌ Não tocado · /afiliados V2 atual é V1 |
| F4.3 | `F4-estatutario/03-documentos.html` | ⚠️ Portado · falta side-r preview do documento |
| F4.4 | `F4-estatutario/04-tesouraria.html` | ⚠️ Portado raso · 605 linhas Designer não auditadas |
| F4.5 | `F4-estatutario/05-painel-pessoal-politico.html` | ❌ Não tocado · `/portal` V2 atual é V1 |
| F4.6 | `F4-estatutario/06-ids-convites.html` | ⚠️ Wizard 3 passos OK · layout left-nav não auditado |
| F4.7 | `F4-estatutario/07-saude-nominatas.html` (+ data + app .js) | ✅ **Refeito 1:1** (casos Bauru/Marília/Tatuí · 7 sub-medidas · 5 abas · linguagem neutra) |

---

## C. Decisões estruturantes (Obsidian + docs/)

Ler **antes** de tocar em qualquer módulo:

### Sessão 25/04 noite (`docs/perfis_e_paineis.md` + `docs/anderson_milton_briefing.md`)
1. **Sidebar derivada de perfil** (cargo+nível+escopo) · não é menu universal filtrado · 10 perfis canônicos exatos
2. **Painel Pessoal Político = Agente de Inteligência** cross-tenant
3. **Operações** substitui "Campanha 2026" como nome canônico
4. **Chat Discord-style** (permanente · sigiloso · SOS) com salas áudio + watermark + visualização única
5. **Overall em toda hierarquia** (não só candidato)
6. **Continuidade institucional** (histórico vinculado ao cargo+região, não pessoa)
7. **Portabilidade de perfil** (político é dono do dado pessoal; partido é dono da estratégia)
8. **Sistema IDs Discord-style** com wizard 3 passos
9. **Cabo Eleitoral** integrado em Operações · sem item próprio na sidebar dos superiores · mobile-first com bottom-tabs

Perfis canônicos V1 (Designer): `mazzel-super`, `admin-tenant`, `pres-nac`, `pres-est` (Milton Leite, cliente real), `pres-mun`, `tesou`, `secgeral`, `eleito`, `gabinete`, `cabo`. **Coord Regional/Territorial e Candidato e Filiado ficaram FORA da V1** (linhas 537-543 do mockup 02-sidebar-condicional.html).

### Sessão 27/04 (`docs/modulo_emendas.md` + `docs/api_sgip_descoberta.md` + `docs/etl_sgip_spec.md`)
1. **Módulo Emendas** novo · 5 componentes · linguagem neutra · RBAC restrito · caso âncora Santa Bárbara d'Oeste score 92
2. **Saúde das Nominatas** evolução de Diretórios · 7 sub-medidas · casos Bauru/Marília/Tatuí
3. **SGIP3 TSE** = fonte canônica das nominatas · API pública sem auth · spec completo em `etl_sgip_spec.md` (1814 linhas)
4. **Mapa Estratégico com 3 Modos pré-configurados** (Saúde Operacional / Fluxo Dinheiro / Compliance) · NÃO é toggles livres
5. **Bug Mapa no Dossiê** a corrigir · heatmap quadriculado precisa virar mapa geográfico real
6. **Tema Light + Dark** · Designer entregou só Dark · enquadrar como completude do contrato

### Mapa Eleitoral (`docs/mapa_eleitoral_evolucao.md`)
- Mantém componente `MapaEleitoral.tsx` (3196 linhas) na rota `/mazzel-preview/mapa` · drill-down 5 níveis está aprovado
- **3 Modos pré-configurados** com camadas combinadas
- Camadas: Lideranças ativas · Eleitos atuais · Emendas executadas · Score Overall consolidado · Operações ativas · Adversários · Filiados novos
- Modo comparativo (split view, fade temporal, diff map)

---

## D. Estado de cada módulo no V2

### ✅ Pronto e fiel ao Designer
- **Sidebar** 1:1 (`sidebars.js` + `Sidebar.jsx`) — 10 perfis canônicos
- **Saúde Nominatas** 1:1 (`SaudeNominatas.jsx` + dados em `data.js`) — 5 abas funcionais

### ⚠️ Portado parcialmente (precisa auditoria + complemento)
- **Home** (Variação A Linear) — tipografia recém-corrigida, **Cesar nunca validou no browser**
- **Operações Hub** — Wizard/Live/Relatório stub
- **Chat** — 3 modos OK, falta Discord-style completo
- **Emendas** — Inconsistências/Alertas OK, falta Topbar Milton-CEO + Mapa SVG SP + Sankey
- **Diretórios** — Hero+Mesa+Comissões+Documentos OK, 4 abas stub
- **Documentos** — KPIs+lista OK, sem side-r preview
- **Tesouraria** — KPIs+transações OK, layout não auditado
- **Convites** — Wizard 3 passos + IDs Discord-style OK, layout não auditado vs mockup
- **Login** — funcional, tipografia não auditada

### ❌ Não portado (mockup do Designer ignorado)
- **Cartinha 4:5** (F2.2) — card político 4:5 estilo Instagram
- **Dossiê 8 cargos** (F2.3) — substituiria Dossies V1 atual
- **Mapa Estratégico** (F3.1) — **prioridade alta · Cesar reclamou** · 3 modos pré-configurados
- **Filiados upgrade** (F4.2) — substituiria /afiliados V1 atual
- **Painel Pessoal Político** (F4.5) — Agente de Inteligência cross-tenant

---

## E. Infra atual

- **Tunnel Cloudflare ao vivo:** `https://kay-academic-sizes-feb.trycloudflare.com` (ephemeral, pode mudar)
- **Backend:** porta 8002, Docker `ub_backend`, `ub_postgres`, `ub_redis` (todos UP)
- **Frontend:** Next.js dev na porta 3003 (path `/Users/cesarribeiro/projetos/uniao-brasil-v2/codigo/frontend/`)
- **Default role:** `pres-est` (Milton Leite) · default tenant: `uniao` · default theme: `light` *(Cesar 27/04)*
- **Switcher de perfis** no topbar permite alternar entre os 10 perfis Designer

---

## F. Erros recorrentes da sessão anterior (não repetir)

1. ❌ Inventar perfis (`coord_regional`, `coord_territorial`, `candidato`) que Designer deixou fora — **Designer escreveu literalmente nas linhas 537-543**
2. ❌ Inventar casos âncora genéricos (SP/Campinas/Santos) em vez dos calibrados (Bauru/Marília/Tatuí, Santa Bárbara, Rafael Rodrigues)
3. ❌ Usar pesos de fonte errados (font-bold 700 onde Designer pede 800; tracking 0.10em onde pede 0.08em)
4. ❌ Aplicar Bebas Neue como `font-display` global quando só vai em contextos específicos
5. ❌ Escrever "Reportar fraude" em telas sigilosas (linguagem deve ser **neutra**: "padrão atípico", "diligência aberta")
6. ❌ Variação errada do dashboard (fiz Palantir C; Cesar pediu Linear A)
7. ❌ Ignorar Mapa Estratégico (mockup `01-mapa-estrategico.html` nunca foi aberto)
8. ❌ Tema Light como default ignorando que Designer entregou só Dark
9. ❌ Marcar tarefa como pronta sem abrir mockup + port lado a lado

---

## G. Plano sugerido para próxima sessão (ordem)

### Ordem A · auditoria (continuar onde parei)
1. **Mapa Estratégico** (F3.1) — portar 3 modos pré-configurados · prioridade alta
2. **Emendas** — completar topbar Milton-CEO + Mapa SVG SP + Sankey + Dossiê
3. **Cartinha 4:5** (F2.2) — card 4:5 com 4 tiers
4. **Dossiê 8 cargos** (F2.3) — substituir Dossies V1
5. **Painel Pessoal Político** (F4.5) — Agente de Inteligência
6. **Filiados upgrade** (F4.2) — 5 abas + side-r dossiê
7. **Chat completar** — salas áudio + watermark + visualização única
8. **Operações** — Wizard 6 passos + Live + Relatório
9. **Diretórios** — 4 abas pendentes
10. **Tesouraria + Documentos + Convites + Login** — auditoria fina vs mockup

### Ordem B · backend ETL SGIP3 (paralelo, sessão dedicada recomendada)
- Migration tabelas SGIP3 (`tse_partido`, `tse_uf`, `tse_municipio_codigo`, `orgao_partidario`, `orgao_partidario_membro`, etc)
- Crawler base (`backend/app/etl/sgip3/crawler.py`) com rate limiter — código exemplo em `etl_sgip_spec.md` linhas 1199-1368
- Backfill 1 partido (UNIAO) como teste
- Cruzamento com políticos existentes
- Algoritmo de saúde

---

## H. Como validar (toda task)

```bash
# 1. Smoke test rotas frontend
for r in "" mapa dossies operacoes emendas chat diretorios documentos tesouraria saude-nominatas convites alertas portal ia liderancas filiados delegados aliancas estudo agenda; do
  c=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:3003/mazzel-preview/$r")
  echo "${r:-home}=$c"
done

# 2. Pre-warm pra latência cair
for r in "" mapa dossies operacoes emendas chat diretorios documentos tesouraria saude-nominatas convites alertas portal ia liderancas filiados delegados aliancas estudo agenda; do
  curl -s -o /dev/null "http://localhost:3003/mazzel-preview/$r" &
done; wait

# 3. Conferir conteúdo renderizado vs mockup
curl -s http://localhost:3003/mazzel-preview/saude-nominatas | grep -oE "Bauru|Marília|Tatuí|diligência aberta"
```

---

## I. Memórias críticas no Obsidian/Cérebro

- `project_uniao_brasil_briefing_designer_2026_04_25b.md` — sessão 25/04 noite (9 decisões estruturantes)
- `project_uniao_brasil_anderson_emendas_sgip_2026_04_27.md` — sessão 27/04 (Emendas + SGIP)
- `project_uniao_brasil_versoes.md` — branches preservada vs v2-dev
- `project_uniao_brasil_mapa_plano.md` — plano completo do Mapa
- `feedback_engineering_discipline.md` — zona protegida + mapeamento antes de alterar
- `feedback_ask_dont_guess.md` — com dúvida, perguntar
- `feedback_referencias_g1_antes_de_codar.md` — Mapa mira G1

---

*Próxima sessão começa lendo este doc + `REGUA_DESIGNER_V12.md` + `BRIEFING_CLAUDE_DESIGNER.md` antes de qualquer linha de código.*
