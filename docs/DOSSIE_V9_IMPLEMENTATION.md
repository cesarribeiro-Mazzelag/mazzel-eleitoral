# Dossiê v9 - Documento Técnico de Implementação

> Versão: 1.0 | Data: 2026-04-24 | Aprovado por: Cesar Ribeiro
> Escopo: módulo `/mazzel-preview/dossies` (frontend) + backend `dossie.py`
> Pré-leitura obrigatória: `BRIEFING_CLAUDE_DESIGNER.md`, `CLAUDE.md`

Este doc é o guia executável para implementar o redesenho do módulo Dossiê aprovado em 24/04/2026 (tarde). Cada seção é um sprint com escopo, arquivos, critérios de aceitação e riscos.

---

## Sumário executivo

3 sprints encadeados:

| Sprint | Objetivo | Tempo | Bloqueia |
|---|---|---|---|
| **0** | Migrar 3 endpoints Senado descontinuados em 01/02/2026 | 2-4h | Sprint 1 backend e Sprint 2+ |
| **1** | Frontend Dossiê + schema v9 + busca 4 camadas + paginação híbrida | 4-6h | Card emendas + ETLs futuros |
| **2+** | ETLs das 6 sub-medidas faltantes + card emendas + módulo Estudo | sob demanda | - |

**Modelo Overall v9:** 6 dimensões (ATV / LEG / BSE / INF / MID / PAC) × 3 sub-medidas = 18 sub-medidas → 6 → 1.

**Não-objetivos:** OCR de PDF do Senado/Congresso (postergado, ver decisão do Spike DSF), módulo Estudo (futuro), substituição do módulo IA atual.

---

## Sprint 0 - Migração endpoints Senado (urgência operacional)

### Contexto

3 endpoints da API do Senado têm header `Sunset: 2026-02-01` (já venceu). Ainda servem por inércia, podem cair sem aviso. ETLs do Senado todos dependem disso.

### Endpoints afetados

| Endpoint legado | Substituto | Usado em |
|---|---|---|
| `GET /dadosabertos/senador/{cod}/votacoes` | `GET /dadosabertos/votacao?codigoParlamentar={cod}&dataInicio=&dataFim=` (max 60 dias por chamada) | `services/coleta_atividade_parlamentar.py` |
| `GET /dadosabertos/materia/autoria/{codigoMateria}` | `GET /dadosabertos/processo/{idProcesso}` (validar via Swagger - testes superficiais retornaram 404) | ainda não usado em produção |
| `GET /dadosabertos/senador/lista/atual` (mantém) | sem mudança | `services/coleta_atividade_parlamentar.py` |

### Tarefas

1. **Validar substitutos via Swagger oficial:** `https://legis.senado.leg.br/dadosabertos/api-docs/swagger-ui/index.html`. Testar chamadas reais antes de codar.
2. **Adapter pattern em `services/coleta_atividade_parlamentar.py`:**
   - Criar função `_get_senado_votacoes_v2(cod_senador, data_inicio, data_fim)` que usa o endpoint novo `/votacao` em janelas de 60 dias.
   - Manter assinatura compatível com o consumo atual (retornar mesma estrutura de dict que `_get_senado_votacoes_v1` retornava).
   - Feature flag temporário: variável de ambiente `SENADO_API_V2=true` para alternar.
3. **Para autoria:** apenas registrar o substituto identificado no doc. O ETL de autoria ainda não roda - será criado no Sprint 2+ (rede de apoios INF.3).
4. **Smoke test:** rodar `python -m app.cli.coletar_parlamentares --casa senado --senador 4981` e validar que retorna dados consistentes.

### Critérios de aceitação

- [ ] ETL atual `coletar_parlamentares` continua rodando com `SENADO_API_V2=true`
- [ ] Logs mostram queries para `/votacao` em vez de `/senador/{cod}/votacoes`
- [ ] Dados de presença não regridem (validar com snapshot pré/pós migração)
- [ ] Doc inline atualizado com a data da migração e link para o Swagger

### Riscos

