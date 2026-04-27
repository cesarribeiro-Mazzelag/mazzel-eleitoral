# ETLs pendentes — Plataforma V2 (União Conecta)

Levantamento dos mocks no frontend V2 e o que precisa virar dado real, com fonte sugerida e prioridade. Atualizado em 27/04/2026 após o port da Designer V1.2.

> **Convenção**:
> 🟢 P0 = bloqueia produção · 🟡 P1 = importante · ⚪ P2 = nice-to-have

---

## 1. Centro de Comando (Home / Dashboard Milton — variação C Palantir)

Componente: `components/plataforma-v2/modulos/Home.jsx`

| KPI no card | Hoje | Real precisa | Fonte sugerida | Prioridade |
|---|---|---|---|---|
| Filiados Totais | mock 124.847 | total filiados ativos UB-SP | Banco TSE filiados.csv + pipeline UB-only | 🟢 P0 |
| Comissões Ativas | mock 503/645 | sync diretorios+comissoes_estatutarias | tabela `diretorios_municipais` × `municipios_sp` | 🟢 P0 |
| Score Médio | mock 71.4 | média do `politico_overall_v9` em SP | já existe, agregação simples | 🟡 P1 |
| Receita 30d | mock R$ 4,2M | conta partidária 30d | Tesouraria · Open Banking (pendente) | 🟡 P1 |
| Cabos Ativos | mock 3.412 | tabela cabos_eleitorais com last_seen ≤ 7d | Sprint 5 backend | 🟢 P0 |
| Operações | mock 23 | tabela operações status=ativa | módulo Operações backend novo | 🟢 P0 |
| Eleitos Mandato | **REAL** ✓ | já vem de `/dashboard/visao-geral` | — | OK |
| Emendas Exec. | mock R$ 84M | SIOP API + CGU portal | ETL emendas (ver §5) | 🟡 P1 |
| Mun. em Risco | mock 23 | calc derivado: count(municipios where overall < 50) | trigger no `politico_overall_v9` | 🟡 P1 |
| Nominatas Pend. | mock 142 | tabela nominatas com status=pendente_docusign | DocuSign integration | ⚪ P2 |
| Alertas Críticos | **REAL** ✓ | já vem de `/alertas?severidade=crit` | — | OK |
| Ranking BR | mock "3º" | comparativo entre tenants/partidos | dependência multi-tenant prod | ⚪ P2 |

**Heatmap SP (180 cells)**
- Hoje: aleatório determinístico
- Real: agregar `politico_overall_v9` por município SP, mapear pra cores percentil
- Endpoint: `GET /home/heatmap-sp`
- Prioridade: 🟡 P1

**Feed Operacional Live**
- Hoje: tenta `/admin/auditoria` real, fallback mock
- Real: já funciona quando API responde
- Melhoria: novos eventos (operações.update, cabo.checkin, sigilosa.criada) precisam entrar no auditoria_log

**Ações Executivas (8 botões)**
- Hoje: mock + 2 deep-links reais (Operações, Mapa)
- Real: cada ação aciona API/workflow
- Backend: cada botão é endpoint dedicado + UI modal de confirmação

---

## 2. Módulo Operações (rota nova `/operacoes`)

Componente: `components/plataforma-v2/modulos/Operacoes.jsx`

Hoje mock puro · 6 operações ativas + 2 concluídas. Backend a construir do zero.

**Tabelas necessárias:**
```
operacoes (id, codigo OP-AAAA-NNN, tipo, nome, uf, municipio_id, recorte,
  status [plan|live|alert|done], progresso, lider_id, orcamento, criado_em)
operacoes_metas_kpi (operacao_id, kpi, alvo, atual)
operacoes_eventos (operacao_id, tipo, payload, criado_em)
operacoes_membros (operacao_id, user_id, role)
```

**Endpoints:**
- `GET /operacoes?status=ativas` · lista
- `GET /operacoes/{id}` · dossiê + KPIs
- `POST /operacoes` · wizard (6 passos)
- `POST /operacoes/{id}/eventos` · feed live
- `PATCH /operacoes/{id}/fase` · avançar fase

**Designer:** 4 sub-views (Hub portado · Wizard · Live · Relatório). Wizard/Live/Relatório aguardam backend.

**Prioridade:** 🟢 P0 (módulo novo prometido pra Milton)

---

## 3. Módulo Chat (3 modos)

Componente: `components/plataforma-v2/modulos/Chat.jsx`

Hoje mock puro. Backend `/chat/salas` + `/chat/mensagens` JÁ EXISTE no V1 (verificar status no V2). Falta:

