# Perfis e Painéis — Universo completo da plataforma

Mapa total de **quem usa a plataforma**, **o que cada um vê** e **o que cada um pode fazer**. Documento estruturante pra Designer construir as sidebars condicionais e pra Claude Code modelar o RBAC.

> Decisão registrada em 25/04/2026 (sessão César). Substitui qualquer mapeamento parcial anterior.

---

## Princípio organizador

A plataforma cobre **4 camadas** de usuários, cada uma com responsabilidade e escopo distintos:

```
Camada 1 — Mazzel (técnica/operacional, white-label)
Camada 2 — Política Partidária (institucional)
Camada 3 — Eletiva (políticos + equipes de gabinete)
Camada 4 — Operacional de Campanha (cascata de execução)
```

Cada perfil tem **sidebar própria** (não é menu acordeão filtrado — é sidebar derivada do perfil real). Ninguém vê item que não usa.

---

## Camada 1 — Mazzel

### Super Admin Mazzel

- **Quem é:** equipe Mazzel (César + tech).
- **Escopo:** TODOS os tenants (UB, futuros partidos, demos).
- **Painel:** dashboard meta, billing, infra, white-labels, métricas de uso por tenant, logs.
- **Sidebar:** Tenants · Billing · Infra · Logs · Suporte · Configurações white-label · Auditoria global.

### Admin do Partido (time de tecnologia que opera UM tenant)

- **Quem é:** equipe de tecnologia do partido. **NÃO é político** — é operacional.
- **Escopo:** todo o tenant do partido (UB, por exemplo).
- **Painel:** gestão de usuários, atribuição de perfis, configuração de módulos, monitoramento, integração com TSE/DocuSign, customização visual dentro do white-label.
- **Sidebar:** Usuários · Permissões · Configurações · Integrações · Auditoria · Suporte · Branding.

---

## Camada 2 — Política Partidária

### Presidente do Partido

- **Quem é:** eleito no Diretório Nacional.
- **Escopo:** tudo do partido. Equivalente político ao Admin (mas pelo lado institucional, não técnico).
- **Painel "executivo":** dashboard nacional CEO-style — 3 perguntas em 3 segundos (como está? o que mudou? o que decidir?).
- **Sidebar:** Dashboard Nacional · Diretórios (drilldown) · Operações Nacionais · Mapa Estratégico · Radar Político · Dossiês (todos políticos do partido) · Estudo · Documentos · Tesouraria Consolidada · Alertas Críticos · Equipe Nacional.

### Diretório Nacional (8 cargos × nominata)

Comissão Executiva Nacional. Cada cargo tem painel específico.

| Cargo | Sidebar (foco operacional) |
|-------|----------------------------|
| **Presidente Nacional** | Igual ao "Presidente do Partido" acima — é o mesmo perfil |
| **Vice-Presidente** | Igual ao Presidente em leitura. Pode propor e executar designado pelo Presidente |
| **Secretário-Geral** | Documentos · Diretórios · Atas · Comunicação Interna · Calendário · Filiados |
| **Secretário-Adjunto** | Mesmo do Sec-Geral, escopo delegável |
| **Tesoureiro Nacional** | Tesouraria · Prestação Contas TSE · Doações · Despesas · Patrimônio · Relatórios financeiros |
| **Tesoureiro Adjunto** | Mesmo do Tesoureiro |
| **Membros (n)** | Dashboard Nacional (leitura) · Documentos públicos · Atas · Calendário |

### Diretório Estadual (8 cargos × nominata × 27 UFs)

Mesma estrutura, escopo restrito à UF. Exemplo: Milton Leite ocupa **Presidente Estadual SP** e vê tudo do estado.

| Cargo | Sidebar |
|-------|---------|
| **Presidente Estadual** | Dashboard SP · Diretório Estadual SP · Comissões Municipais SP (drilldown 645) · Operações SP · Mapa Estratégico SP · Mapa Eleitoral SP (no Estudo) · Dossiês políticos UB SP · Lideranças e Coordenadores SP · Filiados SP · Documentos SP · Tesouraria SP · Alertas SP · Equipe Estadual |
| **Vice-Presidente Estadual** | Igual ao Presidente em leitura. Substitui em operações designadas |
| **Secretário-Geral Estadual** | Documentos SP · Comissões Municipais · Atas · Filiados · Calendário Estadual |
| **Secretário-Adjunto Estadual** | Idem com escopo delegável |
| **Tesoureiro Estadual** | Tesouraria SP · Prestação Contas TSE-SP · Doações · Despesas · Relatórios financeiros estaduais |
| **Tesoureiro Adjunto Estadual** | Idem |
| **Membros Estaduais (n)** | Dashboard SP (leitura) · Documentos públicos · Atas · Calendário |

### Diretório Municipal (8 cargos × nominata × ~5.570 municípios)

Mesma estrutura, escopo restrito ao município.