- **API substituta com schema diferente:** o JSON do `/votacao` não bate 1:1 com `/senador/{cod}/votacoes`. Adapter precisa normalizar.
- **Limite de 60 dias por chamada:** legislatura inteira (4 anos) precisa de ~24 chamadas paginadas com `PAUSE_S >= 0.15`.
- **Endpoint substituto inexistente confirmado para autoria:** deixar bem documentado para o Sprint 2+ não tropeçar.

---

## Sprint 1 - Frontend Dossiê + Schema v9

### 1.1 Backend - Schema migration

**Arquivo:** `codigo/backend/app/schemas/dossie.py`

**Mudanças:**

- Schema atual `OverallFifa` (8 atributos antigos: VOT/EFI/ART/FID/INT/TER/POT/FIN) **substituir** por:

```python
class OverallV9(BaseModel):
    # 6 dimensões (cada uma com 3 sub-medidas)
    atv: DimensaoSubmedidas  # Atividade
    leg: DimensaoSubmedidas  # Legislativo
    bse: DimensaoSubmedidas  # Base
    inf: DimensaoSubmedidas  # Influência
    mid: DimensaoSubmedidas  # Mídia
    pac: DimensaoSubmedidas  # Pactuação
    
    overall_geral: float | None  # média ponderada das dim com cobertura >=67%
    bonuses: BonusesV9
    traits: list[str]  # arquétipos identificados
    cobertura_pct: float

class DimensaoSubmedidas(BaseModel):
    sub1: float | None
    sub2: float | None
    sub3: float | None
    valor: float | None  # média ponderada (None se cobertura < 67%)
    cobertura: Literal["completa", "parcial", "insuficiente", "em-construcao"]
    pesos: tuple[int, int, int]  # pesos das 3 sub-medidas (variam por cargo)

class BonusesV9(BaseModel):
    cargo_atual: int  # 0 a 8 conforme matriz por cargo
    arquetipo: int  # +5 por arquétipo identificado, -5 se Populista
    recorde_eleitoral: int  # +8 / +5 / +3
    ict: float  # 0 a +5 (z-score territorial)
    inerte: int  # 0 ou -3
    radar: int  # +5 se trait RADAR
```

- **Manter retrocompat:** criar `class OverallFifa(OverallV9)` como alias por 1-2 sprints até frontend migrar, depois remover.

### 1.2 Backend - Matriz de pesos por cargo

**Arquivo:** `codigo/backend/app/services/overall_v9_matriz.py` (criar)

Implementar como dict Python ou tabela SQL os 144 valores da matriz aprovada. Fonte da verdade:
- `04 - Aprendizados/2026-04-24 - Matriz Overall v9 por cargo + arquetipos + nao-eleitos.md` (Obsidian)

```python
# Pesos das 6 dimensões por cargo (somam 100%)
PESOS_DIMENSOES = {
    "PRES": {"ATV": 10, "LEG": 10, "BSE": 25, "INF": 20, "MID": 15, "PAC": 20},
    "GOV":  {"ATV": 10, "LEG": 10, "BSE": 25, "INF": 20, "MID": 15, "PAC": 20},
    "SEN":  {"ATV": 15, "LEG": 25, "BSE": 18, "INF": 22, "MID": 10, "PAC": 10},
    # ... continuar para DEP_FED, DEP_EST, PREF, VER_CAP, VER_INT
}

# Pesos das 3 sub-medidas dentro de cada dimensão por cargo (somam 100% por dim)
PESOS_SUBMEDIDAS = {
    "ATV": {
        "SEN":     (25, 55, 20),  # discursos / comissões / CPIs
        "DEP_FED": (30, 50, 20),
        # ...
    },
    "PAC": {
        "SEN":     (45, 30, 25),  # acordos / base gov / TAXA EMENDAS
        "DEP_FED": (45, 35, 20),  # acordos / base gov / TAXA EMENDAS
        "PRES":    (50, 35, 15),  # acordos / base gov / DIÁLOGO OPOSIÇÃO
        # ...
    },
    # ... ATV, LEG, BSE, INF, MID
}

# Sub-medidas conceituais por categoria de cargo
CONCEITOS_SUBMEDIDAS = {
    "legislativo": {
        "ATV": ("Discursos significativos", "Membro ativo de comissões", "Participação em CPIs"),
        # ...
    },
    "executivo": {
        "ATV": ("Agenda institucional cumprida", "Audiências públicas", "Atos publicados em DOU"),
        # ...
    },
    "nao-eleito": {
        "ATV": ("Eventos partidários", "Comícios e atos militantes", "Reuniões com lideranças"),
        # ...
    },
}
```

