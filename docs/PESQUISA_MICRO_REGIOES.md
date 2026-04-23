# Pesquisa: Micro-Regioes e Poligonos de Bairros para Inteligencia Eleitoral

**Data:** 12/04/2026
**Autor:** Cesar Ribeiro (pesquisa assistida por IA)
**Objetivo:** Avaliar abordagens para dividir municipios em micro-regioes (bairros, vilas, comunidades) com poligonos geoespaciais, visando inteligencia eleitoral granular.

---

## 1. Como o iFood Mapeia Zonas de Entrega

### Historico da Evolucao

O iFood passou por uma evolucao significativa no mapeamento de areas de entrega. Segundo artigo tecnico publicado no blog iFood Tech (Medium), a empresa enfrentou problemas graves com quatro metodos antigos:

1. **Lista de CEPs** - restaurante escolhia CEPs de entrega manualmente
2. **Lista de bairros** - selecionava bairros por nome
3. **Desenho KML** - restaurante desenhava area em software online
4. **Raio fixo** - circulo a partir da localizacao do restaurante

Todos geravam erros: CEPs nao cobrem areas uniformes, bairros tem limites ambiguos, KML depende do restaurante saber desenhar, e raio fixo ignora barreiras fisicas (rios, morros, rodovias).

### Solucao Atual

O iFood migrou para uma abordagem baseada em **grade hexagonal** (modelo similar ao H3 da Uber), onde:

- A cidade e dividida em **hexagonos uniformes**
- O restaurante seleciona os hexagonos que deseja atender
- O sistema calcula distancia real (nao euclidiana) considerando malha viaria
- Sensoriamento remoto e IA mapeiam potencial de demanda por hexagono
- GPS preciso calcula distancias reais considerando trafego, entregadores disponiveis e tempo de preparo

### Licoes para Inteligencia Eleitoral

- **Nao usar CEP como unidade primaria** - CEPs sao projetados para logistica dos Correios, nao para representacao territorial
- **Nao confiar em nomes de bairros** - limites sao ambiguos e variam entre fontes
- **Grade hexagonal funciona** - uniformidade facilita comparacoes e agregacoes
- **Combinar grade com limites administrativos** - o melhor dos dois mundos

---

## 2. Fontes de Dados Publicas para Poligonos de Bairros no Brasil

### 2.1 IBGE - Setores Censitarios (Censo 2022)

**O que e:** Menor unidade territorial do IBGE para coleta e disseminacao de dados censitarios.

| Metrica | Valor |
|---------|-------|
| Total de poligonos | **452.338** setores (468.097 com areas operacionais) |
| Cobertura | 5.568 municipios + DF + Fernando de Noronha |
| Granularidade | ~150 a 400 domicilios por setor (urbano) |
| Area tipica urbana | 0,01 a 0,5 km2 |
| Area tipica rural | pode chegar a centenas de km2 |
| Formatos | Shapefile (.shp), GeoPackage (.gpkg), KML (.kml) |
| Anos disponiveis | 2000, 2007, 2010, 2017, **2022** |
| Sistema geodesico | SIRGAS 2000 |
| Dados vinculados | Populacao, domicilios, renda, escolaridade, raca, idade |

**Download oficial:**
- https://www.ibge.gov.br/geociencias/organizacao-do-territorio/malhas-territoriais/26565-malhas-de-setores-censitarios-divisoes-intramunicipais.html
- FTP: https://geoftp.ibge.gov.br/organizacao_do_territorio/malhas_territoriais/malhas_de_setores_censitarios__divisoes_intramunicipais/

**Vantagens:**
- Maior granularidade disponivel com dados demograficos vinculados
- Dados oficiais, atualizados no Censo 2022
- Classificacao urbano/rural embutida
- Cobrem 100% do territorio nacional

**Desvantagens:**
- Setores rurais sao enormes (baixa granularidade fora de areas urbanas)
- ~450K poligonos e pesado para renderizar no browser
- Limites nao correspondem a bairros que as pessoas reconhecem
- Necessario agregar para chegar em "bairros"

### 2.2 IBGE - Bairros (17.575 poligonos)

