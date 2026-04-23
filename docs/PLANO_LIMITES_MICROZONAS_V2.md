# Plano: Demarcação por limites reais das microzonas (v2)

**Data:** 13/04/2026
**Autor:** Claude + Cesar
**Status:** Em discussão — aberto a contribuições (incluindo GPT)

---

## 1. Contexto e problema

Hoje temos microzonas geradas via `ST_Union` de setores censitários IBGE.
Funciona para **área aproximada**, mas os limites são irregulares
(bordas de setores), não refletem o "onde começa e termina o Piqueri"
que um morador reconhece.

O que um morador reconhece:
- "Piqueri termina quando cruza a Av. Mutinga"
- "Vila Pereira Barreto vai até a Av. Raimundo Pereira"
- "Vila Pereira Cerca começa depois da Av. Prof. Celestino Bourroul"

Ou seja: **ruas arteriais, corpos d'água, linhas férreas** são os
divisores reais. Nossos polígonos atuais ignoram isso.

### Problema concreto observado (print 13/04 10:44)
- Piqueri no mapa aparece como região transparente sem limite claro
- Vila Pereira Cerca, Vila Pereira Barreto misturadas visualmente
- Usuário não consegue visualmente apontar "esse pedaço é Piqueri"

---

## 2. Objetivo final

Para cada microzona:
- **Polígono contínuo** com bordas seguindo ruas reais, rios, linhas férreas
- **Sem sobreposição** entre microzonas vizinhas
- **Ancorado** no ponto OSM `place=suburb|neighbourhood` (nome canônico)
- **Contido** no município e, quando possível, no distrito IBGE pai
- **Compatível** com a base de setores IBGE (cada setor em 1 microzona)

---

## 3. Fontes disponíveis e avaliação

| Fonte | Cobertura | Qualidade | Custo | Observação |
|-------|-----------|-----------|-------|------------|
| **OSM `place=suburb` Points** | 100% SP (17k+) | nome OK, sem limite | grátis | nossa base atual |
| **OSM `admin_level=10` relations** | < 10% SP | polígono oficial | grátis | **onde existe, é o padrão-ouro** |
| **OSM ruas** (`highway=primary/secondary`) | 100% SP | muito boa, atualizada | grátis | divisores reais |
| **OSM rios/ferrovias** (`waterway`, `railway`) | boa | divisores naturais | grátis | limite quase sempre respeitado |
| **Setores IBGE** | 100% BR | fronteira em rua real | grátis | já temos, 27k SP |
| **GeoSampa — bairros indicativos** | 100% SP capital | polígono publicado pela prefeitura | grátis | fonte boa, só SP |
| **CNEFE — DNE Correios** | 100% SP (46k CEPs) | bairro DNE, lat/lng | grátis | já temos |
| **Overture Maps `divisions`** | cobertura crescente BR | polígonos em algumas capitais | grátis | novo padrão |
| **Mapbox Boundaries** | 100% BR | excelente | US$500+/mês | pago |

---

## 4. Estratégia recomendada

**Arquitetura em 3 camadas com prioridade descendente:**

### Camada 1 — Polígono oficial (quando existe)
- Consulta Overpass API: `relation[boundary=administrative][admin_level=10]`
  dentro do município
- Se existe uma relation com nome = nosso bairro OSM → usa direto
- Cobertura esperada em SP: 10-20%

### Camada 2 — Voronoi restrito por setores IBGE (fallback universal)
**Algoritmo:**

1. Coletar todos os Points OSM de `place IN (suburb, neighbourhood)` do
   município
2. Gerar **diagrama de Voronoi** dos Points (`ST_VoronoiPolygons` do PostGIS)
3. Recortar cada célula Voronoi com `ST_Intersection` contra a união
   dos setores censitários do município (garante que fica dentro do
   município)
4. Para cada setor IBGE: atribuir à célula Voronoi cujo **centróide do
   setor** cai dentro
5. Refinar via **snap às ruas arteriais OSM**:
   - Para cada borda Voronoi, buscar rua OSM primary/secondary a < 150m
   - Deslocar borda pra rua (via PostGIS `ST_Snap`)
6. Reaplicar `ST_Union` dos setores atribuídos à cada célula → polígono
   final da microzona

**Cobertura:** 100% (sempre funciona)
**Qualidade:** média-alta — bordas nas ruas, nomes OSM canônicos

### Camada 3 — GeoSampa (SP capital only — opcional)
- Download shapefile "Bairros" da GeoSampa
- Cruzar nomes GeoSampa × nosso OSM
- Para matches: substituir polígono Camada 2 pelo polígono GeoSampa
  (mais confiável socialmente)

---

## 5. Fases de execução propostas

### FASE 1 — Piloto em Pirituba (4-6h)
Objetivo: validar que o método Voronoi + snap funciona antes de escalar.