### 1.3 Backend - Endpoint de busca `/dossies/search`

**Arquivo:** `codigo/backend/app/routers/dossies.py` (criar ou estender)

Aceita 2 modos de query:

**Modo A - Estruturada** (Camadas 2 e 4):
```
GET /api/v1/dossies/search?cargo=DEP_FED&uf=SP&partido=PT&ordenacao=overall_desc&page=0&size=30
```

**Modo B - Linguagem natural** (Camada 3):
```
POST /api/v1/dossies/search/natural
Body: { "pergunta": "menos votados da região Sul" }
Response: {
  "interpretacao": "Região: Sul (PR/SC/RS) | Ordenação: votos ASC | Limite: 50",
  "filtros_aplicados": { "regiao": "Sul", "ordenacao": "BSE.1_absoluta_asc", "limite": 50 },
  "resultados": [...],
  "total": 1247
}
```

Modo B internamente:
1. Recebe pergunta em português
2. Chama módulo IA (`/mazzel-preview/ia` ou serviço dedicado) para parsear
3. IA devolve filtros estruturados em JSON
4. Endpoint executa Modo A com esses filtros
5. Retorna resultados + interpretação humana

**Schema de filtros aceitos** (mesma estrutura para Modo A e B):

```python
class FiltrosDossie(BaseModel):
    cargo: list[Cargo] | None
    uf: list[str] | None
    regiao: Literal["Norte", "Nordeste", "Sul", "Sudeste", "Centro-Oeste"] | None
    partido: list[str] | None
    ciclo: list[int] | None  # anos de eleição
    status: Literal["eleito", "suplente", "radar"] | None
    arquetipo: list[Literal["Fenomeno", "Trabalhador", "Articulador", "Chefe-de-Base", "Tecnico", "Populista"]] | None
    sancao: bool | None  # tem sanção Onda 1 = True
    cassado: bool | None
    em_exercicio: bool | None
    overall_min: int | None  # 0-100
    overall_max: int | None
    ordenacao: Literal["overall_desc", "overall_asc", "votos_desc", "votos_asc", "nome_asc", "recente"] = "overall_desc"
    page: int = 0
    size: int = 30
```

### 1.4 Frontend - Estrutura de rotas

**Arquivo:** `codigo/frontend/app/mazzel-preview/dossies/page.jsx` (atualmente 5 linhas - reescrever)

**Componentes a criar:**

```
codigo/frontend/components/dossie/
├── DossieHero.jsx                    # Hero limpo (3 opções de texto)
├── DossieSearchBar.jsx               # Barra única (nome + linguagem natural)
├── DossieQuickFilters.jsx            # Chips: cargo/UF/partido/ciclo/status
├── DossiePresets.jsx                 # 20 cartões "Descubra"
├── DossieGrid.jsx                    # Grade virtualizada de cartinhas
├── DossieGridItem.jsx                # Wrapper de CardPolitico para grade
└── DossiePagination.jsx              # "Ver mais (30)" + contador
```

**Página:**

```jsx
// app/mazzel-preview/dossies/page.jsx
export default function DossiesPage() {
  return (
    <main>
      <DossieHero />
      <DossieSearchBar />
      <DossieQuickFilters />
      <DossiePresets />
      <DossieGrid />
      <DossiePagination />
    </main>
  );
}
```

### 1.5 Frontend - Cartinha CardPolitico atualizada