**O que e:** Agregacao oficial de setores censitarios em bairros, disponivel para 720 municipios.

| Metrica | Valor |
|---------|-------|
| Total de poligonos | **17.575** bairros |
| Municipios cobertos | **720** (apenas os que tem divisao oficial) |
| Formatos | Shapefile, GeoPackage, KML |

**Download:** Mesmo portal dos setores censitarios do IBGE.

**Vantagens:**
- Poligonos que correspondem a bairros oficiais
- Quantidade gerenciavel (~17K)
- Dados do IBGE vinculaveis por agregacao

**Desvantagens:**
- Cobertura parcial (720 de 5.568 municipios)
- Muitos municipios menores nao tem divisao de bairros
- Bairros oficiais nem sempre coincidem com bairros "populares" (ex: Pirituba oficialmente e um distrito, Jardim Iris e um bairro informal dentro dele)

### 2.3 IBGE - Subdistritos (643 unidades) e Distritos (10.698 unidades)

**Subdistritos:** Divisao intermediaria entre distrito e setor censitario. Apenas 643 no Brasil - granularidade muito baixa.

**Distritos:** 10.698 unidades. Todo municipio tem pelo menos 1 distrito (sede). Util como nivel intermediario, mas ainda grosseiro para inteligencia de bairro.

### 2.4 OpenStreetMap (OSM)

**O que e:** Mapa colaborativo aberto com limites de bairros mapeados pela comunidade.

| Metrica | Valor |
|---------|-------|
| Cobertura Brasil | Variavel - muito boa em capitais, irregular no interior |
| Formato | PBF (nativo), Shapefile, GeoJSON (via Geofabrik/Overpass) |
| Atualizacao | Continua (crowdsourced) |
| Licenca | ODbL (aberta, com atribuicao) |

**Downloads:**
- Geofabrik: https://download.geofabrik.de/south-america/brazil.html (PBF + Shapefile por estado)
- Overpass API: consultas em tempo real
- UMBRAOSM: https://umbraosm.com.br/downloads/

**Como extrair bairros:**
```
Relacoes com boundary=administrative + admin_level=10 (bairros)
Ou: place=neighbourhood / place=suburb
```

**Vantagens:**
- Inclui bairros informais e vilas que o IBGE nao mapeia
- Atualizacao continua
- Comunidade brasileira ativa (UMBRAOSM)
- Inclui POIs, ruas, edificacoes

**Desvantagens:**
- Cobertura desigual (capitais OK, interior parcial)
- Sem padronizacao - alguns bairros como ponto, outros como poligono
- Limites podem conflitar com fontes oficiais
- Sem dados demograficos vinculados

### 2.5 H3 - Grade Hexagonal (Uber)

**O que e:** Sistema de indexacao geoespacial que divide a Terra em hexagonos hierarquicos em 16 resolucoes.

| Resolucao | Area media por hex | Equivale a... | Hexagonos no Brasil |
|-----------|--------------------|----------------|---------------------|
| 4 | 1.770 km2 | Municipio medio | ~4.800 |
| 5 | 252 km2 | Municipio pequeno | ~34.000 |
| 6 | 36 km2 | Distrito urbano | ~237.000 |
| 7 | 5,16 km2 | Bairro grande | ~1.660.000 |
| **8** | **0,74 km2** | **Bairro / Vila** | **~11.500.000** |
| **9** | **0,11 km2** | **Micro-bairro / Quadras** | **~80.000.000** |
| 10 | 0,015 km2 | Quadra individual | ~560.000.000 |

**Biblioteca:** https://h3geo.org/ (C, Python, Java, JavaScript, Go, Rust)
**Licenca:** Apache 2.0

**Vantagens:**
- Uniforme - todos os hexagonos tem mesma area na mesma resolucao
- Hierarquico - cada hex contem 7 filhos (zoom semantico)
- Sem ambiguidade - cada ponto do planeta tem exatamente 1 hex em cada resolucao
- Operacoes rapidas - vizinhanca, distancia, agregacao sao O(1)
- Agnóstico a fronteiras administrativas (nao depende do IBGE)
- Combina com qualquer dado pontual (secoes eleitorais, locais de votacao)