1. Selecionar apenas o distrito Pirituba (IBGE `355030863`) — ~15 Points OSM
2. Rodar Voronoi local
3. Recortar com setores IBGE contidos
4. Snap às ruas arteriais
5. Renderizar no mapa — comparar visualmente com percepção do morador
6. Ajustar parâmetros (raio de snap, seleção de ruas, etc)

**Critério de sucesso:** Piqueri e Vila Pereira Barreto visivelmente
separados por rua real, no mapa.

### FASE 2 — SP capital inteira (1 dia)
- Repetir FASE 1 para todo SP
- 10.700+ Points OSM → 10.700+ células Voronoi
- Cruzar com 27k setores IBGE
- Output: novo ETL `19_limites_voronoi.py` substitui geometria da tabela
  `microregioes`

### FASE 3 — Augmentação OSM `admin_level=10` (4h)
- Query Overpass pra pegar as ~100 relations oficiais em SP
- Substituir polígonos Voronoi pelos oficiais quando há match de nome

### FASE 4 — GeoSampa (opcional — 4h)
- Só SP capital
- Melhora qualidade em bairros legislados

### FASE 5 — Generalização Brasil (em fila)
- Aplicar FASE 2 em cada capital
- Overture Maps como fonte adicional onde cobre

---

## 6. Código de referência (PostGIS + Python)

### Voronoi nativo do PostGIS
```sql
WITH pontos AS (
    SELECT ST_Collect(bo.geometry) AS coll
    FROM bairros_osm bo
    WHERE bo.municipio_id = :mid
      AND bo.tipo IN ('suburb', 'neighbourhood')
      AND ST_GeometryType(bo.geometry) = 'ST_Point'
),
voronoi AS (
    SELECT (ST_Dump(ST_VoronoiPolygons(coll))).geom AS cel
    FROM pontos
),
municipio_geom AS (
    SELECT ST_Union(sc.geometry) AS geom
    FROM setores_censitarios sc
    WHERE sc.codigo_municipio = :cd_mun
)
-- Cada célula recortada pelo município
SELECT
    bo.id AS osm_id,
    bo.nome,
    ST_Intersection(v.cel, m.geom) AS poligono
FROM voronoi v
CROSS JOIN municipio_geom m
-- Associa célula ao ponto OSM que a gerou (via centróide)
JOIN bairros_osm bo
  ON bo.municipio_id = :mid
 AND ST_Within(bo.geometry, v.cel)
 AND bo.tipo IN ('suburb', 'neighbourhood');
```

### Snap às ruas arteriais
```sql
-- Para cada célula Voronoi, snap nas bordas de ruas primary/secondary
-- dentro de 150m
WITH ruas_principais AS (
    SELECT ST_Union(geometry) AS geom
    FROM osm_ruas
    WHERE categoria IN ('primary', 'secondary', 'trunk', 'motorway')
      AND ST_DWithin(geometry, :celula_voronoi, 150)
)
SELECT ST_Snap(:celula_voronoi, ruas.geom, 150) AS snapped
FROM ruas_principais ruas;
```

**Atenção:** precisamos importar as ruas OSM primeiro (não temos hoje).
Nova migration + ETL. Estimativa: 20k+ ruas arteriais em SP.

### Atribuição de setores a células
```sql
UPDATE setores_censitarios sc SET microregiao_id = nova.id
FROM microregioes nova
WHERE sc.codigo_municipio = :cd_mun
  AND ST_Within(ST_Centroid(sc.geometry), nova.geometry);
```

---

## 7. Riscos e trade-offs

| Risco | Probabilidade | Mitigação |
|-------|---------------|-----------|
| Células Voronoi cortam mal em vizinhanças irregulares | Média | Snap às ruas arteriais + fallback GeoSampa |
| OSM Points mal posicionados (erro de OSMer) | Baixa | Validação: ponto OSM deve cair dentro da célula que gerou |
| Ruas OSM incompletas | Baixa em SP | Usar corpos d'água + linhas férreas como ruas secundárias |
| Snap causa auto-intersecção da geometria | Baixa | `ST_MakeValid` depois do snap |
| Performance: Voronoi de 10k+ Points em SP | Média | Processar por distrito IBGE (divide em ~96 regiões) |
| Overlap entre células após snap | Média | Reconciliar via `ST_Union` e re-recortar |

---

## 8. Validação

Para cada FASE:

**Visual:**
- Abrir mapa em Pirituba/distrito piloto
- Conferir que Piqueri, Vila Pereira Barreto, Vila Pereira Cerca têm
  polígonos distintos com bordas em ruas reais

**Quantitativa:**
- Soma das áreas das microzonas = área do município (±1%)
- `ST_Overlaps` entre microzonas vizinhas = 0 (exceto tolerância de
  precisão)
- Cada setor IBGE em exatamente 1 microzona

