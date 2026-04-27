# Estrutura Partidária do União Brasil

Documento de referência absorvendo o **Modelo de Nominata** e a **Ficha de Filiação Partidária** oficiais que o Anderson (cliente) entregou em 24/04/2026. Define como o partido se organiza juridicamente — base pra modelar tabelas, RBAC e módulos administrativos da plataforma.

> Documentos originais: `docs/anderson_referencias/modelo_nominata_atual.docx` (papel timbrado oficial UB com logo + número 44) e `docs/anderson_referencias/ficha_filiacao_partidaria.pdf`

> **Atualização 27/04/2026:** confirmamos que o SGIP3 do TSE expõe API REST pública sem autenticação com cobertura nacional COMPLETA das nominatas. Detalhe em `docs/api_sgip_descoberta.md`. **Fonte canônica das nominatas = SGIP3 TSE**, não entrada manual.

---

## Hierarquia organizacional

```
Diretório Nacional (Brasília)
        ↓
27 Diretórios Estaduais + DF (presidência estadual)
   - SP: Alexandre Leite (Presidente Estadual)
   - Endereço SP: R. André de Leão, 155 - Socorro - SP - CEP 04762-030
        ↓
~5.570 Comissões Executivas Municipais
   - Cada uma com CNPJ próprio do partido no município
   - Cada uma com sede física e telefone
```

**Cada nó da árvore tem composição própria** (nominata) e é encaminhado como sugestão ao nível imediatamente superior pra aprovação.

---

## Composição da Comissão Executiva (Nominata)

A nominata é o documento que oficializa a Comissão Executiva (em qualquer nível) e tem **8 cargos fixos + membros adicionais**:

| Ordem | Cargo | Quantidade |
|-------|-------|------------|
| 1 | Presidente | 1 |
| 2 | Vice-Presidente | 1 |
| 3 | Secretário-Geral | 1 |
| 4 | Secretário-Adjunto | 1 |
| 5 | Tesoureiro | 1 |
| 6 | Tesoureiro Adjunto | 1 |
| 7+ | Membro | 3 ou mais |

### Dados coletados por cargo (nominata)

Pra cada membro da comissão a nominata coleta:

- Endereço completo (logradouro, bairro, CEP)
- 3 telefones (residencial, comercial, celular)
- Data de nascimento
- CPF
- Título de Eleitor + Zona + Seção
- E-mail
- **Assinatura física** (no documento impresso)

A nominata também declara: *"Declaramos concordar com o Manifesto, Programa e Estatuto do UNIÃO BRASIL"*.

---

## Ficha de Filiação Partidária

Documento individual obrigatório pra qualquer pessoa se filiar ao UB.

### Dados do filiado

- Nome completo
- Data de nascimento, **Data de filiação**, **Nº de filiação** (código TSE)
- Nº de Título de Eleitor + Zona + Seção
- CPF + RG
- Nome do Pai
- Nome da Mãe
- Endereço (rua, cidade, bairro, UF, CEP)
- 3 telefones (residencial, comercial, celular)
- E-mail
- **Diretório onde se filiou** (vínculo organizacional)

### Assinaturas obrigatórias

Duas assinaturas no documento:
1. **Assinatura do Filiado** — quem se filia
2. **Assinatura do Abonador** — quem padrinhou o filiado (geralmente um membro da Comissão Executiva local)

Declaração no rodapé: *"Declaro estar de acordo com o programa e com o estatuto do partido"*.

---

## Implicações pro produto

### 1. Modelo de dados (banco)

Migrations a criar (futuras):