**Desvantagens:**
- Nao e "natural" - hexagonos nao correspondem a bairros reais
- Precisa de overlay com dados administrativos para ter significado
- Volume alto em resolucoes finas (res 9 = ~80M hexagonos para o Brasil)
- Curva de aprendizado para a equipe

### 2.6 CEP (Correios) - Voronoi

**Conceito:** Gerar poligonos a partir dos centróides de cada CEP usando diagramas de Voronoi ou Thiessen.

**Fontes de CEP georreferenciados:**
- Base dos Correios (oficial, paga)
- OpenCEP / ViaCEP (APIs gratuitas, sem geometria)
- Projetos comunitarios com geocodificacao reversa

**Vantagens:**
- CEP e familiar para brasileiros
- Cobertura universal

**Desvantagens:**
- CEPs nao tem geometria oficial - Correios nao publicam poligonos
- Voronoi de CEP gera poligonos artificiais que nao respeitam ruas/barreiras
- CEPs mudam (Correios atualiza periodicamente)
- Granularidade variavel (CEP unico pode cobrir um predio ou um municipio inteiro)
- **Nao recomendado como unidade primaria**

### 2.7 Dados Municipais (Prefeituras)

Algumas prefeituras publicam dados geoespaciais proprios com granularidade superior ao IBGE:

| Cidade | Portal | Dados disponiveis |
|--------|--------|-------------------|
| Sao Paulo | GeoSampa | 96 distritos, ~2.000+ bairros, quadras, lotes |
| Rio de Janeiro | Data.Rio | Bairros, RAs, favelas |
| Recife | dados.recife.pe.gov.br | Bairros em GeoJSON |
| Belo Horizonte | PRODABEL/BHMap | Regionais, bairros |
| Curitiba | IPPUC | Bairros, regionais |

**GeoSampa (Sao Paulo):**
- 32 Subprefeituras → 96 Distritos → Bairros
- Shapefiles disponiveis em SIRGAS2000/UTM
- URL: https://geosampa.prefeitura.sp.gov.br/

**Vantagens:**
- Dados oficiais municipais com alta granularidade
- Incluem bairros informais em alguns casos

**Desvantagens:**
- Cada cidade tem formato e API diferentes
- Cobertura limitada a capitais e cidades grandes
- Sem padronizacao nacional

### 2.8 Overture Maps Foundation

**O que e:** Projeto da Linux Foundation (apoiado por Meta, Microsoft, Amazon, TomTom) que unifica dados geoespaciais abertos.

| Metrica | Valor |
|---------|-------|
| Divisoes totais | 5,5+ milhoes (mundo) |
| Inclui bairros | Sim (divisions theme) |
| Formato | GeoParquet (cloud-native) |
| Fontes | OSM, Wikidata, dados oficiais |

**Download:** https://overturemaps.org/download/
- Python CLI, DuckDB, Amazon S3, Azure Blob

**Vantagens:**
- Dados padronizados globalmente
- Inclui neighborhoods como feature type
- Atualizacao frequente
- Formato moderno (GeoParquet)

**Desvantagens:**
- Cobertura de bairros no Brasil ainda em construcao
- Depende da qualidade do OSM + contribuicoes

### 2.9 Pacote geobr (Python/R)

**O que e:** Pacote do IPEA que facilita download de dados geoespaciais oficiais do Brasil.

```python
pip install geobr

import geobr

# Setores censitarios de SP
tracts = geobr.read_census_tract(code_tract=35, year=2010)

# Bairros
neighborhoods = geobr.read_neighborhood(year=2010)

# Municipios
cities = geobr.read_municipality(year=2022)
```

**Funcoes disponiveis:** estados, municipios, mesorregioes, microrregioes, setores censitarios, bairros, areas de ponderacao, areas urbanizadas, biomas, amazonia legal, regioes metropolitanas, entre outros.

**URL:** https://github.com/ipeaGIT/geobr

---

## 3. Comparacao das Abordagens

### Tabela Comparativa