**Arquivo:** `codigo/frontend/components/radar/CardPolitico.jsx` (424 linhas, atualizar siglas)

**Mudanças cirúrgicas (não tocar layout - é zona protegida):**

- Linha 150: comentário trocar `// Stats vem do backend como atributos_6 (VOT/FID/EFI/INT/ART/TER).` → `// Stats vem do backend como overall_v9 (ATV/LEG/BSE/INF/MID/PAC).`
- Linhas 155-160: trocar mapeamento dos 6 atributos:
  ```js
  ATV: fonte.ATV ?? fonte.atv,
  LEG: fonte.LEG ?? fonte.leg,
  BSE: fonte.BSE ?? fonte.bse,
  INF: fonte.INF ?? fonte.inf,
  MID: fonte.MID ?? fonte.mid,
  PAC: fonte.PAC ?? fonte.pac,
  ```
- Linha 351: trocar lista de siglas: `["ATV", "LEG", "BSE", "INF", "MID", "PAC"]`
- Tooltip por sigla mostrando o conceito conforme a categoria do cargo (legislativo/executivo/não-eleito)

### 1.6 Frontend - Dossiê individual com cartinha embarcada

**Arquivo:** `codigo/frontend/app/mazzel-preview/dossies/[id]/page.jsx` (153 linhas, ajustar)

- Manter as 9 seções do template Wagner-completo
- Adicionar slot reservado para a cartinha embarcada do candidato (mesma `CardPolitico` da listagem)
- Posição sugerida: header do dossiê, ao lado de uma coluna de KPIs principais

### 1.7 Frontend - Performance obrigatória

**Stack:**
- `react-virtuoso` ou `react-window` para virtualização da grade
- Intersection Observer nativo para lazy load de fotos do candidato
- React Query (`@tanstack/react-query`) para cache de buscas

**Detalhes:**

```jsx
// DossieGrid.jsx (esqueleto)
import { VirtuosoGrid } from 'react-virtuoso';
import { useInfiniteQuery } from '@tanstack/react-query';

const PAGE_SIZE = 30;
const AUTO_LOAD_LIMIT = 90;  // depois disso, exige clique
const DOM_CAP = 300;

export function DossieGrid({ filtros }) {
  const { data, fetchNextPage, hasNextPage, isFetching } = useInfiniteQuery({
    queryKey: ['dossies', filtros],
    queryFn: ({ pageParam = 0 }) => fetchDossies({ ...filtros, page: pageParam, size: PAGE_SIZE }),
    getNextPageParam: (lastPage, pages) => lastPage.hasMore ? pages.length : undefined,
    staleTime: 5 * 60 * 1000,  // cache 5 min
  });

  const totalLoaded = data?.pages.reduce((acc, p) => acc + p.items.length, 0) ?? 0;
  const requiresManual = totalLoaded >= AUTO_LOAD_LIMIT;

  return (
    <>
      <VirtuosoGrid
        data={items.slice(-DOM_CAP)}  // cap DOM
        itemContent={(idx, candidato) => <DossieGridItem candidato={candidato} />}
        endReached={!requiresManual ? fetchNextPage : undefined}
      />
      <DossiePagination 
        loaded={totalLoaded} 
        hasMore={hasNextPage} 
        onLoadMore={fetchNextPage}
        showButton={requiresManual}
      />
    </>
  );
}
```

### 1.8 Frontend - 20 presets de descoberta

**Arquivo:** `codigo/frontend/components/dossie/DossiePresets.jsx` + `lib/dossiePresets.js`

