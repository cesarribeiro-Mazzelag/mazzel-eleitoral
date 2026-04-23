# ETL — Plataforma Eleitoral União Brasil

Pipeline de importação de dados do TSE e IBGE para o banco PostgreSQL.

## Pré-requisitos

```bash
# Docker com banco rodando
docker compose up -d ub_postgres

# Migration aplicada (inclui migration 002)
docker exec ub_backend alembic upgrade head

# Dependências Python (instalar no ambiente local, fora do Docker)
pip install pandas geopandas shapely sqlalchemy psycopg2-binary requests
```

## Execução completa

```bash
cd etl/

# Pipeline completo — todos os anos (2008-2024)
python run_all.py

# Anos específicos (recomendado para teste)
python run_all.py 2020 2024

# Só baixar os arquivos (sem importar)
python run_all.py --apenas-download

# Sem votos por zona (mais rápido, menos granularidade)
python run_all.py --sem-votos

# A partir de um passo específico (ex: refazer só o farol)
python run_all.py --passo 5
```

## Passos do pipeline

| Passo | Script | Descrição | Tempo estimado |
|-------|--------|-----------|----------------|
| 1 | `01_partidos.py` | Seed de todos os partidos | < 1 min |
| 2 | `02_municipios.py` | Municípios + geometrias PostGIS | 5-10 min |
| 3 | `03_candidatos.py` | Candidatos + candidaturas (todos os anos) | 30-60 min |
| 4 | `04_votos_zona.py` | Votos por município/zona | 2-4 horas |
| 5 | `05_farol.py` | Cálculo do farol por município × partido | 20-40 min |

## Volume de dados esperado

| Tabela | Registros estimados |
|--------|---------------------|
| partidos | ~60 |
| municipios | 5.570 |
| zonas_eleitorais | ~3.000 |
| candidatos | ~1.000.000 |
| candidaturas | ~2.000.000 |
| votos_por_zona | ~50.000.000 |
| farol_municipio | ~500.000 |

## Todos os partidos

O ETL importa **todos os partidos**, não só o União Brasil.
Isso é intencional — permite análises comparativas como:
- "Onde o PL cresceu onde o União Brasil perdeu?"
- "Quais municípios migraram de DEM para PL entre 2018 e 2022?"
- "Ranking de crescimento de todos os partidos em SP em 2024"

## Retomada

Todos os scripts são idempotentes:
- Download: retoma de onde parou se o arquivo estiver incompleto
- Municípios/Partidos: usa `ON CONFLICT DO UPDATE`
- Candidatos: verifica existência por CPF hash antes de inserir
- Votos: verifica se o ano já foi importado antes de processar
- Farol: upsert por (municipio, partido, cargo, ano)

## Atualização para 2026

Quando o TSE publicar os dados de 2026:

```bash
python run_all.py 2026
```

## Fontes

- Candidatos: `https://cdn.tse.jus.br/estatistica/sead/odsele/consulta_cand/`
- Votos: `https://cdn.tse.jus.br/estatistica/sead/odsele/votacao_candidato_munzona/`
- Mapeamento TSE-IBGE: `dados_brutos/municipio_tse_ibge/`
- Shapefile IBGE: `dados_brutos/shapefiles/BR_Municipios_2022.shp`