| Criterio | Setores IBGE | Bairros IBGE | H3 Hexagonos | OSM | CEP Voronoi | Dados Municipais |
|----------|-------------|-------------|-------------|-----|-------------|-----------------|
| **Granularidade** | Muito alta | Media | Configuravel | Variavel | Baixa-media | Alta |
| **Cobertura nacional** | 100% | 13% (720 mun.) | 100% | ~60% | 100% | <1% |
| **Dados demograficos** | Sim (Censo) | Por agregacao | Nao (overlay) | Nao | Nao | Parcial |
| **Estabilidade** | A cada Censo | A cada Censo | Permanente | Muda diariamente | Correios muda | Varia |
| **Carga de dados** | 452K polys | 17K polys | Sob demanda | Variavel | ~1M pontos | Varia |
| **Reconhecimento popular** | Nao | Parcial | Nao | Sim | Sim (CEP) | Sim |
| **Facilidade de uso** | Media | Alta | Alta (com lib) | Media | Baixa | Baixa |
| **Custo** | Gratuito | Gratuito | Gratuito | Gratuito | Parcial (Correios) | Gratuito |
| **Vinculo com secoes eleitorais** | Possivel (geocode) | Possivel | Direto (lat/lng) | Possivel | Fraco | Possivel |

### Qual abordagem o TSE usa?

O TSE **nao publica shapefiles de zonas eleitorais**. As zonas eleitorais sao definidas por listas de bairros/municipios, sem geometria oficial. Existe um projeto comunitario no GitHub (mapaslivres/zonas-eleitorais) que tenta geocodificar os enderecos dos cartorios. Para vincular secoes eleitorais a micro-regioes, e necessario geocodificar os enderecos dos locais de votacao (escolas) - que o projeto ja possui na tabela `local_votacao`.

---

## 4. Abordagem Recomendada para a Plataforma Eleitoral

### Estrategia: Modelo Hibrido em 3 Camadas

A recomendacao e um modelo hibrido que combina as forcas de cada fonte:

```
Camada 1 (Base):     Setores Censitarios IBGE 2022 (452K poligonos)
Camada 2 (Agregacao): Bairros IBGE + OSM + Dados Municipais
Camada 3 (Analise):  H3 resolucao 8 (indexacao e comparacao)
```

### Camada 1 - Setores Censitarios como Base

**Por que:** E a unica fonte que cobre 100% do Brasil com granularidade sub-bairro E tem dados demograficos vinculados (populacao, renda, escolaridade, raca). Para inteligencia eleitoral, cruzar votos com perfil demografico e essencial.

**Como:**
1. Importar shapefiles do Censo 2022 para PostGIS (tabela `setores_censitarios`)
2. Vincular dados agregados do Censo (populacao, renda media, etc.)
3. Geocodificar locais de votacao (ja temos lat/lng) e associar ao setor censitario via ST_Contains

### Camada 2 - Bairros como Agregacao

**Por que:** Setores censitarios nao tem significado para o usuario final. Bairros sim. A camada de bairros agrega setores em unidades reconheciveis.

**Como:**
1. Importar bairros IBGE (17.575 poligonos) - cobre 720 municipios
2. Para municipios sem bairros IBGE: usar OSM (boundary=administrative, admin_level=10)
3. Para capitais: enriquecer com dados municipais (GeoSampa para SP, Data.Rio para RJ, etc.)
4. Fallback: agregar setores censitarios automaticamente usando clustering espacial

**Resultado:** Cada setor censitario pertence a exatamente 1 bairro. Votos sao agregados por bairro para exibicao no mapa.

### Camada 3 - H3 para Analise Comparativa

**Por que:** Hexagonos uniformes permitem comparacoes justas entre regioes (um bairro de 50km2 vs um de 0,5km2 nao e comparavel, mas hexagonos de mesma area sim). Essencial para modelos preditivos e deteccao de padroes.

**Como:**
1. Indexar cada local de votacao com H3 res 8 (area ~0,74km2 - equivale a micro-bairro)
2. Indexar cada setor censitario (centroide) com H3 res 8
3. Agregacoes analiticas: votos por hexagono, mudanca de padrao entre eleicoes, deteccao de anomalias

**Uso:** Nao renderizar hexagonos no mapa para o usuario final (confuso). Usar internamente para analise e ML.

### Fluxo de Dados

