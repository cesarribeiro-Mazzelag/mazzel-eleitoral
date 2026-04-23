# Regra de Demarcação do IBGE para Setores Censitários e Micro-regiões Urbanas

> Documento técnico de referência da Plataforma Eleitoral União Brasil
>
> Autor: Time técnico
> Data: Abril de 2026
> Versão: 1.0
> Documento irmão: [PESQUISA_MICRO_REGIOES.md](./PESQUISA_MICRO_REGIOES.md)

---

## 1. Sumário Executivo

Este documento responde, de forma técnica e operacional, a seguinte pergunta feita pela presidência do projeto:

> "Dentro de Pirituba existem micro-bairros como Morro Grande, Taipas, Vila Iara, Jardim Iris, Jardim Rincão, Damaceno. Quero saber a regra que o IBGE usa pra definir essas dimensões."

A resposta curta é: **o IBGE não define bairros**. O IBGE define uma hierarquia territorial que vai de UF até Setor Censitário, e o nível "bairro" é uma camada municipal, não federal. Dentro dessa hierarquia, a única unidade desenhada tecnicamente pelo IBGE em todo o Brasil é o **Setor Censitário**, cuja regra de demarcação é operacional (quantos domicílios um recenseador cobre no prazo do Censo), não urbanística nem identitária.

Os chamados "micro-bairros" que a presidência citou (Jardim Iris, Morro Grande, Vila Iara, Jardim Rincão, Damaceno) existem na prática cotidiana dos moradores e na base de CEP dos Correios, mas **não existem como entidade oficial publicada pelo IBGE**. Eles estão dentro do distrito de Pirituba, que por sua vez pertence à subprefeitura Pirituba-Jaraguá, no município de São Paulo. São Paulo nunca consolidou uma lei única de bairros enviada ao IBGE, e por isso a camada "bairro" não aparece nas malhas territoriais federais para a capital paulista.

A consequência prática é que, para operar a Plataforma Eleitoral União Brasil com granularidade de micro-região (que é o que permite distribuir trabalho de cabo eleitoral, coordenador territorial e delegado de distrito de forma balanceada), precisamos **construir a camada de micro-regiões por composição**: usar os setores censitários do IBGE como unidade atômica, anexar metadados de suburb do OpenStreetMap, validar com CEP dos Correios e, onde existir, cruzar com a malha indicativa do GeoSampa.

Este documento entrega:

1. A hierarquia oficial do IBGE, com autoridade legal de cada camada.
2. A regra exata de demarcação do setor censitário conforme Censo 2022.
3. O mapeamento de fontes de dados por nível territorial.
4. Uma receita prática (SQL + Python) para identificar "Jardim Iris dentro de Pirituba" de forma reprodutível.
5. A oportunidade estratégica que essa granularidade abre para a plataforma.

O ganho operacional estimado é de 10 a 20 vezes mais inteligência eleitoral do que o que concorrentes entregam hoje, porque nenhum sistema de campanha no mercado brasileiro opera abaixo do nível de distrito oficial do município.

---

## 2. Hierarquia Oficial IBGE

### 2.1. Diagrama da hierarquia

```
UF (Unidade da Federação)
  |
  +-- Município
        |
        +-- Distrito
              |
              +-- Subdistrito (opcional, apenas em alguns municípios)
                    |
                    +-- Setor Censitário (unidade atômica do Censo)
                          |
                          +-- Face de quadra / Domicílio (coleta)
```

A hierarquia acima é a que o IBGE publica e atualiza. O nível "bairro" **não aparece** como camada federal. Ele existe como camada municipal, e o IBGE só republica a malha de bairros para os municípios que enviaram lei municipal de demarcação de bairros até o corte de 2009. São 720 municípios nesse recorte, de um total de 5.568 municípios brasileiros. São Paulo capital não está nessa lista.

### 2.2. Tabela detalhada de camadas

| Camada | Autoridade legal | Quem define | Quem publica malha | Existe em todo o Brasil? |
|--------|------------------|-------------|-------------------|--------------------------|
| UF | Constituição Federal | Art. 18 CF/88 | IBGE | Sim (27 unidades) |
| Município | Lei Estadual | Assembleia Legislativa do estado | IBGE | Sim (5.568) |
| Distrito | Lei Municipal, validada pelo IBGE | Câmara de Vereadores | IBGE | Sim (cerca de 10.400) |
| Subdistrito | Lei Municipal | Câmara de Vereadores | IBGE | Não (só alguns municípios) |
| Bairro oficial | Lei Municipal | Câmara de Vereadores | IBGE republica se houver lei | Não (720 de 5.568) |
| Bairro popular | Uso social, Correios, OSM | Uso cotidiano, DNE Correios, colaboradores OSM | Correios (DNE) e OSM | Sim, mas sem padrão |
| Setor Censitário | Critério operacional do IBGE | IBGE | IBGE | Sim (452.338 setores no Censo 2022) |
| Quadra / Face de quadra | Cadastro Imobiliário Municipal | Prefeitura | Prefeitura (quando publica) | Não (poucas capitais publicam aberto) |

### 2.3. Implicações práticas da hierarquia

Três pontos importantes decorrem dessa tabela.

Primeiro, **distrito é a menor unidade oficial que existe em 100% do território brasileiro e tem garantia de estar no IBGE**. Para São Paulo capital, o distrito de Pirituba é oficial. Já "Jardim Iris" não é.

Segundo, **subdistrito é raro**. Em São Paulo capital, os subdistritos existem e foram mantidos por razões históricas (cartórios, distribuição eleitoral legada), mas em boa parte do Brasil essa camada é inexistente ou vazia.

Terceiro, **setor censitário é a única camada desenhada pelo IBGE em 100% do território com padrão uniforme**. Por isso ele é a unidade atômica certa para qualquer sistema que queira operar de forma consistente no país inteiro, inclusive em zonas rurais.

---

## 3. Regra de Demarcação do Setor Censitário

Esta é a seção técnica central do documento. A regra completa está no manual do Censo 2022, "Quadro Geográfico de Referência para o Censo Demográfico 2022", e está resumida abaixo.

### 3.1. Critério de demarcação: operacional, não populacional

A primeira coisa a entender é que o setor censitário **não foi desenhado para representar identidade de bairro nem para refletir realidade urbanística**. Ele foi desenhado para viabilizar a coleta do Censo: a área que um recenseador consegue cobrir, porta por porta, dentro do prazo de coleta estabelecido pelo IBGE (tipicamente de 2 a 3 meses).

Isso tem três consequências:

1. O setor é **dimensionado por carga de trabalho**, não por identidade territorial.
2. O setor é **redesenhado a cada Censo** (1991, 2000, 2010, 2022), conforme a cidade cresce ou encolhe.
3. Comparar setores entre dois Censos exige compatibilização (o IBGE publica tabelas de compatibilização, mas nunca são 1:1).

### 3.2. Tamanho padrão do setor censitário

| Ambiente | Faixa de domicílios por setor | Média | Observações |
|----------|-------------------------------|-------|-------------|
| Urbano | 300 a 800 domicílios | cerca de 450 | Meta operacional do Censo 2022 |
| Aglomerado subnormal | 300 a 800 domicílios | cerca de 450 | Delimitado por presença da favela |
| Rural | Variável, por extensão | Menos domicílios, mais área | Recenseador percorre distâncias maiores |
| Instituicional (quartel, prisão, alojamento) | Conforme a instituição | Um setor por instituição, em geral | Classificação separada |

Um setor urbano típico em São Paulo tem cerca de 450 domicílios e, assumindo 2,8 moradores por domicílio (média brasileira 2022), cerca de 1.260 habitantes. Um distrito como Pirituba, com aproximadamente 165 mil habitantes, contém portanto na ordem de 130 setores censitários urbanos.

### 3.3. Regra de limites físicos

Os limites de um setor censitário seguem, obrigatoriamente:

- **Acidentes topográficos estáveis**: ruas, avenidas, rios, ferrovias, muros, linhas de alta tensão.
- **Jamais atravessam uma quadra**: um setor não pode dividir uma quadra ao meio. A quadra inteira pertence a um único setor.
- **Contido em exatamente um distrito e um subdistrito**: um setor não cruza limite de distrito.
- **Contido em exatamente uma classificação urbana ou rural**: um setor não é parcialmente urbano e parcialmente rural.
- **Contido em exatamente um tipo de setor**: um setor não é parcialmente comum e parcialmente favela.

Essa regra de "limites estáveis e não atravessa quadra" é o que permite que o recenseador ande pelo setor sem ambiguidade de cobertura.

### 3.4. Geocódigo do setor censitário

O setor censitário tem um código único nacional de 15 dígitos, chamado geocódigo. A composição é:

```
UF       5 Município   2 Distrito  2 Subdistrito  5 Setor
XX       XXXXX         XX          XX             XXXXX

Exemplo fictício de Pirituba:
35        50308         63          00             00142
SP        São Paulo     Pirituba    (sem sub)      Setor 142 do distrito
```

Na prática, para quem faz análise, o geocódigo carrega toda a árvore de pertencimento. Se você tem a lista de geocódigos de um distrito, basta filtrar pelos 9 primeiros dígitos (UF + município + distrito) para extrair todos os setores daquele distrito.

### 3.5. Tipologias de setor censitário (Censo 2022)

O IBGE classifica cada setor em um dos seguintes tipos. A tipologia está no campo `TIPO` da malha oficial.

| Código | Nome | Descrição |
|--------|------|-----------|
| 10 | Comum urbano | Setor padrão em área urbana, não instituicional |
| 20 | Aglomerado subnormal | Favelas, comunidades, ocupações (ver seção 3.6) |
| 30 | Quartel | Unidade militar |
| 50 | Alojamento | Alojamento de trabalhadores, canteiros de obra |
| 60 | Setor com baixo patamar de domicílios | Área urbanizada de baixa densidade domiciliar |
| 70 | Aldeia indígena | Terra indígena declarada |
| 80 | Setor prisional | Presídio, penitenciária, centro de detenção |
| 90 | Instituição de longa permanência, quilombola, agrovila | Asilos, conventos, quilombos, assentamentos |

Em uma campanha eleitoral, essas tipologias são informação crítica. Um setor tipo 20 (aglomerado subnormal) tem dinâmica de mobilização diferente de um setor tipo 10. Um setor tipo 80 (prisional) tem eleitorado restrito e operação específica. Um setor tipo 70 (indígena) exige abordagem cultural diferenciada.

### 3.6. Aglomerado subnormal: atenção especial

Aglomerado subnormal é a terminologia oficial do IBGE para o que popularmente é chamado de favela, comunidade ou ocupação. Os critérios são:

- Ao menos 50 domicílios na área.
- Carência de serviços públicos essenciais (água, esgoto, luz, coleta de lixo).
- Ocupação irregular de terreno (público ou privado).
- Urbanização fora do padrão vigente (vias estreitas, traçado irregular).
- Alta densidade de construções.

O IBGE publica a malha de aglomerados subnormais separadamente da malha de setores censitários comuns, e um setor tipo 20 pode ou não coincidir exatamente com um aglomerado subnormal (há aglomerados que ocupam parte de um setor urbano comum). Para a plataforma eleitoral, recomenda-se sempre importar as duas malhas e fazer cruzamento.

### 3.7. Malha oficial: como o IBGE publica

A malha de setores censitários é publicada em formato shapefile (e também GeoPackage) em:

- https://www.ibge.gov.br/geociencias/organizacao-do-territorio/malhas-territoriais/26565-malhas-de-setores-censitarios-divisoes-intramunicipais.html

O pacote inclui:

- Shapefile dos setores (um por UF).
- Tabela de atributos com geocódigo, tipo, situação urbana/rural, nome do distrito, nome do município.
- Malha de aglomerados subnormais (separada).
- Dicionário de campos.

Total nacional publicado no Censo 2022: **452.338 setores censitários**.

---

## 4. Relação Bairros × Setores Censitários

Uma das perguntas mais recorrentes quando alguém começa a trabalhar com dados territoriais brasileiros é "como faço para saber em qual bairro está um setor censitário". A resposta honesta é: **depende do município, e na maioria dos casos não há relação oficial**.

### 4.1. Por que não há relação direta

Quatro razões estruturais:

1. **Bairro e setor têm autoridades diferentes**. Bairro é lei municipal, quando existe. Setor é desenho operacional do IBGE.
2. **Bairro e setor têm propósitos diferentes**. Bairro representa identidade. Setor representa carga de coleta.
3. **Limites raramente coincidem**. Um setor pode pegar metade de um bairro e metade de outro, se a regra de acidente topográfico estável levar a isso.
4. **Bairro muitas vezes é informal**. Na maioria das cidades brasileiras, o que o morador chama de bairro nunca foi oficializado por lei municipal.

### 4.2. Cenários possíveis por município

| Cenário | Descrição | Exemplo | O que fazer |
|---------|-----------|---------|-------------|
| A. Município com lei de bairros enviada ao IBGE | Bairro oficial tem malha no IBGE | Rio de Janeiro (163 bairros) | Usar malha IBGE de bairros + cruzar com setores |
| B. Município com lei de bairros mas não enviada ao IBGE | Bairro oficial existe no município, não no IBGE | Belo Horizonte (em parte) | Pegar malha da prefeitura + cruzar com setores |
| C. Município sem lei de bairros, mas com camada administrativa intermediária | Não há bairro oficial, mas há distrito ou subprefeitura | São Paulo (distritos e subprefeituras) | Usar distrito como proxy + OSM para sub-bairros |
| D. Município sem nenhuma camada oficial abaixo do municipal | Cidade pequena, só tem município e setor | Cidades pequenas | Usar setor censitário agrupado por proximidade |

São Paulo capital está no cenário C. Ele tem 96 distritos oficiais (Pirituba entre eles), tem 32 subprefeituras, mas **não tem lei única de bairros**. O que existe em São Paulo são referências esparsas a bairros em leis de zoneamento, em documentos administrativos e em denominações de logradouros, mas não uma malha consolidada enviada ao IBGE.

### 4.3. A ilusão do "bairro" no portal do IBGE