| Cargo | Sidebar |
|-------|---------|
| **Presidente Municipal** | Dashboard município · Comissão Municipal (sua nominata) · Operações Municipais · Mapa Estratégico Município · Filiados Município · Cabos Eleitorais · Documentos · Tesouraria Municipal · Alertas · Equipe Municipal |
| **Vice / Secretários / Tesoureiros / Membros** | Estrutura espelhada do nível Estadual com escopo município |

**Total potencial de cargos administrativos partidários:**  
8 × (1 Nacional + 27 Estaduais + 5.570 Municipais) ≈ **44.800 cargos** — cada um com painel.

---

## Camada 3 — Eletiva

7 cargos eletivos, cada um com **painel pessoal** + **equipe de gabinete**.

### Painel Pessoal do Político (princípio "agente de inteligência política pessoal")

Quando o político (ou alguém da equipe dele) entra na plataforma, vê o **estado-maior pessoal**:

| Bloco | Conteúdo |
|-------|----------|
| **Cenário Político** | Radar dinâmico — timeline ao vivo (mídia, votações, judicial, mudanças de partido, oportunidades) filtrado pra relevância dele |
| **Meu Dossiê** | Próprio dossiê — Overall, sub-medidas v9, comparativo com pares do mesmo cargo, evolução temporal |
| **Agenda** | Calendário pessoal/oficial + agenda pública (eventos, sessões, audiências, atos partidários) |
| **Alianças** | Mapa das alianças atuais + sugestões IA + alertas (aliado se moveu, rival se enfraqueceu) |
| **Lideranças da minha região** | Quem são os caciques na minha UF/município (todos partidos) — radar partidário local |
| **Estudo Político** | Análises temáticas, panorama nacional, emendas, demografia eleitoral |
| **Clipping** | Mídia espontânea sobre ele (positivas/negativas, alcance, sentiment) — alimenta MID do Overall |
| **Bancada / Votações** (parlamentares) | O que está pra votar, como votou histórico, orientação partidária, comparativo |
| **Atendimento à base** (executivos / vereadores) | Demandas recebidas, status, custo político de não atender |
| **Operações em mim** | Campanhas onde ELE é o objetivo (alguém criou campanha "agendar reunião com fulano" — ele vê quem está pra visitar e quando) |
| **Equipe** | Quem do gabinete tem acesso a quê |

### Sidebar específica por cargo eletivo

| Cargo | Sidebar foco |
|-------|---|
| **Presidente da República** | Painel pessoal completo + Visão de Estado (políticas públicas, Congresso, STF, agenda internacional) + Bancada governista |
| **Governador** | Painel pessoal completo + Estado (secretarias, obras, ALESP, relação com prefeituras) |
| **Senador** | Painel pessoal completo + Senado (CCJ/CAE/CAS, votações nominais, relatorias, comissões) + Bancada UF |
| **Deputado Federal** | Painel pessoal completo + Câmara (comissões, projetos, votações, emendas) + Bancada UF |
| **Deputado Estadual** | Painel pessoal completo + Assembleia (comissões, projetos, votações estaduais) + Bancada UF |
| **Prefeito** | Painel pessoal completo + Município (secretarias, obras, câmara municipal, demandas) |
| **Vereador** | Painel pessoal completo + Câmara Municipal (comissões, projetos, votações) + Atendimento à base |

### Equipe de Gabinete (estruturada com tipos canônicos + Outro)

**Cadastro compartilhado:** político E chefe de gabinete podem adicionar/remover membros.

| Tipo de cargo | Permissões automáticas | Quantidade típica |
|---------------|------------------------|---|
| **Chefe de Gabinete** | Acesso quase total ao painel do político (exceto deletar conta). Designa permissões dos demais membros | 1 |
| **Assessor de Comunicação** | Clipping · Mídia · Agenda Pública · Alimenta blocos MID do Overall | 1-3 |
| **Assessor Jurídico** | Módulo Jurídico do dossiê · Alertas processos · Documentos jurídicos | 1-2 |
| **Assessor de Articulação Política** | Alianças · Lideranças · Operações que o político recebe · Cenário Político | 1-2 |
| **Assessor Parlamentar** (parlamentares) | Bancada · Votações · Comissões · Projetos · Pauta legislativa | 1-3 |
| **Assessor de Base / Atendimento** (executivos + vereadores) | Atendimento à base · Demandas · Eventos territoriais | 1-5 |
| **Outro / Personalizado** | Permissões definidas manualmente pelo chefe de gabinete | livre |

**Score de saúde do gabinete** (sugestão futura): completude da equipe entra como sub-medida no Overall do político (gabinete completo → político performa melhor).

---

## Camada 4 — Operacional de Campanha (cascata)

Esses perfis ativam quando entra **período de Operações de Campanha** — seja eleitoral, seja de cobertura territorial diária.