```
Locais de Votacao (lat/lng)
    |
    ├─ ST_Contains → Setor Censitario → Bairro → Distrito → Municipio
    |
    └─ h3.latlng_to_cell(res=8) → H3 Index → Agregacoes analiticas
    
Votos por Secao/Zona
    |
    └─ JOIN local_votacao → herda setor censitario + bairro + H3
```

### Exemplo Pratico: Sao Paulo - Pirituba

```
Municipio: Sao Paulo (IBGE 3550308)
  └─ Subprefeitura: Pirituba-Jaragua
      └─ Distrito: Pirituba (IBGE)
          └─ Bairros (GeoSampa/OSM):
              ├─ Jardim Iris
              ├─ Jardim Rincao  
              ├─ City Jaragua
              ├─ Vila Pereira Barreto
              └─ Parque Sao Domingos
                  └─ Setores Censitarios (IBGE): ~20-50 por bairro
                      └─ Locais de votacao: 2-5 por setor
                          └─ Secoes eleitorais: 3-8 por local
```

---

## 5. Plano de Implementacao

### Fase 1 - Fundacao (2-3 semanas)

| Tarefa | Esforco | Detalhes |
|--------|---------|---------|
| Importar setores censitarios 2022 | 3 dias | Download IBGE + script ETL para PostGIS. ~452K registros com geometria. Tabela `setores_censitarios` com `geom GEOMETRY(MultiPolygon, 4674)` |
| Vincular dados demograficos | 2 dias | CSVs agregados do Censo 2022 (populacao, renda, idade) por setor |
| Geocodificar locais de votacao | 1 dia | Ja temos lat/lng. Query: `UPDATE local_votacao SET setor_id = ... WHERE ST_Contains(setor.geom, local.geom)` |
| Importar bairros IBGE | 1 dia | 17.575 poligonos. Tabela `bairros_ibge` |
| Vincular setores a bairros | 1 dia | `ST_Contains` ou `ST_Intersects` com maior area |
| Testes e validacao | 2 dias | Verificar cobertura, setores sem bairro, bairros sem setor |

**Entregavel:** Cada secao eleitoral vinculada a setor censitario e bairro. Query funcional: "Quantos votos o candidato X teve no Jardim Iris?"

### Fase 2 - Enriquecimento (1-2 semanas)

| Tarefa | Esforco | Detalhes |
|--------|---------|---------|
| OSM bairros para municipios sem IBGE | 3 dias | Script Python com Overpass API. Filtro: `boundary=administrative` + `admin_level=10` |
| GeoSampa (Sao Paulo) | 1 dia | Download shapefile de bairros + import PostGIS |
| Data.Rio (Rio de Janeiro) | 1 dia | Idem |
| Outros municipios prioritarios | 2 dias | BH, Curitiba, Recife, Salvador, Fortaleza |
| Fallback: clustering de setores | 3 dias | Para municipios sem nenhuma fonte de bairro: agrupar setores censitarios contiguos usando DBSCAN espacial |

**Entregavel:** Cobertura de bairros para as ~50 maiores cidades do Brasil.

### Fase 3 - Analise Avancada (1-2 semanas)

| Tarefa | Esforco | Detalhes |
|--------|---------|---------|
| Instalar h3-py e PostGIS H3 | 0,5 dia | `pip install h3` + extensao PostGIS |
| Indexar locais de votacao com H3 | 0,5 dia | Coluna `h3_res8 TEXT` na tabela `local_votacao` |
| Agregacoes analiticas | 2 dias | Views materializadas: votos por H3, variacao entre ciclos |
| Mapa de calor por hexagono | 2 dias | Endpoint API + renderizacao MapLibre com fill-extrusion |
| Deteccao de anomalias | 3 dias | Hexagonos com variacao atipica entre 2020 e 2024 |

**Entregavel:** Camada analitica de hexagonos. Mapa de calor de performance eleitoral.

### Fase 4 - Navegacao no Mapa (1 semana)

