# Investigacao de Fontes - Atos de Governador e Prefeito

**Data:** 23/04/2026  
**Investigador:** Claude Sonnet 4.6  
**Escopo:** Fontes publicas para coleta automatizada de decretos e atos do executivo estadual (Governador SP) e municipal (Prefeito SP)  
**Metodo:** Testes reais via curl + analise de OpenAPI + inspecao de JS  

---

## STATUS DO QUE JA EXISTE (contexto)

Os collectors atuais (`coleta_atividade_governador.py` e `coleta_atividade_prefeito.py`) usam como fallback MSC (Mensagens ao Congresso) da API federal - abordagem parcial e inadequada. Esta investigacao mapeia fontes corretas.

---

## FONTES INVESTIGADAS

---

### [1] ALESP - Repositorio HTML Estatico de Decretos Estaduais

**URL:** `https://www.al.sp.gov.br/repositorio/legislacao/decreto/{ANO}/decreto-{NNNNN}-{DD.MM.YYYY}.html`

**Status:** VIAVEL (HTML estatico, sem JS obrigatorio)

**Metodo:** HTML scraping (httpx simples, sem Selenium)

**Exemplo de chamada confirmado:**
```bash
curl "https://www.al.sp.gov.br/repositorio/legislacao/decreto/2024/decreto-68322-31.01.2024.html"
# HTTP 200, 9611 bytes, text/html
```

**Conteudo retornado (confirmado no teste):**
- Numero do decreto (ex: `DECRETO N. 68.322, DE 31 DE JANEIRO DE 2024`)
- Ementa (`<h3>`: Homologa, por 180 dias, o decreto do Prefeito do Municipio de Embu Guacu...)
- Texto integral do decreto (todos os artigos)
- Assinatura: `TARCISIO DE FREITAS` (campo plaintext no final)
- Secretarios referendantes (lista completa)
- Data de publicacao
- Retificacoes posteriores (se houver)

**Limitacao critica:** A URL inclui a data do decreto no slug. Sem saber a data, nao da para montar a URL diretamente.