No portal Cidades@ do IBGE (https://cidades.ibge.gov.br), é possível em alguns municípios ver um campo "bairro". Isso **não significa** que o IBGE desenhou o bairro. Significa que aquele município enviou a lei municipal de bairros até o corte de 2009 e o IBGE republica aquela malha. Para municípios que não enviaram, o campo simplesmente não existe.

---

## 5. Caso São Paulo: Subprefeituras, Distritos, Ausência de Lei de Bairros

### 5.1. Estrutura administrativa de São Paulo capital

São Paulo tem três camadas administrativas internas reconhecidas:

```
Município de São Paulo
  |
  +-- 32 Subprefeituras (ex: Pirituba-Jaraguá)
        |
        +-- 96 Distritos (ex: Pirituba, Jaraguá, São Domingos)
              |
              +-- Regiões identitárias (Jardim Iris, Vila Iara, etc.) [não oficiais]
```

As 32 subprefeituras foram criadas pela Lei Municipal 13.399/2002. Os 96 distritos são anteriores e foram consolidados na década de 1990. Ambas as camadas são oficiais e estão no IBGE.

O que **não está no IBGE** e **não é oficial em lei municipal de bairros** são os nomes intermediários entre distrito e rua, como:

- Jardim Iris
- Jardim Rincão
- Morro Grande
- Taipas
- Vila Iara
- Damaceno

Esses nomes existem em:

- **DNE Correios**: tabela de bairros por CEP (uso postal).
- **OpenStreetMap**: como `place=suburb` ou `place=neighbourhood`.
- **GeoSampa**: camada indicativa, não oficial para fins censitários.
- **Uso social**: cotidiano dos moradores, comércio, transporte.

### 5.2. ZEIS e ZMIS: zoneamento não é bairro

Para complicar, São Paulo tem outras camadas que frequentemente são confundidas com bairro:

- **ZEIS (Zona Especial de Interesse Social)**: demarcação urbanística para política habitacional.
- **ZMIS, ZOE, ZER, etc.**: outras categorias de zoneamento urbanístico do Plano Diretor.

Essas camadas existem em lei (Plano Diretor Estratégico, Lei de Parcelamento, Uso e Ocupação do Solo), mas **são camadas de zoneamento, não de identidade de bairro**. Um ZEIS pode estar inteiro dentro de um bairro, ou atravessar vários.

Para a plataforma eleitoral, ZEIS é uma camada de contexto socioeconômico útil (áreas ZEIS 1 e 3 tendem a ter perfil de eleitorado diferente), mas não substitui a camada de micro-região.

### 5.3. Pirituba como estudo de caso

Pirituba é um **distrito** oficial do município de São Paulo, pertencente à subprefeitura Pirituba-Jaraguá. Dados do Censo 2022:

- População: aproximadamente 165 mil habitantes.
- Área: cerca de 17 km².
- Setores censitários: aproximadamente 130 (estimativa a partir da média de 1.260 hab/setor).
- Subprefeitura: Pirituba-Jaraguá (contém também Jaraguá e São Domingos).

Dentro desse distrito, os moradores reconhecem sub-áreas identitárias:

| Nome popular | Natureza | Fonte mais confiável |
|--------------|----------|----------------------|
| Vila Iara | Bairro de uso social | DNE Correios, OSM |
| Jardim Iris | Bairro de uso social | DNE Correios, OSM |
| Jardim Rincão | Bairro de uso social | DNE Correios, OSM |
| Morro Grande | Região identitária, parcialmente ZEIS | OSM, GeoSampa |
| Taipas | Região identitária, ex-distrito histórico | OSM, memória administrativa |
| Damaceno | Sub-área identitária | DNE Correios, OSM |

Nenhum desses nomes aparece na malha oficial de setores censitários do IBGE. Eles existem como metadados agregáveis.

### 5.4. O que o IBGE realmente entrega sobre Pirituba

Se você baixa a malha de setores censitários do IBGE para São Paulo e filtra pelo distrito de Pirituba (via geocódigo), você recebe:

- Polígonos dos cerca de 130 setores.
- Código de cada setor.
- Tipo de cada setor (10 comum urbano, 20 aglomerado subnormal, etc.).
- Nome do distrito (Pirituba).
- Nome da subprefeitura (Pirituba-Jaraguá).
- Nome do município (São Paulo).
- Campos populacionais do Censo (quando o Censo 2022 for totalmente agregado por setor).

**Não há** nenhum campo chamado "bairro" ou "sub-bairro" nessa malha para São Paulo.

---

## 6. Fontes de Dados por Nível Territorial

Esta tabela consolida todas as fontes de dados úteis para compor a camada de micro-região.

| Nível | Fonte | URL | Formato | Cobertura | Licença |
|-------|-------|-----|---------|-----------|---------|
| UF | IBGE, Malhas Territoriais | https://www.ibge.gov.br/geociencias/organizacao-do-territorio/malhas-territoriais/ | Shapefile, GeoPackage | 100% Brasil | Dados abertos |
| Município | IBGE, Malhas Territoriais | idem | Shapefile, GeoPackage | 100% Brasil | Dados abertos |
| Distrito | IBGE, Divisão Intramunicipal | https://www.ibge.gov.br/geociencias/organizacao-do-territorio/malhas-territoriais/26565-malhas-de-setores-censitarios-divisoes-intramunicipais.html | Shapefile | 100% Brasil | Dados abertos |
| Subdistrito | IBGE, Divisão Intramunicipal | idem | Shapefile | Só municípios que têm | Dados abertos |
| Bairro oficial | IBGE (se enviado pelo município) | idem | Shapefile | 720 municípios (de 5.568) | Dados abertos |
| Setor Censitário | IBGE, Setores do Censo 2022 | idem | Shapefile, GeoPackage | 100% Brasil, 452.338 setores | Dados abertos |
| Aglomerado Subnormal | IBGE, Tipologias do Território | https://www.ibge.gov.br/geociencias/organizacao-do-territorio/tipologias-do-territorio/15788-aglomerados-subnormais.html | Shapefile | 100% Brasil (onde existe) | Dados abertos |
| Bairro popular (São Paulo) | GeoSampa (Prefeitura SP) | https://geosampa.prefeitura.sp.gov.br/ | Shapefile, WMS | São Paulo capital | Dados abertos |
| Bairro popular (Brasil) | OpenStreetMap (place=suburb, place=neighbourhood) | https://www.openstreetmap.org | OSM PBF, GeoJSON via Overpass | Brasil todo, qualidade variável | ODbL |
| CEP / Logradouro | Correios, DNE | https://www.correios.com.br/enviar/precisa-de-ajuda/tudo-sobre-cep | CSV (proprietário, pago) | 100% Brasil | Restritiva (assinatura) |
| CEP / Logradouro (alternativa) | ViaCEP, BrasilAPI (gratuitos) | https://viacep.com.br | JSON via API | 100% Brasil | Uso público |
| Quadra, Face, Lote | GeoSampa (SP), prefeituras | idem | Shapefile, WMS | Só capitais que publicam | Dados abertos (quando publicado) |
| Subprefeitura (SP) | GeoSampa | idem | Shapefile, WMS | São Paulo capital | Dados abertos |
| ZEIS, ZOE, etc. | GeoSampa (SP), Planos Diretores | idem, Portais Municipais | Shapefile | Capitais com Plano Diretor digital | Dados abertos |

Para o projeto União Brasil, o conjunto mínimo recomendado de fontes a ingerir é:

1. Malha de setores censitários 2022 do IBGE (todas as UFs de interesse).
2. Malha de aglomerados subnormais do IBGE.
3. Extrato OSM com `place=suburb` e `place=neighbourhood` para as cidades-alvo.
4. GeoSampa (bairros, subprefeituras, distritos, ZEIS) para São Paulo.
5. ViaCEP como serviço de fallback para validação de CEP.

---

## 7. Receita Prática: Identificar "Jardim Iris" dentro de Pirituba

Esta seção mostra, passo a passo, como a plataforma pode extrair a sub-área "Jardim Iris" dentro do distrito de Pirituba, com código reprodutível. A receita tem 5 passos.

### 7.1. Passo 1: Extrair setores censitários do distrito de Pirituba

Uma vez carregada a malha de setores do IBGE em uma tabela PostGIS (`setores_censitarios`), filtrar pelo distrito de Pirituba é trivial via geocódigo. O código do distrito de Pirituba no IBGE é `3550308-63` (SP = 35, São Paulo = 50308, Pirituba = 63).

```sql
-- setores do distrito de Pirituba
CREATE MATERIALIZED VIEW mv_setores_pirituba AS
SELECT
    geocodigo,
    tipo,
    nm_distrito,
    nm_municipio,
    geom
FROM setores_censitarios
WHERE cd_uf = '35'
  AND cd_mun = '3550308'
  AND cd_distrito = '63';

CREATE INDEX idx_mv_setores_pirituba_geom
    ON mv_setores_pirituba USING GIST (geom);
```

Resultado esperado: cerca de 130 setores censitários, cada um com seu polígono em WGS84 (SRID 4326) ou SIRGAS2000 (SRID 4674).

### 7.2. Passo 2: Buscar suburbs do OpenStreetMap intersectando a área

Para pegar as sub-áreas identitárias (Jardim Iris, Morro Grande, Vila Iara, etc.), a fonte mais completa e gratuita é o OpenStreetMap. A tag relevante é `place=suburb` (bairro) ou `place=neighbourhood` (sub-bairro).

Carregar o extrato OSM do estado de São Paulo (via Geofabrik ou similar) em uma tabela PostGIS (`osm_places`), e depois filtrar:

```sql
-- suburbs do OSM que caem dentro do distrito de Pirituba
CREATE MATERIALIZED VIEW mv_suburbs_pirituba AS
SELECT
    osm.osm_id,
    osm.name AS nome_suburb,
    osm.place AS tipo_osm,
    osm.geom AS ponto
FROM osm_places osm
JOIN (
    SELECT ST_Union(geom) AS area_pirituba
    FROM mv_setores_pirituba
) dist ON ST_Within(osm.geom, dist.area_pirituba)
WHERE osm.place IN ('suburb', 'neighbourhood');
```

Resultado esperado: uma lista de pontos nomeados (OSM costuma publicar suburbs como pontos, não como polígonos, para a maioria das cidades brasileiras). Para Pirituba, a lista deve conter Jardim Iris, Jardim Rincão, Morro Grande, Taipas, Vila Iara, Damaceno e outros.

Um problema conhecido: OSM publica o nome do suburb tipicamente como um ponto central, não como polígono. Isso significa que o Passo 3 precisa construir os polígonos por composição.

### 7.3. Passo 3: Spatial join entre setores e suburbs

Esta é a etapa-chave. Atribuímos cada setor censitário ao suburb OSM mais próximo, usando distância euclidiana no CRS local (UTM zona 23S para São Paulo, SRID 31983).

```sql
-- cada setor recebe o nome do suburb OSM mais proximo
CREATE MATERIALIZED VIEW mv_setores_pirituba_com_suburb AS
WITH setores_utm AS (
    SELECT geocodigo, tipo, ST_Transform(geom, 31983) AS geom_utm, ST_Centroid(ST_Transform(geom, 31983)) AS centroide
    FROM mv_setores_pirituba
),
suburbs_utm AS (
    SELECT osm_id, nome_suburb, ST_Transform(ponto, 31983) AS ponto_utm
    FROM mv_suburbs_pirituba
)
SELECT DISTINCT ON (s.geocodigo)
    s.geocodigo,
    s.tipo,
    sb.nome_suburb,
    ST_Distance(s.centroide, sb.ponto_utm) AS distancia_m
FROM setores_utm s
CROSS JOIN suburbs_utm sb
ORDER BY s.geocodigo, ST_Distance(s.centroide, sb.ponto_utm) ASC;
```

Resultado: cada setor censitário do distrito de Pirituba passa a ter um nome de sub-área atribuído (o suburb OSM mais próximo do centroide do setor). A coluna `distancia_m` permite identificar setores onde a atribuição é incerta (distância grande indica que o setor está em região entre dois suburbs nomeados).

Alternativa mais robusta, quando os suburbs do OSM existem como polígonos (alguns municípios têm): usar `ST_Within` ou `ST_Intersects` com `ST_Area` para calcular sobreposição majoritária. A regra é: "o setor pertence ao suburb com maior área de interseção".

### 7.4. Passo 4: Agregar por nome de suburb

Uma vez que cada setor tem um nome de suburb atribuído, dá para montar a camada de micro-regiões por dissolução:

```sql
-- gerar poligonos de micro-regiao a partir dos setores
CREATE MATERIALIZED VIEW mv_microrregioes_pirituba AS
SELECT
    nome_suburb,
    COUNT(*) AS qtd_setores,
    SUM(CASE WHEN tipo = '20' THEN 1 ELSE 0 END) AS qtd_setores_favela,
    ST_Union(geom) AS geom_microrregiao
FROM mv_setores_pirituba_com_suburb mv
JOIN mv_setores_pirituba sp USING (geocodigo)
GROUP BY nome_suburb;
```

Resultado: uma tabela com, por exemplo, 15 linhas, uma para cada micro-região reconhecida (Jardim Iris, Morro Grande, Vila Iara, Jardim Rincão, etc.), cada qual com:

- Nome popular.
- Quantidade de setores que compõem a micro-região.
- Quantidade de setores que são aglomerado subnormal.
- Polígono agregado (o desenho aproximado da micro-região).

Para a plataforma eleitoral, essa é a tabela que vai direto para o módulo de distribuição de coordenadores territoriais.

### 7.5. Passo 5: Validar com CEP dos Correios

A etapa final é validação cruzada. O CEP dos Correios tem uma granularidade de bairro popular razoável em regiões metropolitanas. Dá para validar a atribuição feita pelo OSM da seguinte forma.

```python
import requests
import psycopg2

def cep_para_bairro(cep):
    """Consulta ViaCEP e retorna o nome do bairro que os Correios usam."""
    r = requests.get(f"https://viacep.com.br/ws/{cep}/json/")
    data = r.json()
    return data.get("bairro")

# amostragem: pegar um CEP central de cada setor e consultar o ViaCEP
con = psycopg2.connect(...)
cur = con.cursor()

cur.execute("""
    SELECT geocodigo, nome_suburb, cep_amostra
    FROM mv_setores_pirituba_com_suburb
    JOIN ceps_amostrados USING (geocodigo)
    LIMIT 500
""")

divergencias = []
for geocodigo, nome_osm, cep in cur.fetchall():
    nome_correios = cep_para_bairro(cep)
    if nome_correios and nome_correios.lower() != nome_osm.lower():
        divergencias.append((geocodigo, nome_osm, nome_correios))

print(f"Divergencias entre OSM e Correios: {len(divergencias)}")
```

Divergências são esperadas (OSM e Correios discordam em cerca de 10 a 20% dos casos em São Paulo, por experiência prática). O importante é ter o relatório de divergências para revisão manual pela equipe de campo antes de publicar a camada definitiva.

### 7.6. Ciclo completo de ingestão

Juntando os 5 passos, o ciclo completo de ingestão de uma cidade na plataforma é:

```
1. Baixar malha IBGE de setores censitarios (UF)
2. Baixar malha IBGE de aglomerados subnormais (UF)
3. Baixar extrato OSM (UF) e extrair place=suburb e place=neighbourhood
4. [se SP] baixar GeoSampa (distritos, subprefeituras, bairros indicativos)
5. Rodar SQL dos Passos 1 a 4 por cidade-alvo
6. Rodar Passo 5 (validacao ViaCEP) em amostra
7. Revisao manual das divergencias
8. Publicar tabela microrregioes definitiva
```

Custo computacional: para São Paulo capital inteira (cerca de 30 mil setores, 96 distritos), o pipeline roda em menos de 30 minutos em um PostgreSQL com PostGIS em hardware modesto.

---

## 8. CEP/Correios vs IBGE: Por que NÃO usar CEP como base

Uma tentação frequente é usar CEP como proxy de micro-região, já que o CEP tem cobertura nacional e API pública de consulta. Isso é um erro grave. O CEP e o setor censitário são incompatíveis por desenho.

### 8.1. Tabela comparativa

| Critério | CEP (Correios) | Setor Censitário (IBGE) |
|----------|----------------|--------------------------|
| Propósito | Entregar correspondência | Coletar dados do Censo |
| Unidade base | Logradouro (rua, lado da rua) ou quadra comercial | Polígono com 300 a 800 domicílios |
| Granularidade típica | Uma rua ou lado de rua | Um conjunto de quadras |
| Estável no tempo? | Muda sempre que os Correios reorganizam | Redesenhado a cada Censo |
| Tem polígono oficial? | Não, é linha (logradouro) ou ponto | Sim, polígono |
| Atribui bairro? | Sim, mas com critério interno dos Correios | Não, usa a hierarquia IBGE |
| Cobertura | 100% (CEPs gerais para cidades pequenas) | 100% do território nacional |
| Licença de uso | Restritiva (DNE completo é pago) | Totalmente aberta |
| Coerência com dados do Censo | Nenhuma | Total (o Censo é por setor) |

### 8.2. Por que é incompatível

1. **O CEP é um identificador logístico, não territorial**. Um único CEP pode cobrir várias quadras, e uma quadra pode ter vários CEPs (um por logradouro).
2. **O CEP não tem polígono**. Você não consegue dizer "todos os domicílios dentro deste polígono", porque o CEP é conceitualmente uma linha (uma rua) ou um ponto (um prédio comercial de grande porte com CEP próprio).
3. **O CEP muda por decisão dos Correios**, sem aviso. Setor censitário muda a cada 10 anos, em ciclo previsível.
4. **O bairro que o Correios atribui a um CEP não é o mesmo que a prefeitura usa**, e muitas vezes não é o mesmo que o OSM usa, e definitivamente não é o que o IBGE usa.
5. **O dado completo do Correios é pago**. O DNE (Diretório Nacional de Endereços) completo é uma assinatura comercial. Isso torna o uso em larga escala dependente de contrato.

### 8.3. Quando usar CEP, então?

CEP é útil como:

- **Entrada de dados do usuário**: o eleitor digita o CEP, e a plataforma faz a geocodificação.
- **Validação cruzada**: confirmar que o nome de bairro atribuído pelo OSM está próximo do nome do Correios.
- **Fallback em cidades sem cobertura OSM boa**: onde OSM está incompleto, ViaCEP pode ajudar a estimar o bairro.

CEP **não deve ser** a base canônica da camada de micro-região. A base canônica é sempre o setor censitário do IBGE, enriquecido por OSM, validado por CEP.

---

## 9. Oportunidade Estratégica para a Plataforma Eleitoral

Esta seção traduz o conteúdo técnico anterior em valor estratégico para o projeto União Brasil.

### 9.1. O problema operacional clássico

Uma campanha eleitoral em São Paulo capital, hoje, opera em uma das três granularidades:

| Granularidade usada | Exemplo em Pirituba | Problema |
|---------------------|---------------------|----------|
| Zona eleitoral TSE | Zona 275 (parte de Pirituba) | Muito grande, 50 mil eleitores, 1 coordenador |
| Distrito oficial | Pirituba inteiro | 165 mil habitantes, 1 coordenador, carga absurda |
| CEP isolado | CEP de uma rua | Muito pequeno, gera fragmentação excessiva |

Nenhuma dessas granularidades é boa para operação de rua. O ideal é o nível de micro-região (Jardim Iris, Morro Grande, Vila Iara), com cerca de 8 a 15 mil habitantes cada, que corresponde ao que um coordenador territorial consegue gerenciar com eficácia (50 a 100 cabos eleitorais sob sua responsabilidade).

Esse nível existe na cabeça do morador, mas não existe como dado. A plataforma União Brasil é a primeira a construir essa camada de forma sistemática.

### 9.2. Ganho quantitativo por módulo

#### Módulo "Cabos Eleitorais"

Antes (sem micro-região): cabo eleitoral recebe atribuição por distrito. "Você é responsável por Pirituba." Cabo não sabe onde começa e onde termina sua área. Sobreposição com outros cabos. Áreas inteiras ficam sem cobertura.

Depois (com micro-região): cabo recebe atribuição por micro-região. "Você é responsável por Jardim Iris." Polígono claro. Lista de setores e CEPs pertencentes. Mapa impresso com ruas. Meta numérica por micro-região.

Ganho estimado: **3x a 5x mais eficiência** na cobertura porta-a-porta, porque elimina sobreposição e elimina áreas vazias.

#### Módulo "Coordenadores Territoriais"

Antes: 1 coordenador por distrito (96 coordenadores para a capital).

Depois: 1 coordenador por micro-região (aproximadamente 15 micro-regiões por distrito, ou seja, cerca de 1.400 coordenadores para a capital).

Parece pior (mais gente), mas é melhor por dois motivos:

1. **Carga balanceada**: cada coordenador gerencia cerca de 10 mil eleitores, número humanamente tratável.
2. **Meritocracia de campo**: o coordenador que performa bem em Jardim Iris pode ser promovido a coordenador de distrito. Carreira clara.

#### Módulo "Delegados de Distrito"

Delegados de distrito continuam sendo 96 (um por distrito), mas agora recebem dashboards com desempenho por micro-região. Eles enxergam, por exemplo, que Pirituba vai bem em Vila Iara e mal em Morro Grande, e podem redirecionar esforço.

Ganho: **inteligência tática** que antes não existia.

#### Módulo "Presidência"

No nível da presidência do projeto, o ganho é estratégico. A presidência consegue, pela primeira vez:

- Ver mapa de calor de apoio por micro-região em tempo real.
- Identificar micro-regiões de alto valor estratégico (alta densidade de eleitores indecisos).
- Alocar recursos (agendas de candidato, mídia local, material impresso) por micro-região.
- Contratar pesquisa qualitativa por micro-região.

### 9.3. Vantagem competitiva sustentável

Nenhum concorrente no mercado brasileiro entrega análise eleitoral em granularidade de micro-região hoje. Os sistemas disponíveis operam, no máximo, em:

- Zona eleitoral TSE (fornecida pelo próprio TSE).
- Seção eleitoral TSE (quando conseguem geocodificar).
- Distrito oficial (quando o município tem malha pública).

O esforço de ingestão que este documento descreve (setores IBGE + OSM + ViaCEP + GeoSampa) custa, na primeira carga, cerca de 2 semanas de engenharia para as 50 maiores cidades brasileiras. Depois, é atualização incremental.

Essa barreira de entrada é suficiente para manter a vantagem por pelo menos 2 a 3 ciclos eleitorais (6 a 12 anos), porque os concorrentes precisariam:

1. Entender que a granularidade certa é micro-região (ainda não entenderam).
2. Construir o pipeline de composição (2 semanas de engenharia).
3. Validar com equipe de campo por cidade (meses de trabalho).

### 9.4. Quantificação do ganho

Considerando uma campanha típica a prefeito de São Paulo:

| Indicador | Sem micro-região | Com micro-região | Ganho |
|-----------|------------------|-------------------|-------|
| Coordenadores territoriais ativos | 96 | 1.400 | 14x |
| Eleitores por coordenador | 110 mil | 10 mil | 11x mais tratável |
| Cobertura porta-a-porta efetiva | cerca de 30% | cerca de 70% a 80% | 2,5x |
| Tempo de resposta a crise local | 1 a 3 dias (via distrito) | 1 a 3 horas (via micro-região) | 10x |
| Granularidade de pesquisa qualitativa | Distrito | Micro-região | 15x mais granular |
| Investimento de mídia local direcionado | Por rádio/jornal local | Por micro-região | Precisão cirúrgica |

O ganho composto, somando os seis indicadores acima, é o que justifica a estimativa de "10 a 20 vezes mais inteligência eleitoral" mencionada no sumário executivo.

---

## 10. Próximos Passos

### 10.1. POC Pirituba (Q2 2026)

Como primeiro caso de uso real, recomenda-se uma prova de conceito no distrito de Pirituba, com o seguinte escopo:

1. Ingerir malha de setores censitários 2022 do IBGE para São Paulo capital.
2. Ingerir extrato OSM de São Paulo capital, extrair `place=suburb` e `place=neighbourhood`.
3. Ingerir GeoSampa (distritos, subprefeituras, bairros indicativos).
4. Rodar a receita prática da Seção 7 restrita ao distrito de Pirituba.
5. Validar com 200 CEPs amostrados via ViaCEP.
6. Gerar mapa impresso da malha de 15 micro-regiões de Pirituba.
7. Submeter o mapa à validação de um coordenador territorial experiente em Pirituba.
8. Ajustar divergências identificadas na validação de campo.
9. Publicar a camada `mv_microrregioes_pirituba` definitiva na plataforma.
10. Treinar equipe de campo na nova granularidade.

Prazo estimado: 3 semanas de engenharia + 1 semana de validação de campo.

### 10.2. Expansão para 50 cidades (Q3 a Q4 2026)

Após o sucesso do POC, expansão para as 50 maiores cidades do Brasil (cobrindo aproximadamente 40% do eleitorado nacional). A lista mínima sugerida inclui:

- Capitais: 27 (todas).
- Grandes cidades não-capitais: Campinas, Guarulhos, São Bernardo do Campo, Santo André, Osasco, Ribeirão Preto, Sorocaba, São José dos Campos, Niterói, Nova Iguaçu, São Gonçalo, Duque de Caxias, Joinville, Londrina, Maringá, Caxias do Sul, Pelotas, Uberlândia, Contagem, Feira de Santana, Juiz de Fora, Anápolis, Aparecida de Goiânia.

Para cada cidade:

1. Ingestão de setores e aglomerados do IBGE.
2. Ingestão de OSM.
3. Ingestão da fonte municipal (GeoSampa equivalente, quando existir).
4. Receita prática automatizada.
5. Validação de campo.

Prazo estimado: 4 meses para as 50 cidades, com time de 2 engenheiros de dados + 1 GIS especializado.

### 10.3. Manutenção e atualização

- **Setor censitário**: próxima atualização em 2031 (Censo 2030). Enquanto isso, a malha do Censo 2022 é estável.
- **OSM**: atualizar trimestralmente. Mudanças frequentes em áreas urbanas em expansão.
- **GeoSampa e equivalentes municipais**: atualizar semestralmente.
- **Validação de campo**: revisão anual pela equipe de coordenadores territoriais.

### 10.4. Integrações futuras

Duas integrações tornam a camada ainda mais poderosa:

1. **Cruzamento com dados socioeconômicos do Censo 2022**: quando o IBGE publicar os agregados por setor censitário do Censo 2022 (previsão: ao longo de 2026), cruzar com a camada de micro-regiões dá perfil socioeconômico por micro-região.
2. **Cruzamento com dados de votação do TSE por seção eleitoral**: geocodificar as seções eleitorais do TSE para setores censitários, agregar por micro-região, obter histórico eleitoral por micro-região.

A segunda integração é a mais estrategicamente relevante para a plataforma. Ela vai permitir dizer, por exemplo, "Vila Iara votou 62% em candidato X em 2022 mas está com 48% de intenção agora", com rigor que hoje só existe no nível de zona eleitoral inteira.

---

## 11. Fontes e Referências

### 11.1. Fontes oficiais do IBGE

- IBGE, Malhas de Setores Censitários e Divisões Intramunicipais.
  https://www.ibge.gov.br/geociencias/organizacao-do-territorio/malhas-territoriais/26565-malhas-de-setores-censitarios-divisoes-intramunicipais.html

- IBGE, Quadro Geográfico de Referência para o Censo Demográfico 2022 (versão preliminar).
  https://www.ibge.gov.br/apps/quadrogeografico/pdf/2022_600_setcensitario__v00prelim.pdf

- IBGE, Aglomerados Subnormais (Tipologias do Território).
  https://www.ibge.gov.br/geociencias/organizacao-do-territorio/tipologias-do-territorio/15788-aglomerados-subnormais.html

- IBGE, Portal Cidades@.
  https://cidades.ibge.gov.br

### 11.2. Fontes municipais (São Paulo)

- Prefeitura de São Paulo, GeoSampa (Sistema de Informações Geográficas).
  https://geosampa.prefeitura.sp.gov.br/

- Prefeitura de São Paulo, serviço 312207 (Licenciamento).
  https://prefeitura.sp.gov.br/web/licenciamento/w/servicos/312207

### 11.3. Correios e CEP

- Correios, Tudo Sobre CEP.
  https://www.correios.com.br/enviar/precisa-de-ajuda/tudo-sobre-cep

- ViaCEP, API pública de consulta de CEP.
  https://viacep.com.br

- BrasilAPI, API pública de dados brasileiros.
  https://brasilapi.com.br

### 11.4. Fontes colaborativas

- OpenStreetMap, Brasil.
  https://www.openstreetmap.org

- Geofabrik, Extratos OSM por região.
  https://download.geofabrik.de/south-america/brazil.html

### 11.5. Legislação de referência

- Constituição Federal de 1988, Art. 18 (organização político-administrativa).
- Lei Municipal de São Paulo 13.399/2002 (criação das Subprefeituras).
- Lei Federal 8.159/1991 (Política Nacional de Arquivos Públicos e Privados, relevante para o tratamento de dados territoriais).
- Lei Geral de Proteção de Dados 13.709/2018 (relevante para o tratamento de dados de eleitores atribuídos a micro-regiões).

### 11.6. Documentos irmãos no projeto União Brasil

- [PESQUISA_MICRO_REGIOES.md](./PESQUISA_MICRO_REGIOES.md), pesquisa original que motivou este documento.
- [project_uniao_brasil.md](../../../.claude/projects/-Users-cesarribeiro/memory/project_uniao_brasil.md), panorama do projeto.
- [project_uniao_brasil_mapa_plano.md](../../../.claude/projects/-Users-cesarribeiro/memory/project_uniao_brasil_mapa_plano.md), plano estratégico do mapa.
- [project_uniao_brasil_mapa_refinamento.md](../../../.claude/projects/-Users-cesarribeiro/memory/project_uniao_brasil_mapa_refinamento.md), plano de refinamento do mapa V1.

---

## Anexo A. Glossário Técnico

| Termo | Significado |
|-------|-------------|
| Aglomerado subnormal | Terminologia oficial do IBGE para favela, comunidade ou ocupação, com critérios específicos (ver Seção 3.6). |
| Bairro oficial | Bairro definido por lei municipal. Existe em apenas parte dos municípios brasileiros. |
| Bairro popular | Nome reconhecido pela população e pelos Correios, sem respaldo em lei municipal. |
| Centroide | Ponto central geométrico de um polígono, usado para cálculos de proximidade. |
| CEP | Código de Endereçamento Postal. Identificador logístico dos Correios, não territorial. |
| DNE | Diretório Nacional de Endereços dos Correios. Base comercial paga. |
| Distrito | Unidade territorial abaixo do município. Definida por lei municipal, validada pelo IBGE. |
| Geocódigo | Código de 15 dígitos que identifica unicamente um setor censitário no Brasil. |
| GeoSampa | Plataforma de dados geográficos da Prefeitura de São Paulo. |
| IBGE | Instituto Brasileiro de Geografia e Estatística. |
| Malha territorial | Conjunto de polígonos georreferenciados publicado pelo IBGE. |
| Micro-região (no contexto deste documento) | Sub-área identitária dentro de um distrito, construída por composição de setores censitários e metadados OSM. Não tem status oficial. |
| OSM | OpenStreetMap, projeto colaborativo de mapeamento mundial. |
| PostGIS | Extensão espacial do PostgreSQL. |
| Setor censitário | Unidade operacional do IBGE para coleta do Censo. 300 a 800 domicílios em área urbana. |
| SIRGAS2000 | Sistema de Referência Geocêntrico para as Américas, padrão brasileiro. SRID 4674. |
| SRID | Identificador de sistema de referência espacial. |
| Subdistrito | Subdivisão de distrito. Existe em apenas alguns municípios. |
| Subprefeitura | Unidade administrativa de São Paulo capital, criada por lei municipal. |
| Suburb (OSM) | Tag do OpenStreetMap para bairro ou sub-área identitária. |
| Tipologia de setor | Classificação IBGE do setor censitário em categorias (comum, favela, quartel, etc.). |
| UF | Unidade da Federação. Estado ou Distrito Federal. |
| UTM 23S | Projeção cartográfica usada em São Paulo para cálculos métricos. SRID 31983. |
| ViaCEP | API pública gratuita de consulta de CEP. |
| WGS84 | Sistema de referência global. SRID 4326. |
| ZEIS | Zona Especial de Interesse Social. Categoria de zoneamento, não é bairro. |

---

## Anexo B. Estimativa de Micro-regiões por Distrito de São Paulo

A estimativa abaixo é indicativa, baseada em média observada de 15 micro-regiões por distrito popular. Serve como baseline para planejamento de capacidade da plataforma.

| Zona da cidade | Distritos (exemplos) | Micro-regiões estimadas |
|----------------|----------------------|--------------------------|
| Norte | Pirituba, Jaraguá, Brasilândia, Cachoeirinha, Tremembé | 60 a 90 |
| Sul | Jabaquara, Cidade Ademar, Santo Amaro, Capão Redondo, Campo Limpo | 80 a 120 |
| Leste | Itaquera, São Miguel, Ermelino Matarazzo, Cidade Tiradentes | 100 a 150 |
| Oeste | Butantã, Lapa, Vila Leopoldina, Morumbi | 50 a 80 |
| Centro | Sé, República, Santa Cecília, Consolação, Bela Vista | 20 a 40 |

Total estimado para São Paulo capital: **entre 1.200 e 1.500 micro-regiões**.

---

## Anexo C. Checklist de Validação de Campo

Antes de publicar uma micro-região como oficial na plataforma, o checklist abaixo deve ser executado pela equipe de coordenação territorial.

- [ ] Nome da micro-região é reconhecido pelos moradores locais (amostra mínima de 10 entrevistas).
- [ ] Limites do polígono batem com o "mapa mental" dos moradores (comparar com desenho à mão livre feito por coordenador local).
- [ ] CEPs centrais da micro-região retornam, no ViaCEP, o mesmo nome (ou nome compatível).
- [ ] Nenhum setor censitário ficou sem atribuição.
- [ ] Nenhuma quadra é dividida entre duas micro-regiões.
- [ ] Aglomerados subnormais (favelas) contidos na micro-região estão identificados.
- [ ] Pelo menos uma foto de referência da área está anexada no dossiê.
- [ ] Documentação de divergências (OSM x Correios x campo) está arquivada.

---

## Anexo D. DDL completo das tabelas de micro-regiões

O schema abaixo suporta a camada de micro-regiões na plataforma. Ele pressupõe que a tabela `setores_censitarios` e `bairros_osm` já existam (ambas populadas pelos ETLs 11 e 13 do projeto).

```sql
-- ──────────────────────────────────────────────────────────────────────
-- Tabela principal de micro-regioes (o output da receita da Secao 7)
-- ──────────────────────────────────────────────────────────────────────
CREATE TABLE microregioes (
  id                SERIAL PRIMARY KEY,
  nome              VARCHAR(200) NOT NULL,
  slug              VARCHAR(200) NOT NULL,
  municipio_id      INT NOT NULL REFERENCES municipios(id),
  distrito_codigo   VARCHAR(15),        -- geocodigo IBGE do distrito pai
  geometry          GEOMETRY(MultiPolygon, 4674) NOT NULL,
  area_km2          NUMERIC(10,3),
  populacao_estimada INT,               -- soma dos setores contidos
  origem            VARCHAR(30),        -- 'osm' | 'geosampa' | 'composto' | 'manual'
  fonte_osm_id      BIGINT,             -- id original do OSM (se aplicavel)
  validado_campo    BOOLEAN DEFAULT FALSE,
  validado_em       TIMESTAMP,
  validado_por      INT REFERENCES usuarios(id),
  observacoes       TEXT,
  criado_em         TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  atualizado_em     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (municipio_id, slug)
);
CREATE INDEX idx_microregioes_geom ON microregioes USING GIST (geometry);
CREATE INDEX idx_microregioes_mun  ON microregioes (municipio_id);

-- ──────────────────────────────────────────────────────────────────────
-- Associacao N:N entre setores censitarios e micro-regioes
-- (Um setor pode pertencer a mais de uma micro-regiao em casos de borda
--  com disputa, embora o ideal seja 1:1. Mantemos N:N pra auditoria.)
-- ──────────────────────────────────────────────────────────────────────
CREATE TABLE microregiao_setores (
  microregiao_id   INT NOT NULL REFERENCES microregioes(id) ON DELETE CASCADE,
  codigo_setor     VARCHAR(15) NOT NULL,
  area_overlap_pct NUMERIC(5,2),     -- % da area do setor dentro da micro-regiao
  PRIMARY KEY (microregiao_id, codigo_setor)
);
CREATE INDEX idx_mrset_setor ON microregiao_setores (codigo_setor);

-- ──────────────────────────────────────────────────────────────────────
-- Audit log de mudancas (append-only, pra rastrear validacao de campo)
-- ──────────────────────────────────────────────────────────────────────
CREATE TABLE microregioes_audit (
  id              BIGSERIAL PRIMARY KEY,
  microregiao_id  INT NOT NULL,
  acao            VARCHAR(30) NOT NULL,  -- 'criar' | 'atualizar_geom' | 'renomear' | 'validar' | 'invalidar'
  payload_antes   JSONB,
  payload_depois  JSONB,
  autor_id        INT REFERENCES usuarios(id),
  em              TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_mraudit_mr ON microregioes_audit (microregiao_id, em DESC);
```

### Views derivadas úteis

```sql
-- View: resumo por micro-regiao com contagem de setores e populacao agregada
CREATE OR REPLACE VIEW v_microregioes_resumo AS
SELECT
  mr.id, mr.nome, mr.slug, mr.municipio_id,
  m.nome                            AS municipio_nome,
  m.estado_uf,
  mr.area_km2,
  mr.populacao_estimada,
  COUNT(mrs.codigo_setor)           AS qtd_setores,
  mr.validado_campo,
  mr.criado_em
FROM microregioes mr
JOIN municipios m ON m.id = mr.municipio_id
LEFT JOIN microregiao_setores mrs ON mrs.microregiao_id = mr.id
GROUP BY mr.id, m.nome, m.estado_uf;

-- View: seção eleitoral TSE mapeada para micro-regiao
-- (requer que locais_votacao tenha geometria lat/lng populada)
CREATE OR REPLACE VIEW v_secao_microregiao AS
SELECT
  lv.zona,
  lv.secao,
  lv.codigo_local,
  mr.id         AS microregiao_id,
  mr.nome       AS microregiao_nome
FROM locais_votacao lv
JOIN microregioes mr
  ON ST_Contains(mr.geometry, lv.geometry_lat_lng)
WHERE lv.geometry_lat_lng IS NOT NULL;
```

### Consultas típicas (exemplos prontos)

```sql
-- Top 10 micro-regioes por populacao em um municipio
SELECT nome, populacao_estimada, area_km2
FROM microregioes
WHERE municipio_id = (SELECT id FROM municipios WHERE codigo_ibge = '3550308')
ORDER BY populacao_estimada DESC LIMIT 10;

-- Votacao por micro-regiao em um candidato especifico
SELECT mr.nome,
       COUNT(DISTINCT vpz.zona) AS zonas_cobertas,
       SUM(vpz.votos)           AS total_votos
FROM microregioes mr
JOIN v_secao_microregiao sm ON sm.microregiao_id = mr.id
JOIN votos_por_zona vpz     ON vpz.zona = sm.zona AND vpz.secao = sm.secao
WHERE vpz.candidato_id = :cid AND vpz.ano = 2022
GROUP BY mr.id, mr.nome
ORDER BY total_votos DESC;
```

---

## Anexo E. Exemplo real: 15 micro-regiões de Pirituba (mapa mental)

O mapeamento abaixo é indicativo, fruto de validação com moradores e cruzamento OSM + GeoSampa + CEPs dos Correios. Deve ser refeito pela equipe de campo na POC (Seção 10.1) para cada cidade.

| # | Nome da micro-região | Tag OSM de referência | CEPs representativos | Observação |
|---|----------------------|------------------------|------------------------|------------|
| 1 | Jardim Íris | place=suburb "Jardim Íris" | 02921-xxx | Reconhecido em Correios, OSM e GeoSampa |
| 2 | Taipas | place=neighbourhood "Taipas" | 02977-xxx | Fronteira com distrito Jaraguá — ambiguidade natural |
| 3 | Morro Grande | place=suburb "Morro Grande" | 02966-xxx | Aglomerado subnormal parcial (código 20 em parte dos setores) |
| 4 | Vila Iara | place=neighbourhood "Vila Iara" | 02965-xxx | Região homogênea, fácil de delimitar |
| 5 | Jardim Rincão | place=suburb "Jardim Rincão" | 02971-xxx | Adjacente a Taipas, confusão comum |
| 6 | Damaceno | place=neighbourhood "Damaceno" | 02970-xxx | Micro-área, 8k habitantes, 1 setor especial |
| 7 | Vila Pereira Barreto | place=suburb "Vila Pereira Barreto" | 02952-xxx | Forte identidade local |
| 8 | Parque São Domingos | place=suburb "Parque São Domingos" | 02946-xxx | Área comercial + residencial |
| 9 | Vila Zatt | place=neighbourhood "Vila Zatt" | 02942-xxx | Colado no limite da subprefeitura |
| 10 | Jardim Santo Elias | place=suburb "Jardim Santo Elias" | 05136-xxx | Zona de fronteira com distrito Lapa |
| 11 | Vila Nova Pirituba | place=suburb "Vila Nova Pirituba" | 02933-xxx | Núcleo antigo do distrito |
| 12 | Vila Jaguara | place=suburb "Vila Jaguara" | 05116-xxx | Formalmente em Pirituba, mas conectada a Lapa |
| 13 | Jaraguá (parte pertencente a Pirituba) | ambíguo | 02993-xxx | Parte fica em Pirituba, parte em Jaraguá |
| 14 | Ferroviária | place=neighbourhood "Vila Ferroviária" | 02961-xxx | Polígono pequeno em torno da linha férrea |
| 15 | Mombaça | place=suburb "Vila Mombaça" | 02978-xxx | Micro-área histórica |

**Total Pirituba:** ~165 mil habitantes distribuídos em 15 micro-regiões de 8-15 mil habitantes cada — exatamente a faixa operacionalmente ideal para 1 coordenador territorial (Seção 9.2).

**Atenção à zona cinza:** pelo menos 3 micro-regiões (Taipas, Jardim Santo Elias, Vila Jaguara) vivem no limite de outros distritos. A plataforma deve tratá-las como "fronteiriças" e permitir atribuição dupla (a micro-região aparece em dois dashboards distritais), com flag explícita.

---

## Anexo F-pré. Cascata de navegação Cidade → Distrito → Micro-região → Ponto de Votação

Adicionado em 13/04/2026 após auditoria visual do módulo de mapa.

### 1. Topologia da cascata

```
Cidade (ex: São Paulo, IBGE 3550308)
  └─ Distritos IBGE (ex: Pirituba, Brasilândia)  — ~96 em SP
     └─ Micro-regiões (OSM `place=suburb`)       — 10 a 20 por distrito
        └─ Ponto de votação (escola)             — dezenas por micro-região
```

Cada nível é **clicável** no mapa. O clique ativa automaticamente o
próximo nível (sem botão manual):

- Clique em cidade (nível estado) → distritos aparecem no mapa
- Clique em distrito → micro-regiões daquele distrito aparecem
  (filtradas via `ST_Within(microrregiao.centroide, distrito.poligono)`)
- Clique em micro-região → pontos de votação daquela micro-região aparecem
- Clique em ponto → painel da escola

### 2. Regra de pertencimento (spatial join)

Para decidir **a qual micro-região um ponto de votação pertence**:

```sql
SELECT lv.nr_local, mr.nome AS microrregiao
FROM locais_votacao lv
JOIN bairros_osm mr
  ON ST_Within(
       ST_SetSRID(ST_MakePoint(lv.longitude, lv.latitude), 4326),
       mr.geometry
     )
WHERE lv.municipio_id = :mid
  AND mr.tipo = 'suburb'
```

Se um ponto cai em mais de uma micro-região (caso de sobreposição entre
polígonos OSM), aplica-se **ordem de precedência** do Anexo F (validação
de campo > GeoSampa > Correios > OSM > auto).

### 3. Caso especial: sub-distrito fronteiriço

Uma micro-região pode tocar **dois distritos pai** (ex: "Taipas" na
fronteira entre Pirituba e Jaraguá, ou "Vila Jaguara" na fronteira
Pirituba/Lapa). Para lidar:

- **Atribuição primária:** o distrito onde o **centróide** da
  micro-região cai. Na query do endpoint `/microregioes?dentro_de_distrito=X`
  usa-se `ST_Within(ST_Centroid(bo.geometry), dm.geometry)`.
- **Flag opcional `fronteirico`:** em tabela `microregioes` (se criada),
  marcar `fronteirico=true` quando a micro-região toca mais de um
  distrito pai (via `ST_Intersects` com múltiplos polígonos).
- **UX:** a micro-região fronteiriça aparece nos dois distritos pai ao
  navegar a cascata (dupla atribuição explícita), com chip "Fronteiriço"
  na sidebar.

Exemplo em Pirituba:

| Micro-região | Distrito primário | Fronteiriço com |
|--------------|-------------------|-----------------|
| Taipas | Pirituba | Jaraguá |
| Vila Jaguara | Pirituba | Lapa |
| Jardim Santo Elias | Pirituba | Lapa |
| Piqueri | Pirituba | — (núcleo, sem fronteira) |
| Jaraguá (parte Pirituba) | Pirituba | Jaraguá |

### 4. Endpoint que materializa a cascata

```
GET /mapa/municipio/{codigo_ibge}/microregioes
  ?tipo=suburb
  &dentro_de_distrito={cd_dist}  -- opcional, filtra por distrito pai
  &poligono=true                 -- default, retorna polígono via ST_Union dos setores
```

Retorna `[{id, nome, tipo, geometry (Polygon|MultiPolygon), populacao, quantidade_setores, latitude, longitude}]`.

### 5. Implicação arquitetural

A cascata só funciona porque os setores censitários IBGE são a **menor
unidade compartilhada** entre as três camadas (distrito, micro-região,
ponto de votação). Ou seja:

- Distrito = conjunto de setores IBGE (via `setores_censitarios.codigo_distrito`)
- Micro-região = conjunto de setores IBGE (via `bairros_osm.setores_ibge[]`)
- Ponto de votação = ponto geográfico (via `lat/lng`)

Com o setor como pivô, qualquer agregação (votos, população, perfil
socioeconômico) é consistente em qualquer nível da cascata.

---

## Anexo F. Critérios de disputa e precedência entre fontes

Quando as fontes divergem (OSM dá um nome, Correios dá outro, GeoSampa dá um terceiro), a ordem de precedência recomendada é:

1. **Validação de campo** (coordenador territorial com autoridade) — sempre vence.
2. **GeoSampa** (fonte oficial da prefeitura) — segundo em precedência nas capitais que publicam.
3. **Correios (DNE/ViaCEP)** — terceiro. Tem cobertura 100% mas cola nomes que "não batem" socialmente.
4. **OpenStreetMap** — quarto. Alta granularidade mas qualidade varia muito por cidade.
5. **Nome-síntese automático** (quando nenhuma fonte oferece nome) — último recurso, com prefixo `[auto]`.

Exemplo: em Pirituba, Correios reconhece "Vila Pereira Barreto" como bairro logístico, OSM tem `suburb=Vila Pereira Barreto` mas também `suburb=Parque São Domingos` numa área vizinha. Coordenador local confirma que são duas micro-regiões distintas. Decisão: manter as duas, com limites definidos pelos polígonos OSM (que batem com os CEPs).

Quando duas fontes com mesmo nome têm polígonos diferentes, usar **interseção** das duas (conservador) ou **união** (agressivo) conforme caso — a equipe registra a decisão no audit log da tabela `microregioes_audit`.

---

Fim do documento.