| Tarefa | Esforco | Detalhes |
|--------|---------|---------|
| Renderizar bairros no nivel municipio | 2 dias | Endpoint `/mapa/geojson/{municipio}/bairros` |
| Barra lateral por bairro | 2 dias | Ao clicar no bairro: locais de votacao, votos, perfil demografico |
| Zoom progressivo bairro → escola | 1 dia | Pins de locais de votacao ao zoom maximo |

**Entregavel:** Navegacao completa Brasil → Estado → Municipio → Bairro → Local de Votacao.

---

## 6. Estimativa Total de Esforco

| Fase | Semanas | Prioridade |
|------|---------|-----------|
| Fase 1 - Fundacao | 2-3 | P0 (obrigatoria) |
| Fase 2 - Enriquecimento | 1-2 | P1 (importante) |
| Fase 3 - Analise H3 | 1-2 | P2 (diferencial) |
| Fase 4 - Navegacao | 1 | P1 (UX) |
| **Total** | **5-8 semanas** | |

---

## 7. Fontes e URLs

### Dados Oficiais
- IBGE Setores Censitarios: https://www.ibge.gov.br/geociencias/organizacao-do-territorio/malhas-territoriais/26565-malhas-de-setores-censitarios-divisoes-intramunicipais.html
- IBGE FTP: https://geoftp.ibge.gov.br/organizacao_do_territorio/malhas_territoriais/malhas_de_setores_censitarios__divisoes_intramunicipais/
- IBGE Downloads: https://downloads.ibge.gov.br/
- IBGE API Malhas: https://servicodados.ibge.gov.br/api/docs/malhas?versao=3
- Censo 2022 Agregados: https://www.ibge.gov.br/estatisticas/sociais/populacao/22836-censo-2022.html

### Dados Municipais
- GeoSampa (SP): https://geosampa.prefeitura.sp.gov.br/
- Data.Rio (RJ): https://www.data.rio/
- Dados Abertos Recife: http://dados.recife.pe.gov.br/
- Portal Dados Abertos SP: https://dados.prefeitura.sp.gov.br/

### Dados Abertos e Comunitarios
- OpenStreetMap Brasil: https://download.geofabrik.de/south-america/brazil.html
- UMBRAOSM: https://umbraosm.com.br/downloads/
- Overture Maps: https://overturemaps.org/download/
- geobr (IPEA): https://github.com/ipeaGIT/geobr
- geodata-br (GeoJSON municipios): https://github.com/tbrugz/geodata-br
- mapaslivres/zonas-eleitorais: https://github.com/mapaslivres/zonas-eleitorais

### Ferramentas e Bibliotecas
- H3 (Uber): https://h3geo.org/
- h3-py: https://uber.github.io/h3-py/
- PostGIS: https://postgis.net/
- MapLibre GL JS: https://maplibre.org/

### Artigos Tecnicos
- iFood Tech - Areas de entrega: https://medium.com/ifood-tech/como-resolvemos-os-problemas-das-areas-de-entrega-dos-restaurantes-no-ifood-957bb13a7297
- Uber Blog - H3: https://www.uber.com/us/en/blog/h3/
- H3 Tabela de Resolucoes: https://h3geo.org/docs/core-library/restable/
- IBGE - Setores censitarios auxiliam gestao publica: https://agenciadenoticias.ibge.gov.br/agencia-noticias/2012-agencia-de-noticias/noticias/39525-censo-2022-informacoes-de-populacao-e-domicilios-por-setores-censitarios-auxiliam-gestao-publica
- Divisoes administrativas Brasil (Vinicius Oike): https://restateinsight.com/posts/general-posts/2024-04-brazil-shapes/

---

## 8. Decisao

**Recomendacao final:** Modelo hibrido em 3 camadas (Setores IBGE + Bairros + H3).

**Justificativa:**
- Setores censitarios sao a unica base com granularidade + dados demograficos + cobertura 100%
- Bairros dao significado humano aos dados (politicos e militantes entendem bairros, nao setores)
- H3 permite analise comparativa justa e modelos preditivos
- O modelo e incremental - Fase 1 ja entrega valor, Fases 2-4 refinam

**Risco principal:** Volume de dados (452K setores + geometrias complexas). Mitigacao: tiles vetoriais (MVT) via PostGIS/Martin para renderizacao eficiente no MapLibre.