**Semântica:**
- Cross-check com nomes CARTO via `queryRenderedFeatures`
- Cross-check com bairro dominante CEP via tabela `ceps`
- Pedir revisão de 10 moradores de Pirituba (amostra humana)

---

## 9. Perguntas abertas (para GPT / debate)

1. **Voronoi de Points + snap às ruas** é a melhor estratégia?
   Alternativas: DBSCAN dos setores com rótulo OSM, concave hull das
   ruas que "pertencem" ao bairro, machine learning sobre CNEFE...

2. **OSM `admin_level=10`** em SP: quantas relations existem hoje?
   Vale priorizá-las?

3. **Overture Maps** cobre SP capital em que proporção? Tem `divisions`
   com polígonos de subdivision em PT-BR?

4. **GeoSampa "bairros"** — qual o status legal dessa malha? É
   referência social ou tem peso administrativo?

5. **Snap de Voronoi a ruas** é tecnicamente complexo e pode introduzir
   artefatos. Existe implementação de referência em Python/PostGIS?

6. **Refinamento iterativo**: depois de gerar V1 dos polígonos, é
   possível um passo de "equalização de população" (remover setor do
   bairro gigante, dar pro vizinho pequeno) pra evitar discrepâncias
   absurdas?

7. **Multipolígonos**: alguns bairros (ex: Jaraguá, que toca vários
   distritos) deveriam ser 1 polígono ou vários? Nossa decisão atual
   é "1 microzona por centróide OSM único"; isso gera múltiplas
   "Jaraguá" quando o nome aparece em mais de 1 Point OSM.

8. **Performance backend**: se tivermos 100k+ microzonas no Brasil com
   polígonos ricos, como otimizar rendering (tiles vetoriais próprios,
   simplificação por zoom, etc)?

---

## 10. Próximo passo imediato

1. Revisar este plano com o Cesar
2. Consultar GPT para insights adicionais (especialmente seção 9)
3. Aprovar FASE 1 (piloto Pirituba)
4. Executar FASE 1, validar visualmente
5. Decidir escala (FASE 2 inteira ou iteração)

---

## Arquivos que serão tocados (estimativa)

| Arquivo | Mudança |
|---------|---------|
| `backend/alembic/versions/023_osm_ruas.py` | NOVA — tabela `osm_ruas` com categoria + geometry |
| `etl/19_importar_osm_ruas.py` | NOVO — Overpass query de `highway=primary/secondary/trunk` |
| `etl/20_limites_voronoi.py` | NOVO — Voronoi + snap + recorte por setores |
| `etl/21_augmentar_admin_level_10.py` | NOVO — substitui polígono Voronoi pelo oficial onde disponível |
| `backend/app/api/v1/endpoints/mapa.py` | endpoint `/microregioes` lê novos polígonos |
| `frontend/components/map/MapaEleitoral.tsx` | zero mudança (API mantém shape) |

---

---

## 11. Ajustes aprovados pelo Cesar (13/04 11:15) — obrigatórios antes da FASE 1

### 11.1 Barreiras físicas como divisores intransponíveis
- Importar OSM `waterway=river|canal|stream` e `railway=rail|subway`
- Após Voronoi, **cortar** cada célula com essas barreiras usando
  `ST_Split(celula, barreira)` → quando uma barreira atravessa uma
  célula, ela vira 2+ polígonos
- Associar cada fragmento ao Point OSM mais próximo

### 11.2 Snap dinâmico à rua
- Threshold variável 50-100m (não 150m fixo)
- Só aplicar se `ST_Distance(borda, rua) < threshold`
- Se não há rua próxima, manter borda Voronoi original

### 11.3 Suavização obrigatória pós-operações
- `ST_SimplifyPreserveTopology(geom, 0.0001)` após snap
- `ST_Buffer(geom, 0)` para reparar auto-intersecções
- `ST_MakeValid` como garantia final

### 11.4 Deduplicação de Points OSM antes do Voronoi
- Clusterizar Points com mesmo nome normalizado a < 100m via
  `ST_ClusterDBSCAN(eps=100m, minpoints=1)`
- Para cada cluster: representar por 1 Point (centróide dos pontos)
- Evita que "Piqueri" com 2 Points a 50m gere 2 células Voronoi
  competindo pela mesma área

### 11.5 Multipolígonos por nome
- Permitir que 1 microzona seja `MultiPolygon` (ex: "Jaraguá" que toca
  2 distritos) — não exigir contiguidade
- Mas validar: fragmentos de mesma microzona devem estar em
  distância < 3km entre si (evitar nomes duplicados virarem 1 blob)

---

## 12. Status

- Plano V2 aprovado com ajustes 11.1-11.5 em 13/04 11:15
- Executando FASE 1 (piloto Pirituba) agora

**Fim do plano.**