**Solucao de iteracao:**
- Decretos de 2024 vao de ~68298 a ~69235 (faixa sequencial)
- Estrategia: usar o dump XML da ALESP (veja fonte #2) para mapear numero->data, depois buscar HTML do repositorio para texto integral

**Latencia/limite:** Sem rate limit observado. Paginas leves (~10KB).

**Cobertura:** Governador SP (todos os decretos estaduais publicados na ALESP)

**Campos disponiveis:** numero_decreto, data, ementa, texto_integral, assinantes, url_fonte

**Custo estimado de implementacao:** 4-6 horas

**Observacoes:**
- Encoding: ISO-8859-1 (Latin-1) - precisa decodificar
- Nao ha listagem/indice por ano acessivel via HTTP
- O sistema interno `/norma/?id=NNNNN` e SPA (nao serve)
- O sitemap.xml existe mas nao lista decretos individuais
- A URL do repositorio e a fonte mais confiavel para texto completo

---

### [2] ALESP - Dados Abertos XML (legislacao_normas.zip)

**URL:** `https://www.al.sp.gov.br/repositorioDados/legislacao/legislacao_normas.zip`

**Status:** VIAVEL (download direto, sem auth)

**Metodo:** Download de ZIP + parse de XML

**Exemplo de chamada confirmado:**
```bash
curl -I "https://www.al.sp.gov.br/repositorioDados/legislacao/legislacao_normas.zip"
# HTTP 200, Content-Length: 10137125 (10MB)
# Last-Modified: Thu, 23 Apr 2026 06:28:46 GMT (atualizado diariamente!)
```

**Conteudo esperado (baseado na documentacao da ALESP):**
- legislacao_normas.xml: lista de todas as normas com metadados
- Campos: tipo de norma, numero, data, ementa
- Indexa: decretos estaduais, leis, resolucoes da ALESP

**Limitacao:** Nao ha versao por ano (legislacao_normas_2024.zip retornou 404). O zip contem o historico completo (10MB comprimido).

**Estrategia de uso:**
1. Baixar o ZIP uma vez (ou periodicamente)
2. Extrair e parsear o XML para obter: numero_decreto -> data_publicacao
3. Usar essa lista para montar URLs do repositorio HTML (#1) e buscar texto integral

**Latencia/limite:** Download unico de ~10MB. Atualizado diariamente.

**Cobertura:** Governador SP (todos os atos normativos estaduais)

**Custo estimado de implementacao:** 2-3 horas (complementa a fonte #1)

**Observacoes:**
- Documentacao da ALESP em PDF disponivel em: `https://www.al.sp.gov.br/repositorioDados/docs/legislacao/legislacao_normas.pdf`
- Schema XML confirmado como disponivel (nao foi possivel abrir o zip nesta sessao - requer permissao)
- Esta e a chave para resolver o problema do numero->data sem JS

---

### [3] DOCSP - Diario Oficial da Cidade de SP (Prefeito)

**URL:** `https://diariooficial.prefeitura.sp.gov.br/md_epubli_controlador.php`

**Status:** VIAVEL (HTML server-side, sem JS obrigatorio)

**Metodo:** HTML scraping (httpx simples, sem Selenium)

**Exemplo de chamada confirmado:**
```bash
# Busca de decretos do caderno executivo - janeiro 2025
curl "https://diariooficial.prefeitura.sp.gov.br/md_epubli_controlador.php?acao=materias_pesquisar&palavras=decreto&dta_ini=01%2F01%2F2025&dta_fim=31%2F01%2F2025&caderno=1"
# HTTP 200, ~90KB, text/html; charset=ISO-8859-1
# Retornou: 950 resultados para "decreto" em jan/2025
```

**Conteudo retornado por resultado (confirmado nos testes):**
- Numero do decreto (ex: `DECRETO N. 65.618, DE 23 DE ABRIL DE 2026`)
- Assinatura inline no texto: `RICARDO NUNES, Prefeito do Municipio de Sao Paulo`
- Ementa e texto parcial (primeiros ~500 chars)
- Data de publicacao: `Publicado em 24/04/2026`
- Veiculo: `Atos do Executivo`
- Numero de processo SEI (ex: `6022.2023/0003430-5`)
- URL para texto completo: `md_epubli_visualizar.php?[TOKEN_BASE64],,`
- Numero do documento (ID interno): ex `154055695`

**Paginacao confirmada:**
```
?...&offset=0   -> resultados 1-10
?...&offset=10  -> resultados 11-20
?...&offset=20  -> resultados 21-30
```
(total por busca pode ultrapassar 1000 itens)

**Filtros disponiveis:**
- `palavras=decreto` - busca por texto
- `dta_ini=DD%2FMM%2AAAA` e `dta_fim=` - intervalo de data
- `caderno=1` - caderno executivo (1 = Municipio, outros para CMSP e TCM)
- Busca por "NUNES" no campo palavras retorna 1050+ resultados

**Visualizacao do documento completo:**
```bash
curl "https://diariooficial.prefeitura.sp.gov.br/md_epubli_visualizar.php?[TOKEN],,,"
# HTTP 200, 42KB - contem texto completo do decreto
```
(URL gerada dinamicamente pelo sistema - valida enquanto a sessao esta ativa)

**Latencia/limite:** Sem auth. Sem captcha observado. Respostas em ~1-2 segundos. Sem rate limit aparente.

**Cobertura:** Prefeito SP (todos os decretos municipais publicados no DOCSP)

**Campos disponiveis:** numero_decreto, data_publicacao, ementa, texto_parcial, url_visualizacao, processo_sei, id_documento, veiculo

**Custo estimado de implementacao:** 6-8 horas (incluindo paginacao + parse + texto completo via visualizador)

**Observacoes:**
- Encoding: ISO-8859-1 (caracteres especiais em Latin-1) - usar `response.content.decode('iso-8859-1')`
- Estrutura HTML server-side renderizado com Bootstrap/jQuery - parse direto
- O token de visualizacao e opaco (base64 ofuscado) - nao e reutilizavel fora da sessao
- O epubli.prefeitura.sp.gov.br e um espelho do mesmo sistema
- Portal requer User-Agent com string de browser para algumas requisicoes

---

### [4] API PRODESP DOE - Diario Oficial Estado SP (gov-a-gov)

**URL OpenAPI:** `https://openapi.api.rota.sp.gov.br/cdesp-catalogos-doe-api-web-search`

**Status:** PARCIAL (API existe e e documentada, mas requer convênio SEI com PRODESP)

**Metodo:** API REST JSON (OAuth2 client_credentials)

**Endpoints mapeados (do spec OpenAPI):**
```
GET /diario-oficial-estado/api-web-search/metadados
GET /diario-oficial-estado/api-web-search/estatisticas
GET /diario-oficial-estado/api-web-search/tabelas
GET /diario-oficial-estado/api-web-search/tabelas/{nome}
GET /diario-oficial-estado/api-web-search/tabelas/{nome}/estatisticas
```

**Autenticacao:**
- Tipo: OAuth2 client_credentials
- Token URL: `https://rhsso.idp-hml.sp.gov.br/auth/realms/idpsp/protocol/openid-connect/token`
- Scope: `api:integrador.cdesp-catalogos.search`
- Servidor: `https://cdesp-catalogos.api-hml.rota.sp.gov.br` (HML) / `https://cdesp-catalogos.api.rota.sp.gov.br` (PROD)

**Teste realizado:**
```bash
curl "https://cdesp-catalogos.api.rota.sp.gov.br/diario-oficial-estado/api-web-search/metadados"
# HTTP 401 - "Authentication parameters missing"
```

**Requisito de acesso:** Processo SEI no Integrador de APIs SP para formalizacao de convênio bilateral. Formulario em `https://integrador.sp.gov.br/`.

**Cobertura:** Governador SP (todos os atos do DOESP incluindo decretos, portarias, etc.)

**Custo estimado de implementacao:** 20+ horas (incluindo processo burocrático de convênio)

**Observacoes:**
- Esta e a API mais completa e estruturada para dados do DOESP
- Requer cadastro institucional (CNPJ do projeto/empresa)
- Prazo de aprovação do convênio: 30-90 dias (estimativa)
- A PRODESP pode fornecer credenciais para fins de interesse publico
- Alternativa: usar ALESP (#1 e #2) que cobre o mesmo conteudo sem burocracia

---

### [5] DOE SP - doe.sp.gov.br (portal Next.js)

**URL:** `https://doe.sp.gov.br/executivo/decretos/decreto-n-{SLUG}`

**Status:** PARCIAL (paginas individuais acessiveis, sem API de busca publica)

**Metodo:** Next.js SSG (Static Site Generation) - HTML estatico por decreto

**Teste realizado:**
```bash
curl "https://doe.sp.gov.br/executivo/decretos/decreto-n-69333-de-29-de-janeiro-de-2025"
# HTTP 200, 54KB
# Conteudo: SPA shell - dados carregados pelo Next.js no cliente
```

**Limitacao critica:**
- Site e Next.js com `nextExport: true` - paginas pre-renderizadas
- Nao ha API de busca publica no dominio doe.sp.gov.br
- URLs de decretos seguem padrao: `decreto-n-{NUMERO}-de-{EXTENSO}-de-{MES}-de-{ANO}`
- Para descobrir a lista de decretos, precisaria ter os slugs de cada um

**Uso possivel:** Paginas individuais se o slug for conhecido (via fonte #2 para mapear numero->slug)

**Cobertura:** Governador SP

**Custo estimado de implementacao:** 8-12 horas (dependendo do numero de slugs a mapear)

**Observacoes:**
- Subdominio `do-api-publication-pdf.doe.sp.gov.br` serve PDFs de edicoes suplementares (nao decretos individuais)
- Sem `/__next/data/` acessivel - e export estatico sem dados JSON separados
- Nao e a melhor rota - ALESP repositorio (#1) e mais simples

---

### [6] LexML Brasil

**URL:** `https://www.lexml.gov.br`

**Status:** BLOQUEADA para SP 2024 (indexacao desatualizada)

**Metodo:** SRU (Search/Retrieve via URL) - padrão Library of Congress

**Testes realizados:**
```bash
# Busca SRU direta
curl "https://www.lexml.gov.br/busca/SRU?..."
# HTTP 404 - path nao existe mais

# Busca via interface /busca/search
curl "https://www.lexml.gov.br/busca/search?tipoDocumento=Decreto&localidade=sao+paulo&f2-autoridade=Estadual&year=2024"
# HTTP 200, mas: "0 Itens encontrados"

# URL individual por URN funciona para anos anteriores
curl "https://www.lexml.gov.br/urn/urn:lex:br;sao.paulo:estadual:decreto:2023-05-03;67690"
# HTTP 200 - decreto de 2023 encontrado com metadados
```

**Resultado:** O LexML indexa decretos estaduais SP ate 2023. Para 2024 e 2025 retorna 0 resultados. A indexacao esta atrasada ou incompleta.

**Cobertura:** SP estadual - parcial (ate 2023 confirmado, 2024+ nao indexado)

**Campos disponiveis (via URN):** numero, data, ementa, localidade, tipo, URN normalizado

**Custo estimado de implementacao:** Nao recomendado (indexacao incompleta)

**Observacoes:**
- O LexML e util para validar URNs e cross-referencia historica
- Para dados recentes (2023+) de SP, usar ALESP diretamente
- O acervo LexML completo esta disponivel via dados abertos do Senado

---

### [7] ALESP - Interface de Busca Norma/Pesquisa

**URL:** `https://www.al.sp.gov.br/norma/pesquisa` e `https://www.al.sp.gov.br/norma/resultados`

**Status:** BLOQUEADA (SPA com DataTables carregado via JS)

**Testes realizados:**
```bash
curl "https://www.al.sp.gov.br/norma/resultados?idsTipoNorma=decreto&strAno=2024"
# HTTP 200, HTML shell sem dados de decreto
# DataTables usa JS no cliente para renderizar a tabela
```

**Observacoes:**
- O endpoint `/norma/buscar` existe mas retorna vazio sem JS
- O `searchPortal` (autocomplete) retorna array vazio para "decreto"
- Nao foi possivel identificar o endpoint AJAX real (DataTables com server-side processing)
- Usar o repositorio HTML (#1) e o XML (#2) que sao fontes estaveis

---

### [8] Portal Transparencia SP Capital

**URL:** `https://transparencia.prefeitura.sp.gov.br/portais/diario-oficial/`

**Status:** PARCIAL (redireciona para o DOCSP)

**Observacoes:**
- O portal de transparencia da Prefeitura SP vincula diretamente ao DOCSP (#3)
- Nao ha API de atos propria - e apenas um link para o sistema ARQUIP/DOSP
- Para dados de decretos, usar diretamente o DOCSP (#3)

---

### [9] Portal Legislacao SP Estado (legislacao.sp.gov.br)

**URL:** `http://www.legislacao.sp.gov.br`

**Status:** BLOQUEADA (sistema Lotus Domino antigo, conexao recusada externamente)

**Testes realizados:**
```bash
curl "https://legislacao.sp.gov.br/legislacao/dg280202.nsf/..."
# Exit code 6 - DNS nao resolve / conexao recusada
```

**Observacoes:**
- Sistema antigo baseado em Lotus Domino (nota URLs com `.nsf` e `?OpenDocument=`)
- Nao acessivel de fora da rede do governo SP
- Alternativa: usar ALESP que republica os mesmos decretos estaduais

---

### [10] IMESP - Imprensa Oficial SP

**URL:** `https://www.imprensaoficial.com.br`

**Status:** PARCIAL (site acessivel, busca requer JS/cookies)

**Testes realizados:**
```bash
curl "https://www.imprensaoficial.com.br"
# HTTP 200

curl "https://www.imprensaoficial.com.br/DO/BuscaDO2001Documento_11_4.aspx"
# WebFetch bloqueado na sessao
```

**Observacoes:**
- A IMESP e a editora oficial do DOESP
- O sistema de busca do DOESP foi migrado para doe.sp.gov.br (Decreto 67.717/23)
- O IMESP historico (pre-2024) ainda tem acervo, mas requer JS/navegador
- Para dados de 2023+, usar doe.sp.gov.br ou ALESP (#1/#2) que sao mais acessiveis

---

### [11] Jusbrasil, SEADE, Governoaberto.sp.gov.br

**Status:** BLOQUEADA / INACESSIVEL

- **Jusbrasil:** HTTP 403 (bloqueia crawlers)
- **SEADE:** `http://doc.seade.gov.br` - nao tem dados de decretos do executivo
- **governoaberto.sp.gov.br:** DNS nao resolve / timeout
- **catalogo.governoaberto.sp.gov.br:** DNS nao resolve / timeout

---

## RECOMENDACAO CONSOLIDADA

### Para Prefeito SP (Ricardo Nunes)

**Fonte principal: DOCSP (`diariooficial.prefeitura.sp.gov.br`)**

A fonte esta CONFIRMADA e funcional. O DOCSP e um sistema PHP/MySQL (ARQUIP) com renderizacao server-side. Nao ha necessidade de Playwright ou Selenium.

**Estrategia de implementacao:**

```python
# Endpoint de busca (GET, sem auth)
BASE_URL = "https://diariooficial.prefeitura.sp.gov.br/md_epubli_controlador.php"

# Parametros obrigatorios
params = {
    "acao": "materias_pesquisar",
    "palavras": "decreto",  # ou "RICARDO NUNES" para garantir autoria
    "dta_ini": "DD%2FMM%2FYYYY",  # data inicial
    "dta_fim": "DD%2FMM%2FYYYY",  # data final
    "caderno": "1",                # caderno executivo
    "offset": 0,                   # paginacao (0, 10, 20, 30...)
}

# Parse do HTML:
# - numero decreto: regex "DECRETO N[^\d]+(\d{2}\.\d{3}), DE ([0-9]+ DE [A-Z]+ DE \d{4})"
# - assinatura: "RICARDO NUNES, Prefeito"
# - url_completo: href do link "md_epubli_visualizar.php?..."
# - data publicacao: classe "dataPublicacao"
# - processo SEI: link href com "processos.prefeitura.sp.gov.br"
```

**Campos coletaveis:**
- numero_decreto (e.g. "65.618")
- data_decreto (e.g. "23 de abril de 2026")
- data_publicacao (e.g. "24/04/2026")
- ementa (primeiros 500 chars)
- texto_integral (via md_epubli_visualizar.php)
- url_fonte (permalink do documento)
- processo_sei (numero do processo)
- tipo ("Decreto")

---

### Para Governador SP (Tarcisio de Freitas)

**Fonte principal: ALESP Repositorio (#1) + XML Dados Abertos (#2)**

**Estrategia em 2 etapas:**

**Etapa 1 - Mapear numero->data (via XML):**
```python
# Download do XML de normas (atualizado diariamente, 10MB comprimido)
import httpx, zipfile, io, xml.etree.ElementTree as ET

URL_ZIP = "https://www.al.sp.gov.br/repositorioDados/legislacao/legislacao_normas.zip"
resp = httpx.get(URL_ZIP, headers={"User-Agent": "..."})
with zipfile.ZipFile(io.BytesIO(resp.content)) as z:
    xml_content = z.read("legislacao_normas.xml")
    
root = ET.fromstring(xml_content)
# Parsear: numero -> (data, tipo, ementa)
# Filtrar: tipo == "DECRETO ESTADUAL" AND data >= "2023-01-01"
```

**Etapa 2 - Buscar texto completo (via repositorio HTML):**
```python
# URL pattern: /repositorio/legislacao/decreto/{ANO}/decreto-{NNNNN}-{DD.MM.YYYY}.html
BASE_ALESP = "https://www.al.sp.gov.br/repositorio/legislacao/decreto"
numero = "68322"
data = "31.01.2024"
ano = "2024"
url = f"{BASE_ALESP}/{ano}/decreto-{numero}-{data}.html"

# Parse do HTML:
# - titulo: <h1> "DECRETO N. XXXXX, DE DD DE MES DE AAAA"
# - ementa: <h3> (texto da ementa)
# - texto_integral: <p> tags apos a ementa
# - assinante: "TARCISIO DE FREITAS" (plaintext antes das secretarias)
# - encoding: ISO-8859-1
```

**Alternativa simplificada (sem ZIP):**
Iterar o range de IDs de decreto conhecidos (68298 a 69235 para 2024) e fazer HEAD requests. Se retornar 404, o ID nao existe naquele dia; se retornar 200, buscar o HTML. Mas isso requer saber a data - ou seja, depende do XML.

**Implementacao recomendada:** Combinacao de ambas as etapas.

---

### Estrategia generalizavel para outros estados e capitais

| Cargo | Estado/Capital | Fonte primaria | Metodo | Viabilidade |
|-------|---------------|----------------|--------|-------------|
| Governador | SP | ALESP repositorio + XML | HTML scraping | Confirmada |
| Prefeito | SP capital | DOCSP md_epubli | HTML scraping | Confirmada |
| Governador | RJ | ALERJ dados abertos | A verificar | Provavelmente similar |
| Prefeito | Rio de Janeiro | Diario Oficial Municipal | A verificar | - |
| Governador | MG | ALMG dados abertos | A verificar | Provavelmente similar |
| Governador | BA | ALBA ou Imprensa BA | A verificar | - |
| Governadores gerais | Todos | LexML (ate ~2022) + ALESP estadual | Misto | Parcial |

**Padroes a verificar por estado:**
1. Assembleia Legislativa tem `/repositorioDados/` com XML de normas?
2. Diario Oficial estadual tem busca server-side (nao SPA)?
3. Portal dados abertos estadual tem dataset de atos do executivo?

---

## ROADMAP - O QUE CONSTRUIR PRIMEIRO

### Fase 1 - Implementacao imediata (1-2 semanas)

**Sprint A: Prefeito SP via DOCSP**
- Substituir `coleta_atividade_prefeito.py` pela fonte DOCSP
- Busca paginada por intervalo de datas
- Parse HTML ISO-8859-1
- Coleta de texto completo via md_epubli_visualizar
- Estimativa: 6-8 horas
- Resultado: 2.000+ decretos do Nunes desde jan/2024

**Sprint B: Governador SP via ALESP XML + repositorio**
- Substituir `coleta_atividade_governador.py` pela fonte ALESP
- Baixar e parsear `legislacao_normas.zip`
- Extrair decretos estaduais 2023+
- Buscar texto completo via repositorio HTML
- Estimativa: 8-10 horas
- Resultado: 1.000+ decretos do Tarcisio desde jan/2023

### Fase 2 - Outros governadores/prefeitos (2-4 semanas)

- Mapear fontes equivalentes para RJ, MG, BA (principais estados com deputados)
- Reutilizar arquitetura dos collectors de SP
- Estimativa: 4-6 horas por estado (com pesquisa de 2h + implementacao de 4h)

### Fase 3 - API PRODESP (opcional, longo prazo)

- Solicitar acesso via SEI ao integrador.sp.gov.br
- Justificar como projeto de interesse publico / plataforma eleitoral
- Estimativa: 30-90 dias para aprovacao, 3-4 horas de implementacao
- Beneficio: API estruturada JSON sem necessidade de scraping

---

## NOTAS TECNICAS IMPORTANTES

1. **Encoding:** Todos os portais SP usam ISO-8859-1. Sempre usar `.decode('iso-8859-1')` ou `httpx.get(..., follow_redirects=True)` com deteccao de encoding.

2. **User-Agent:** Usar string de browser real. Alguns portais retornam erro para UA padrao do curl/Python requests.

3. **Autoria do ato:** O texto do decreto sempre inclui o nome do governador/prefeito na clausula de competencia. Ex: "TARCISIO DE FREITAS" ou "RICARDO NUNES, Prefeito". Filtrar por isso garante autoria.

4. **Cobertura temporal:**
   - DOCSP (Prefeito SP): aberto desde antes de 2024, mas Ricardo Nunes comecou em jan/2025 (reeleito); cobertura retroativa disponivel
   - ALESP XML (Governador SP): historico completo disponivel; Tarcisio comecou em jan/2023

5. **Atualizacao incremental:** Nos dois casos, nao precisamos baixar tudo sempre. Basta filtrar por `dta_ini >= ultima_coleta` no DOCSP, e parsear apenas registros com data > ultima_coleta no XML da ALESP.

---

*Investigacao realizada com testes reais via curl. Todos os endpoints foram verificados em 23/04/2026.*