```js
// lib/dossiePresets.js
export const PRESETS = [
  // Por performance (6)
  { id: 'fenomenos-2022', label: 'Fenômenos Midiáticos 2022', filtros: { arquetipo: ['Fenomeno'], ciclo: [2022] }, icone: '🎤' },
  { id: 'trabalhadores', label: 'Trabalhadores Silenciosos', filtros: { arquetipo: ['Trabalhador'] }, icone: '🛠️' },
  { id: 'articuladores', label: 'Articuladores do Congresso', filtros: { arquetipo: ['Articulador'], cargo: ['SEN', 'DEP_FED'] }, icone: '🤝' },
  { id: 'chefes-base', label: 'Chefes de Base Nacional', filtros: { arquetipo: ['Chefe-de-Base'] }, icone: '🏘️' },
  { id: 'radar', label: 'RADAR - Talentos em Ascensão', filtros: { status: 'radar' }, icone: '📡' },
  { id: 'tecnicos', label: 'Técnicos-legisladores', filtros: { arquetipo: ['Tecnico'] }, icone: '📚' },
  // Por recorde eleitoral (3)
  { id: 'mais-votados-br', label: 'Mais Votados do Brasil', filtros: { ordenacao: 'votos_desc', limite: 20 }, icone: '🏆' },
  { id: 'feras-regionais', label: 'Feras Regionais', filtros: { trait: 'FERA_REGIONAL' }, icone: '🦁' },
  { id: 'top5-nacional', label: 'Top 5 Nacional do Ciclo', filtros: { trait: 'ELITE_NACIONAL' }, icone: '⭐' },
  // Por situação (4)
  { id: 'suplentes', label: 'Suplentes Ativos', filtros: { status: 'suplente' }, icone: '🔄' },
  { id: 'sancoes', label: 'Com Sanções (Onda 1)', filtros: { sancao: true }, icone: '⚠️' },
  { id: 'cassados', label: 'Cassados (Ficha Limpa)', filtros: { cassado: true }, icone: '🚫' },
  { id: 'em-exercicio', label: 'Em Exercício', filtros: { em_exercicio: true }, icone: '🏛️' },
  // Por região (5)
  { id: 'mais-sul', label: 'Mais Votados Sul', filtros: { regiao: 'Sul', ordenacao: 'votos_desc' }, icone: '🌎' },
  { id: 'mais-sudeste', label: 'Mais Votados Sudeste', filtros: { regiao: 'Sudeste', ordenacao: 'votos_desc' }, icone: '🌎' },
  { id: 'mais-nordeste', label: 'Mais Votados Nordeste', filtros: { regiao: 'Nordeste', ordenacao: 'votos_desc' }, icone: '🌎' },
  { id: 'mais-norte', label: 'Mais Votados Norte', filtros: { regiao: 'Norte', ordenacao: 'votos_desc' }, icone: '🌎' },
  { id: 'mais-co', label: 'Mais Votados Centro-Oeste', filtros: { regiao: 'Centro-Oeste', ordenacao: 'votos_desc' }, icone: '🌎' },
  // Por demografia (2)
  { id: 'mulheres-congresso', label: 'Mulheres no Congresso', filtros: { genero: 'F', cargo: ['SEN', 'DEP_FED'] }, icone: '♀️' },
  { id: 'jovens', label: 'Geração Jovem (até 35)', filtros: { idade_max: 35 }, icone: '🌱' },
];
```

### 1.9 Critérios de aceitação (Sprint 1)

**Funcional:**
- [ ] Hero do módulo Dossiê não exibe "Motor de dados", nem "Hub central", nem os 2 atalhos demo
- [ ] Hero exibe texto curto a aprovar (Funcional / Editorial / Mínima)
- [ ] Grade de cartinhas carrega 30 inicialmente
- [ ] Auto-pré-carga até 90, depois aparece botão "Ver mais (30)"
- [ ] Contador "Mostrando X de N" sempre visível
- [ ] Cartinha exibe ATV/LEG/BSE/INF/MID/PAC (não mais VOT/FID/EFI/INT/ART/TER)
- [ ] Tooltip por sigla descreve o conceito conforme cargo do candidato
- [ ] Click na cartinha navega para `/mazzel-preview/dossies/[id]`
- [ ] Dentro do dossiê individual, cartinha embarcada aparece com mesmos dados
- [ ] Busca por nome retorna em < 500ms
- [ ] Pergunta natural ("menos votados da região Sul") retorna em < 3s e mostra interpretação
- [ ] 20 presets clicáveis funcionam e filtram a grade

