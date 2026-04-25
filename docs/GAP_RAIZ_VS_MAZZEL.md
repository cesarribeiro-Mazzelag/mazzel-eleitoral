# Gap: Rotas Raiz vs. mazzel-preview

Gerado em: 24/04/2026

Legenda de status:
- **Portado** = componente real (nao Placeholder)
- **Placeholder** = rota existe mas o componente e so um stub descritivo
- **Ausente** = rota nao existe em mazzel-preview

---

## Tabela principal

| Rota raiz | Descricao | Tem em mazzel-preview? | Prioridade port | Observacao |
|---|---|---|---|---|
| `/dashboard` | Painel de inteligencia nacional — KPIs eleitorais por ciclo (2022/2024) | Ausente (home e diferente) | ALTA | Home da nova e `/mazzel-preview` com componente `Home`; o dashboard de KPIs nao foi portado |
| `/mapa` | Mapa eleitoral interativo com farol, sidebar por nivel e tooltips ricos | Portado | - | `/mazzel-preview/mapa` usa componente `Mapa.jsx` real |
| `/radar` | Hub Radar Politico — 4 tabs: Partidos, Politicos, Analise, Em destaque | Portado | - | `/mazzel-preview/radar` usa componente `Radar` real |
| `/delegados` | Gestao de delegados por estado e zona eleitoral (RBAC Presidente/Diretoria/Delegado) | Portado | - | `/mazzel-preview/delegados` usa componente `Delegados` real |
| `/filiados` | Cadastro e validacao de filiados (CPF + Titulo de eleitor) | Portado | - | `/mazzel-preview/filiados` usa componente `Filiados` real |
| `/alertas` | Central de alertas e notificacoes eleitorais | Portado | - | `/mazzel-preview/alertas` usa componente `Alertas` real |
| `/liderancas` | Rede territorial de liderancas — score, status, zonas, coordenador | Placeholder | ALTA | `/mazzel-preview/liderancas` existe mas e Placeholder; conteudo real esta na raiz |
| `/relatorios` | Exportacao de relatorios PDF/CSV (eleicoes, emendas, alertas) | Placeholder | MEDIA | `/mazzel-preview/relatorios` existe mas e Placeholder |
| `/glossario` | Definicoes de indicadores, metricas e fontes de dados da plataforma | Placeholder | BAIXA | `/mazzel-preview/glossario` existe mas e Placeholder |
| `/admin` | Painel administrativo — gestao de usuarios, permissoes, logs | Portado | - | `/mazzel-preview/admin` usa componente `Admin` real |
| `/coordenadores` | Gestao de coordenadores e seus territorios (~50 municipios cada) | Ausente | ALTA | Nenhuma rota equivalente em mazzel-preview |
| `/cabos` | Gestao de cabos eleitorais — agentes de campo com performance por votos TSE | Ausente | ALTA | `/mazzel-preview/cabo` existe mas e estrutura de sub-rotas (agenda/area/metas/registro), nao e o mesmo modulo da raiz |
| `/suplentes` | Banco de reservas — candidatos nao eleitos ordenados por proximidade de assumir vaga | Ausente | MEDIA | Nenhuma rota equivalente em mazzel-preview |
| `/politicos` | Redirect para `/radar` (alias legado desde 11/04/2026) | Ausente | BAIXA | Alias descartavel — nao precisa portar |
| `/meu-dossie` | Visualizacao e download do dossie proprio do politico logado | Ausente | ALTA | Parcialmente coberto por `/mazzel-preview/dossies` (lista geral), mas o self-service nao existe |
| `/meu-painel` | Painel individual do politico — numeros proprios, metas, status | Ausente | ALTA | Nenhuma rota equivalente em mazzel-preview |
| `/meus-votos` | Distribuicao geografica dos votos do politico logado por municipio | Ausente | MEDIA | Poderia ser secao dentro de `/meu-painel` na nova |
| `/configuracoes` | Configuracoes de conta — nome, email, senha, 2FA | Ausente | MEDIA | Provavelmente ira para perfil/settings no layout da nova |
| `/mapa-google` | Versao experimental do mapa usando Google Maps API | Ausente | BAIXA | Prototipo/experimento; nao faz parte do produto |
| `/mapa-v2` | Redirect para `/mapa` (alias legado desde 11/04/2026) | Ausente | BAIXA | Alias descartavel — nao precisa portar |
| `/design-lab` | Showroom de elementos visuais — usuario escolhe variantes de UI para todo o produto | Ausente | BAIXA | Ferramenta interna de UX; nao e funcionalidade de usuario final |
| `/funcionarios` | Pasta vazia (sem page.jsx) | Ausente | BAIXA | Modulo nunca implementado; ignorar por enquanto |

---

## Modulos da nova SEM equivalente na raiz

Estes modulos existem em `/mazzel-preview/*` mas NAO tem par na raiz (`/`). Sao features novas da v2:

| Rota mazzel-preview | Descricao | Componente |
|---|---|---|
| `/mazzel-preview` (home) | Pagina inicial da nova plataforma com resumo e acesso rapido | `Home` (real) |
| `/mazzel-preview/dossies` | Lista e busca de dossies de politicos com sancionados/alertas | `Dossies` (real) |
| `/mazzel-preview/campanha` | Modulo Campanha 2026 — pessoas, papeis, cascata Delegado-Coord-Cabo | `Campanha` (real) |
| `/mazzel-preview/afiliados` | Modulo Afiliados separado do CRM — gestao e captacao | `Tela9Afiliados` (real) |
| `/mazzel-preview/ia` | Interface de IA com linguagem natural para consultas eleitorais | `IA` (real) |
| `/mazzel-preview/estudo` | Observatorio nacional panoramico — ranking por partido/UF/area | `Estudo` (real) |
| `/mazzel-preview/portal` | Portal do politico — area individual com dados proprios | `Portal` (real) |
| `/mazzel-preview/cabo` | Area do cabo eleitoral — agenda, metas, registro de visitas, area de atuacao | Sub-rotas reais |
| `/mazzel-preview/mandato` | Modulo de mandato — compromissos e estrutura | Sub-rotas reais |
| `/mazzel-preview/agenda` | Calendario de compromissos com integracao futura Google Calendar | Placeholder |
| `/mazzel-preview/aliancas` | Grafo de relacionamentos e historico de coligacoes entre partidos | Placeholder |
| `/mazzel-preview/chat` | Comunicacao sigilosa E2E com modo furtivo e auditoria | Placeholder |
| `/mazzel-preview/super` | Super admin Mazzel — gestao de tenants, feature flags, faturamento | Placeholder |

---

## Resumo executivo

- **Portados e funcionais:** mapa, radar, delegados, filiados, alertas, admin (6 modulos)
- **Existem como Placeholder — precisam de conteudo real:** liderancas, relatorios, glossario (3 modulos)
- **Ausentes na nova — prioridade ALTA:** dashboard (KPIs), coordenadores, cabos (modulo legado), meu-dossie, meu-painel (5 gaps)
- **Ausentes na nova — prioridade MEDIA/BAIXA:** suplentes, meus-votos, configuracoes, aliases legados, ferramentas internas (7 itens, maioria descartavel ou reabsorvivel)
- **Novos na v2 sem par na raiz:** 13 rotas/modulos — sendo 7 com componente real e 6 Placeholder