| Perfil | Designado por | Escopo | Sidebar mobile-first |
|--------|---------------|--------|----------------------|
| **Coordenador Regional** | Presidente Estadual | Conjunto de municípios numa região | Operações da região · Mapa Estratégico região · Coord Territoriais sob ele · Cabos · Metas · Relatórios |
| **Coordenador Territorial** | Coord Regional | Conjunto de bairros/zonas num município | Operações do território · Mapa território · Cabos sob ele · Metas · Relatórios |
| **Cabo Eleitoral** | Coord Territorial | Microterritório (rua, bairro, raio) | Tela única: Agenda do dia · Mapa da área · Chat · Comando de campo · Metas semana · Registro rápido |

**Modos do Cabo:**
- **Autônomo:** check-in GPS ele mesmo
- **Validado:** sem smartphone — coordenador valida presença

---

## Filiado (perfil base)

Toda pessoa filiada ao UB tem acesso mínimo:

| Perfil | Sidebar |
|--------|---------|
| **Filiado** | Meu Cadastro · Diretório onde estou vinculado · Documentos pessoais · Eventos do partido na minha região · Cartilha (estatuto + programa) |

---

## Tabela-resumo de quantidade de perfis

| Camada | Tipos de perfil | Volume potencial |
|--------|-----------------|---|
| 1. Mazzel | 2 | ~10-50 pessoas |
| 2. Política Partidária | 8 cargos × 3 níveis | ~44.800 cargos partidários |
| 3. Eletiva | 7 cargos × ~6+ membros gabinete | ~65k políticos × média 5 = ~325k pessoas |
| 4. Operacional | 3 níveis cascata | variável (campanhas ativas) |
| Filiado base | 1 | milhões |

**Total estimado de perfis distintos no produto:** ~100+ combinações possíveis (cargo × nível × escopo).

---

## Como o Designer deve abordar

1. **NÃO desenhar 100 sidebars** — desenhar componente `<Sidebar perfil={p}>` que renderiza items condicionalmente
2. **Definir grupos visuais** comuns: "Operação", "Gestão", "Análise", "Configuração" — cada item da sidebar pertence a um grupo
3. **3 a 8 itens por perfil** — nunca mais. Se passar, agrupar em sub-menu colapsável
4. **Mobile-first pra Cabo Eleitoral** — tela única, sem sidebar tradicional
5. **Wizard de cadastro de perfil** — quando Admin do Partido cria usuário, wizard pergunta: cargo? nível? escopo? → automaticamente atribui sidebar correta

---

---

## Adições 27/04/2026 — Módulo Emendas + Saúde Nominatas

### Módulo Emendas (RBAC restrito)

Detalhe em `docs/modulo_emendas.md`. Resumo do RBAC:

| Perfil | Acesso ao módulo Emendas |
|--------|--------------------------|
| Super Admin Mazzel, Pres Nacional | Total |
| Pres Estadual / Vice-Pres | Sua UF |
| Pres Municipal / Vice-Pres | Seu município |
| Tesoureiros (todos níveis) | Emendas + financeiro do nível |
| Político eleito parlamentar | Suas próprias emendas |
| Equipe de Gabinete | Acessa apenas se Chefe + Político autorizou |
| Secretários, Membros de Comissão, Coords, Cabos, Filiados | Não veem |

### Saúde da Nominata (evolução do módulo Diretórios)

Detalhe em `docs/api_sgip_descoberta.md`. Cruzamento automático SGIP3 TSE × atividade da plataforma → score de saúde por Comissão. **Dirigentes do PRÓPRIO tenant** seguem RBAC normal (Pres vê tudo do escopo). **Dirigentes de OUTROS partidos** (inteligência competitiva) só visíveis pra Pres Nacional + Pres Estaduais.

### Painel de Compliance (cruzamento Emendas + Nominatas)

Visível pro Pres Estadual e Pres Nacional. Combina:
- Cidades com nominata fraca recebendo emendas altas → bandeira vermelha
- Cidades com nominata forte mas zero emenda → "estamos perdendo aqui"
- Cidades com nominata forte e emendas coerentes → ✓ verde

Aparece como **Modo "Compliance"** do Mapa Estratégico (ver `docs/mapa_eleitoral_evolucao.md`).

---

## Decisões registradas relacionadas

- [[Decisao - Perfis RBAC e Cabo Eleitoral Cascata]] (16/04) — base original de 9 perfis
- [[Decisao - Migracao para mazzel-preview pos reuniao 2026-04-25]] — V2 é a versão definitiva
- `docs/UB_estrutura_partidaria.md` — nominata + ficha de filiação UB
- `docs/anderson_milton_briefing.md` — Milton = Pres Estadual SP (caso real)
- `docs/principio_portabilidade_perfil.md` — separação dado pessoal vs estratégico do partido
- `docs/modulo_operacoes.md` — onde a cascata operacional entra em ação
- `docs/modulo_emendas.md` — controle financeiro + auditoria + alertas
- `docs/api_sgip_descoberta.md` — fonte oficial das nominatas (SGIP3 TSE)
- `docs/mapa_eleitoral_evolucao.md` — 3 Modos do Mapa Estratégico