```sql
-- Hierarquia de diretórios
CREATE TABLE diretorios (
    id BIGINT PRIMARY KEY,
    nivel TEXT NOT NULL,            -- 'nacional' | 'estadual' | 'municipal'
    diretorio_pai_id BIGINT,         -- FK self (nacional tem null)
    nome TEXT NOT NULL,
    estado_uf VARCHAR(2),            -- preenchido em estadual e municipal
    municipio_id BIGINT,             -- preenchido em municipal
    cnpj VARCHAR(18),                -- CNPJ do partido nesse nível
    endereco_sede TEXT,
    telefone_sede TEXT,
    data_designacao DATE,
    ativo BOOLEAN DEFAULT TRUE
);

-- Cargos da comissão executiva (catálogo)
CREATE TABLE cargos_comissao (
    codigo TEXT PRIMARY KEY,         -- 'presidente', 'vice', 'sec_geral', 'sec_adj', 'tes', 'tes_adj', 'membro'
    nome TEXT NOT NULL,
    ordem_hierarquica SMALLINT,
    permite_multiplos BOOLEAN        -- só 'membro' = TRUE
);

-- Membros da comissão (junção)
CREATE TABLE membros_comissao (
    id BIGSERIAL PRIMARY KEY,
    diretorio_id BIGINT REFERENCES diretorios,
    cargo_codigo TEXT REFERENCES cargos_comissao,
    pessoa_id BIGINT REFERENCES pessoas,    -- ou candidato_id se já no TSE
    designado_em DATE,
    desligado_em DATE,
    ativo BOOLEAN DEFAULT TRUE
);
```

A tabela `pessoas` (já existe ou a criar) recebe os campos da nominata: endereço, telefones, CPF, título eleitoral, e-mail.

### 2. Filiados

Migration ou tabela existente `filiados` precisa cobrir:
- Nº filiação TSE
- Data filiação
- **Diretório onde filiou-se** (FK pra `diretorios`)
- Filiação parental (nome do pai, nome da mãe)
- **Abonador** (FK pra `membros_comissao` ou `pessoas`)

### 3. RBAC scoped

O sistema de perfis precisa cruzar **nível do diretório × cargo na comissão**:

| Perfil sistema | Origem na nominata | Escopo de visibilidade |
|----------------|--------------------|------------------------|
| Presidente Nacional | Presidente do Diretório Nacional | Tudo |
| Presidente Estadual | Presidente do Diretório Estadual | Sua UF e municípios |
| Presidente Municipal | Presidente da Comissão Executiva Municipal | Seu município |
| Tesoureiro (qualquer nível) | Tesoureiro / Tesoureiro Adjunto | Módulo Tesouraria do nível |
| Secretário | Sec-Geral / Sec-Adjunto | Documentos + administrativo do nível |
| Membro | Membro | Leitura geral do nível |
| Filiado | Tabela `filiados` | Próprio cadastro + dados públicos |

A cascata Cabo Eleitoral existente (Presidente → Coord Regional → Coord Territorial → Cabo) **complementa** essa hierarquia mas é separada — Cabo opera em campanha, Membro opera no partido.

### 4. Módulos administrativos novos (sidebar)

| Módulo | Pra quem | O que faz |
|--------|----------|-----------|
| **Diretórios & Comissões** | Presidentes (todos níveis) | Visualizar/editar nominatas. Cadastrar membros novos. Designar Comissões Provisórias. |
| **Filiados** | Secretários + Presidentes | Cadastro digital com fluxo de abonador. Importar lista TSE. Exportar pra DocuSign. |
| **Documentos** | Todos os perfis administrativos | Repositório centralizado: nominatas assinadas, fichas de filiação, atas, declarações, ofícios. Filtros por nível, ano, tipo. |
| **Tesouraria** | Tesoureiros (visível só pra eles) | Receitas, despesas, prestação de contas TSE. Por nível. |

### 5. DocuSign — assinatura eletrônica com validade legal

Anderson pediu explicitamente: **arquivar todos os documentos no sistema E poder gerar assinaturas via DocuSign** (validade legal).

**Documentos que precisam de assinatura digital:**
- Ficha de Filiação Partidária (filiado + abonador)
- Nominata da Comissão Executiva (todos os 8+ membros)
- Atas de reunião
- Declarações diversas (filiação, desfiliação, autorização de uso de imagem etc.)

**Integração técnica:**
- DocuSign tem REST API + Connect (webhooks de status)
- Templates: criar 1 template por tipo de documento, com placeholders mapeados pros campos do banco
- Status no banco: `documento.status_assinatura` ∈ `pendente | enviado | assinado_parcial | assinado_completo | recusado | expirado`
- Webhook DocuSign → atualiza status + arquiva PDF assinado em storage
- **Custo:** plano Standard ~US$ 25/usuário/mês, ou pay-per-envelope (~US$ 0.50/envelope). Decisão fica com Anderson.