- Integrar WebSocket pra modo Permanente
- **Modo Sigiloso (E2EE)** · Signal Protocol · servidor sem chaves · auto-destruição 24h · print bloqueado · watermark
- **Modo SOS Cabo** · escalada automática (Coord+Jurídico+Seg) + GPS tempo real + sirene + 190 + buddy automático

**Prioridade:** Permanente 🟡 P1 · Sigiloso 🟡 P1 · SOS 🟢 P0 (proteção do cabo em campo)

---

## 4. Módulo Emendas (rota nova `/emendas`)

Componente: `components/plataforma-v2/modulos/Emendas.jsx`

Hoje mock denso (caso central Santa Bárbara d'Oeste · 6 emendas + 6 alertas + regras). Backend a construir.

**Fonte primária:**
- **SIOP** (Sistema Integrado de Planejamento e Orçamento) · API pública
- **Portal CGU** (Controladoria-Geral da União) · execução + nota fiscal
- **TCU** · prestação de contas · cruzar com nominatas

**Pipeline ETL:**
1. Diário: scrape SIOP novas emendas RP-6 + RP-8
2. Diário: scrape CGU pagamentos + notas fiscais associadas
3. Score 0–100 calculado: dimensões (volume vs PIB/pop · autor sem ligação eleitoral · finalidade vaga via NLP · concentração · execução)
4. Detector de cluster (≥3 autores → mesma cidade em 12 meses) → alerta

**Tabelas:**
```
emendas (id_siop, autor_id, municipio_id, valor, valor_pago, rp, categoria,
  finalidade, finalidade_score, score, tier, status, datas)
emendas_alertas (emenda_id, sev, regra_id, criado_em, target_role)
emendas_regras (id, nm, sev, condicao_sql, channels, freq)
```

**Prioridade:** 🟡 P1 (alto valor estratégico mas não bloqueia uso da plataforma)

**Pendências do port:**
- Mapa SVG SP por município (precisa GeoJSON IBGE + d3-geo) — **stub hoje**
- Sankey Fluxo Autor→Categoria→Município (precisa d3-sankey) — **stub hoje**
- Dossiê emenda 8 seções — **stub hoje**

---

## 5. Módulo Saúde de Nominatas

Componente: `components/plataforma-v2/modulos/SaudeNominatas.jsx`

Hoje mock 8 cards SP. Backend novo.

**Score 0–100 por comissão municipal calculado de:**
- Ocupação cadeiras (peso 30%)
- Cota mulheres (mín 30% estatutária — peso 20%)
- Documentação (estatuto, ata convenção, procuração TSE — peso 25%)
- Vagas em aberto há > 30 dias (penalidade)
- Idade média da nominata (renovação — peso 10%)
- CPF duplicado/suspeito (anti-fraude — penalidade severa)
- Filiados ativos vs cadastrados (peso 15%)

**Fonte:**
- TSE filiados.csv + nominatas.csv (anual)
- Estatuto UB Nacional v3.2 (regras de cota)
- DocuSign API (assinatura de membros)

**Endpoints:**
- `GET /nominatas?uf=SP` · lista com score
- `GET /nominatas/{municipio_id}/dossie` · cards + flags + histórico
- `GET /nominatas/alertas` · feed anti-fraude

**Prioridade:** 🟢 P0 (compliance estatutário — risco TSE)

**Pendências do port:**
- Heatmap SP — stub
- Dossiê comissão — stub
- Alertas anti-fraude — stub

---

## 6. Módulo Tesouraria (rota nova `/tesouraria`)

Componente: `components/plataforma-v2/modulos/Tesouraria.jsx`

Hoje mock 4 KPIs + 6 transações. Backend novo.

**Pipeline:**
- Open Banking · API Itaú/BB (OFX import) — **dependência externa cara**
- Categorização IA (Claude · custo por transação) — Estrutura/Operações/Marketing/Jurídico/Doação/Filiação
- Reconciliação extrato vs lançamentos manuais
- Auditoria mensal · prestação TSE anual

**Tabelas:**
```
tes_contas (id, banco, agencia, conta, cnpj, tipo)
tes_transacoes (id, conta_id, data, descricao, valor, categoria_ia, status, doc_anexo)
tes_aprovacoes (transacao_id, aprovador_id, decisao, criado_em)
tes_relatorios_tse (ano, status, hash, prestacao_em)
```

**Prioridade:** 🟡 P1 (essencial mas demora pra integrar Open Banking)

---

## 7. Módulo Diretórios & Comissões (rota nova `/diretorios`)

Componente: `components/plataforma-v2/modulos/Diretorios.jsx`

Hoje mock árvore SP + Mesa Diretora SP capital + 7 comissões + 6 documentos. Backend simples.

**Tabelas:**
```
diretorios (id, nivel [nac|est|mun], uf, municipio_id, mandato_inicio, mandato_fim, status, cnpj, tse_status)
diretorios_membros (diretorio_id, user_id, cargo, ordem)
diretorios_comissoes (id, diretorio_id, nome, tipo, ocupacao_atual, ocupacao_total, prazo)
comissoes_membros (comissao_id, user_id, role, vigente)
documentos_estatutarios (id, diretorio_id, tipo, nome, status, vencimento, hash, docusign_id)
```

**Fonte:** TSE registro partidário (CSV) + cadastro manual no admin.

**Prioridade:** 🟢 P0 (estrutura essencial · base de tudo no estatutário)

---

## 8. Módulo Documentos (rota nova `/documentos`)

Componente: `components/plataforma-v2/modulos/Documentos.jsx`

Hoje mock 4 KPIs + 6 docs. Reutiliza `documentos_estatutarios` da Diretórios.

**Integrações novas:**
- **DocuSign API** · assinatura digital
- OCR Tesseract/AWS Textract · extração de texto pra busca full-text
- S3 storage com criptografia at-rest
- Vencimento alerts (procurações TSE em 60d)

**Prioridade:** 🟡 P1

---

## 9. Módulo IDs · Convites (rota nova `/convites`)

Componente: `components/plataforma-v2/modulos/Convites.jsx`

Hoje mock 4 KPIs + 4 convites. Backend novo.

**Tabelas:**
```
convites (id, para_email, para_whatsapp, perfil_alvo, escopo, expira_em, status, token_hash, enviado_por)
convites_eventos (convite_id, tipo, ip, criado_em)
```

**Integrações:**
- AWS SES (email transacional) ou Sendgrid
- WhatsApp Business API (Meta)
- 2FA TOTP (já existe backend V1 — verificar V2)

**Prioridade:** 🟢 P0 (sem isso, não convida ninguém)

---

## 10. Já reais hoje (não tocar)

| Módulo | Endpoint | Status |
|---|---|---|
| `/dashboard/visao-geral` | 4 KPIs reais (Eleitos / Candidatos / Cobertura / Receita) | ✓ |
| `/dossies` | 70k políticos backfilled em `politico_overall_v9` | ✓ |
| `/dossie/{id}` | dossiê completo + lazy warmup | ✓ |
| `/mapa/*` | drill-down 5 níveis · todos cargos · fotos · X9 | ✓ |
| `/alertas` | central de alertas (CRUD) | ✓ |
| `/liderancas` | CRUD completo | ✓ |
| `/admin/usuarios` `/admin/auditoria` | RBAC + audit feed | ✓ |
| `/ia/chat` | Claude API integrada | ✓ |
| `/meu-painel/resumo` | portal pessoal político | ✓ |

---

## Pendência crítica de tenant (do STATUS_DADOS_V2.md)

Hoje a plataforma exibe **todos os candidatos** do TSE (~1M). Em produção, o tenant `uniao-brasil` deve filtrar **apenas dados UB**:

- `/dossies` → só candidatos UB (filiação atual + predecessores DEM-25 e PSL-17)
- Mapa Eleitoral · modo "UB-only" (visão de comando) vs "geral" (inteligência competitiva)
- Multi-tenant futuro · cada tenant vê seus + opcionalmente "ver adversários" liberado em módulos certos (Radar, Saúde Nominatas adversárias)

**Sprint backend dedicado quando aprovado.**

---

## Pacote sugerido pra próxima sprint backend (P0)

1. **Filtro tenant UB** em `/dossies` + `/dashboard/visao-geral` (passa a contar só UB-SP)
2. **Tabela operações** + endpoint Hub list (alimenta /operacoes/Home KPIs)
3. **Tabela diretorios + membros** + endpoint Hub (alimenta /diretorios)
4. **Tabela convites** + AWS SES + 2FA setup (alimenta /convites)
5. **Tabela cabos_eleitorais** com last_seen (alimenta KPI Cabos Ativos)

Esses 5 + Heatmap SP score (P1) já dão um passo gigante de "mock → real".

---

*Documento gerado a partir do port Designer V1.2 → V2 (27/04/2026). Responsável: Claude Opus + César.*
