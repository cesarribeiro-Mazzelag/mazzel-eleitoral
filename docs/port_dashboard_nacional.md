# Port: Dashboard Nacional -> Plataforma V2

**Data:** 2026-04-24
**Tarefa:** Adicionar secao "Visao Nacional" na home da nova plataforma (`/mazzel-preview`)

## O que foi feito

### 1. Componente criado

`/codigo/frontend/components/plataforma-v2/modulos/home/VisaoNacionalKPIs.jsx`

Componente autonomo com fetch proprio. Nao depende do estado do `Home.jsx` — busca
`/dashboard/visao-geral?anos=2024` e `?anos=2022` em paralelo (mesmo padrao do dashboard raiz).

### 2. Estrutura interna do componente

- `BlocoEleicao` — cabecalho colorido (gradiente ambar=municipal / violeta=geral) + tabela de cargos
  com barra de progresso por linha (mesmo dado do dashboard raiz)
- `LinhaCargo` — linha da tabela: cargo, eleitos, candidatos, taxa, barra visual
- `CardKPI` — 4 cards de presenca nacional: total eleitos, municipios, estados, partidos
- `GraficoHorizontal` — 2 graficos de barras horizontais (top estados + top partidos), 2024/2022 side-by-side
- Aviso de ciclos separados (municipal vs. geral nao comparaveis)
- Estado de loading com skeletons e mensagem de erro

### 3. Integracao no Home

`/codigo/frontend/components/plataforma-v2/modulos/Home.jsx`

- Import adicionado na linha 21
- `<VisaoNacionalKPIs />` inserido apos o bloco de Auditoria (ultimo bloco da home), antes do fechamento

### 4. Rota destino

`/mazzel-preview` -> `app/mazzel-preview/page.jsx` -> `<Home />` -> inclui `<VisaoNacionalKPIs />`

Nao foi necessario criar rota nova `/mazzel-preview/dashboard/` pois o componente foi inserido
diretamente na home como secao, que e o comportamento mais coerente com o layout da plataforma V2.

## O que NAO foi testado

- Renderizacao visual no browser (servidor nao iniciado nesta sessao)
- Resposta real do endpoint `/dashboard/visao-geral` no contexto da plataforma V2 (token diferente do dashboard raiz)
- Responsividade mobile dos graficos Recharts dentro do grid da plataforma

## Dependencias

- `recharts` — ja instalado (usado em outros componentes)
- `fetchJson` de `api.js` — ja existente na plataforma V2
- Nenhuma instalacao nova necessaria