**Alternativa nacional:** ClickSign (BR), tarifa por documento, integra com Pix. Pode valer comparar.

### 6. White label UB — papel timbrado pra documentos gerados

O **papel timbrado oficial** já está extraído e salvo em:
```
codigo/frontend/public/branding/uniao-brasil/papel_timbrado.png
```

Características:
- Cabeçalho: logo "UNIÃO BRASIL 44" (azul + amarelo)
- Rodapé: faixa horizontal azul + amarela
- Marca d'água central: "UNIÃO BRASIL" em cinza-claro
- Cores oficiais: **azul (#003399 aprox) + amarelo (#FFD700 aprox)**

**Reutilizar pra:**
- PDF de relatórios gerados pela plataforma (estudos de campo, auditorias, dossiês exportados)
- Templates DocuSign (nominata, ficha de filiação)
- Cabeçalho de e-mails transacionais quando o tenant for UB
- Login e sidebar no tenant UB (sigla + cor azul/amarela em vez do roxo Mazzel)

---

## Estado atual no produto

### O que já existe

- Sidebar tem rotas placeholder pra `Filiados`, `Delegados`, `Cabos Eleitorais`, `Aliancas`, `Coordenadores`, `Afiliados`
- Backend tem endpoints `/filiados`, `/delegados` mas estão em estado parcial
- RBAC base existe (`PerfilUsuario` enum em `app/models/operacional.py`)

### O que falta

- Modelo `diretorios` + `cargos_comissao` + `membros_comissao` (migration + service) — **NOTA:** com SGIP descoberto, o modelo agora vem da API oficial. Ver `docs/api_sgip_descoberta.md` e `docs/etl_sgip_spec.md`. CRUD manual fica como complemento (notas internas, observações), não como fonte primária.
- ETL SGIP3 TSE pra povoar nominatas automaticamente (sprint dedicado, ~14 dias úteis)
- Algoritmo de Saúde da Nominata cruzando SGIP × atividade da plataforma (anti-fantasma)
- Endpoint CRUD pros 3 acima (cobertura manual de complemento)
- Frontend `/mazzel-preview/diretorios` (visualizar nominatas em árvore — drilldown nacional → estadual → municipal)
- Fluxo de abonador no `/mazzel-preview/filiados` (campo abonador + validação que abonador pertence à Comissão Executiva local)
- Módulo `/mazzel-preview/documentos` (storage + listagem + filtros + integração DocuSign)
- Módulo `/mazzel-preview/tesouraria` (visível só pra cargo Tesoureiro)
- Tema visual UB (tokens CSS azul/amarelo) substituindo roxo Mazzel quando tenant é UB
- Geração de PDF com papel timbrado UB (relatórios, dossiês exportados)

---

## Pra Designer revisar nesta sessão

Pedir ao Designer (na sessão dedicada que César vai abrir):

1. **Layout do módulo Diretórios & Comissões** — árvore navegável (Nacional → Estadual → Municipal) + ficha de cada Comissão Executiva com os 8 cargos preenchidos. Permitir editar nominata.
2. **Layout da Ficha de Filiação digital** — formulário com fluxo de abonador (segundo passo: abonador autentica e assina via DocuSign).
3. **Layout do módulo Documentos** — repositório com filtros (nível, tipo, ano, status assinatura). Preview de PDFs. Botão "Enviar pra DocuSign" + status visual.
4. **Layout da Tesouraria** — KPIs (receitas, despesas, saldo), prestação de contas TSE, gráfico de fluxo. Visível só pra cargos Tesoureiro/Tesoureiro Adjunto.
5. **Tema visual UB** — converter o roxo Mazzel pra azul/amarelo UB no tenant `uniao-brasil`. Manter o tema Mazzel pros outros tenants futuros.
6. **Header/footer pra PDFs** — usar o papel timbrado extraído como template de PDF (relatórios, dossiês exportados, atas).