**Técnico:**
- [ ] Grade virtualizada (`react-virtuoso`)
- [ ] Fotos com lazy load + placeholder cinza
- [ ] DOM cap em 300 cartinhas mesmo após "Ver mais" repetido
- [ ] Cache de busca via React Query (5 min staleTime)
- [ ] Schema `OverallV9` em `dossie.py` substitui `OverallFifa`
- [ ] Matriz de pesos em `services/overall_v9_matriz.py` retorna 144 valores
- [ ] Endpoint `/dossies/search` aceita modo estruturado e natural
- [ ] Migração rodada (`alembic upgrade head`) sem erro

**Qualidade:**
- [ ] Browser local rodando, navegação manual valida fluxo Hero → grade → click → dossiê → cartinha embarcada
- [ ] 4 perguntas naturais validadas: "quantos suplentes em SP", "menos votados Sul", "candidatos com cassação", "midiáticos"
- [ ] Type check sem erro novo
- [ ] Testes existentes continuam passando

---

## Sprint 2+ - ETLs e Cards (sem urgência)

Cada item abaixo é um sub-sprint independente. Planos técnicos prontos nos relatórios dos Agentes 1-6. Ordem sugerida por custo/benefício:

### 2.1 ATV.3 - CPIs e missões (rápido)
- Estender `coleta_atividade_parlamentar.py` para popular `atividade_legislativa.cpis`, `atividade_legislativa.missoes`
- Fontes: `/senador/{cod}/comissoes` (filtrar tipo=CPI) + missões oficiais

### 2.2 BSE.3 - Fidelidade do eleitor (médio)
- Migration nova: `submedida_bse3_fidelidade(candidato_id, cargo, valor, n_eleicoes, n_zonas_comuns, calculado_em)`
- Service: `services/calcular_fidelidade_eleitor.py` (fórmula 0.6 Persistência + 0.4 Estabilidade)
- Cobertura: 60-75% dos candidatos com >=2 eleições no mesmo cargo

### 2.3 INF.3 - Rede de apoios (pesado)
- Migration: `proposicoes_autores(proposicao_id, mandato_id, eh_proponente, ordem_assinatura)`
- Adicionar `networkx` ao `requirements.txt`
- Service: `services/coleta_coautoria_legislativa.py` + `services/calcular_centralidade_apoios.py`
- Algoritmo: weighted degree (60%) + eigenvector centrality (40%)

### 2.4 PAC.1-2 - Pactuação (pesado)
- 3 migrations: `votacoes_legislativo`, `votos_nominais_legislativo`, `pactuacao_score`
- Coleta semanal via cron domingo
- Cálculo: matriz numpy 600×5000 esparsa
- Filtro crítico: descartar votações não-polarizadas (`min(sim,nao)/total < 10%`)

### 2.5 PAC.3 - Taxa de execução de emendas (médio)
- Service: `services/coleta_emendas_parlamentares.py`
- Fonte: Portal da Transparência + Câmara API + Senado API (gratuitas)
- Pra DEP_FED, SEN, DEP_EST. Card dedicado no dossiê do parlamentar.

### 2.6 MID.1-3 - Exposição midiática (recorrente)
- Service: `services/coleta_midia.py` rodando mensalmente via Sonnet
- Fontes gratuitas: GDELT 2.0 DOC API + RSS 6 jornais + YouTube Data API + Instagram Business Discovery
- Custo: ~US$ 25-40/mês em tokens
- X/Twitter e TikTok ficam zerados até contratação (ver doc Obsidian "Ferramentas pagas a contratar")

### 2.7 Card de Emendas no dossiê (frontend)
- Novo componente `DossieEmendasCard.jsx` com 4 visualizações:
  1. KPIs: total apresentado / aprovado / executado / taxa
  2. Gráfico temporal (barras por ano)
  3. Distribuição por área (saúde/educação/obras)
  4. Top 10 municípios destinatários

### 2.8 Módulo Estudo (futuro)
- Painel nacional cruzando emendas por partido / UF / área
- Rankings de execução
- Em rota separada `/mazzel-preview/estudo` (já listada nas pendências do projeto)

---

## Riscos e bloqueios

| Risco | Probabilidade | Impacto | Mitigação |
|---|---|---|---|
| Endpoint Senado descontinuado cai antes do Sprint 0 | Alta (já passou Sunset) | ETL Senado para | Sprint 0 é primeiro a ser feito |
| Módulo IA `/mazzel-preview/ia` não suporta parsing estruturado | Média | Camada 3 da busca falha | Implementar parser dedicado em backend usando Claude API |
| Migração schema dossie.py quebra dossiês existentes em prod | Baixa | Dossiês quebrados | Manter `OverallFifa` como alias por 1-2 sprints |
| Performance da grade em mobile com 300 cartinhas | Média | UX ruim em mobile | Cap DOM 300 + virtualização garantem fluidez |
| Foto do candidato pesada (TSE 4MB) | Alta | Lazy load não resolve sozinho | Resize via CDN ou processamento backend antes de servir |
| Schema antigo `OverallFifa` ainda referenciado em outros módulos (Radar Político) | Média | Quebra de Radar | Grep antes de remover, manter alias até todos migrarem |

---

## Definição de pronto (Sprint 1)

Sprint 1 está pronto quando:

1. **Browser local navega o fluxo completo:** Hero limpo → grade carrega → busca por nome funciona → filtro por chip funciona → 1 preset clicado funciona → 1 pergunta natural funciona → click em cartinha abre dossiê → cartinha embarcada aparece dentro do dossiê.
2. **Backend `/api/v1/dossies/search` responde aos 6 testes manuais:**
   - GET sem filtros → 30 cartinhas
   - GET com `cargo=DEP_FED&uf=SP` → só Dep Fed de SP
   - POST natural "suplentes em SP" → grade filtrada + interpretação
   - POST natural "menos votados Sul" → ordenação ASC
   - POST natural "candidatos com cassação" → só cassados
   - POST natural "quais são midiáticos" → arquétipo Fenômeno + MID alta
3. **Cartinha exibe siglas v9:** ATV/LEG/BSE/INF/MID/PAC com tooltip.
4. **Schema migration aplicada** em dev e prod.
5. **Type check + testes existentes** sem regressão.

---

## Referências

### Decisões aprovadas (Obsidian)
- `02 - Decisoes/Decisao - Overall Dossie v9 (6 dim x 3 sub-medidas).md`
- `02 - Decisoes/Decisao - Busca e descoberta no modulo Dossie.md`
- `04 - Aprendizados/2026-04-24 - Matriz Overall v9 por cargo + arquetipos + nao-eleitos.md`
- `08 - Sessoes/2026-04-24b - Uniao Brasil - Dossie sprint completo planejamento.md`

### Relatórios técnicos dos agentes
- Spike DSF Senado: `07 - Ideias/2026-04-24 - Spike DSF Senado OCR.md` (postergado)
- Ferramentas pagas: `07 - Ideias/2026-04-24 - Ferramentas pagas a contratar para Dossie v9.md`
- Planos técnicos das 6 sub-medidas: distribuídos nas seções 2.1-2.6 deste doc

### Código relevante
- Frontend Dossiê: `codigo/frontend/app/mazzel-preview/dossies/`
- Cartinha: `codigo/frontend/components/radar/CardPolitico.jsx`
- Backend schema: `codigo/backend/app/schemas/dossie.py`
- Backend agente: `codigo/backend/app/agents/dossie.py`
- ETL parlamentar: `codigo/backend/app/services/coleta_atividade_parlamentar.py`

### APIs externas
- Senado Dados Abertos: https://legis.senado.leg.br/dadosabertos/
- Câmara Dados Abertos: https://dadosabertos.camara.leg.br/
- Portal da Transparência (emendas): https://portaldatransparencia.gov.br/api-de-dados/emendas
- TSE Dados Abertos: https://dadosabertos.tse.jus.br/
- GDELT 2.0 DOC API: https://blog.gdeltproject.org/gdelt-doc-2-0-api-debuts/
