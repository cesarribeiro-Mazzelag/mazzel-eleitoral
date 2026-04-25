# Auditoria: cargo PREFEITO
Data: 2026-04-24

## Tabela principal

| Prefeito | UF/cidade | Porte | Tier | Overall | Bio? | Atributos-chave | Executivo? | Inconsistencias |
|---|---|---|---|---|---|---|---|---|
| EDUARDO PAES | RJ / Rio de Janeiro | Capital (1.861.856 votos) | Prata | 68 | Sim (Wikipedia) | votacao=56, eficiencia=78, articulacao=16, territorial=83, integridade=99 | NÃO (disponivel=false, total_atos=0) | 1. executivo vazio apesar de ser prefeito com mandato ativo; 2. ficha_limpa=null nos ciclos 2024 e 2020; 3. articulacao=16 penaliza prefeito que nao tem mandato legislativo por definicao; 4. queda de votos governador->prefeito gera alerta "Queda 60%" sem contexto de cargo diferente |
| ARNALDINHO BORGO | ES / Vila Velha | Medio (193.451 votos) | Bronze | 63 | NÃO (bio_resumida=null) | votacao=74, eficiencia=58, articulacao=8, financeiro=99, integridade=99 | NÃO (disponivel=false, total_atos=0) | 1. bio ausente para prefeito de cidade de porte medio; 2. executivo vazio idem; 3. articulacao=8 idem prefeito nao legisla; 4. alerta "Crescimento 1159%" comparando deputado estadual 2018 x prefeito 2024 - cargos incomparaveis; 5. eficiencia=58 sendo que CPV esta abaixo do p25 (melhor) - possivel inversao de sinal |
| CORONEL DUCH | SP / Itapeva | Pequeno (19.956 votos) | Bronze | 53 | NÃO (bio_resumida=null) | votacao=45, eficiencia=94, articulacao=8, fidelidade=99, integridade=null | NÃO (disponivel=false, total_atos=0) | 1. integridade=null porque juridico.disponivel=false - prefeita de primeiro mandato sem dados TSE suficientes; 2. executivo vazio idem; 3. articulacao=8 idem; 4. territorial=40 pois so tem 1 zona eleitoral (cidade pequena) - algoritmo nao diferencia "venceu a unica zona" de "fraco territorialmente"; 5. potencial=25 penaliza estreante que ganhou na primeira tentativa |

---

## Bugs PREF

**BUG-P1: executivo sempre vazio para PREFEITO**
- `executivo.disponivel=false` e `total_atos=0` para os 3 prefeitos.
- Prefeito nao e Presidente nem Governador - nao tem MPs/vetos federais. Mas tem: decretos municipais (Diario Oficial), projetos de lei enviados a Camara Municipal, leis sancionadas/vetadas.
- O modelo executivo esta mapeado para Presidente/Governador. Para PREFEITO, os campos nao fazem sentido ou nao tem fonte de dados. Precisa ou (a) exibir secao diferente para prefeito com fontes municipais futuras, ou (b) ocultar secao executivo para prefeito e documentar como "cobertura 0%".

**BUG-P2: articulacao=8 penaliza prefeito que por definicao nao tem mandato legislativo**
- Articulacao mede projetos legislativos aprovados. Prefeito nao senta na Camara Municipal - envia projetos a ela.
- Prefeitos dos 3 casos: articulacao entre 8 e 16. Distorce overall para baixo sistematicamente.
- Fix: para cargo=PREFEITO, articulacao deve ser recalculada com base em (a) leis municipais enviadas pelo executivo e aprovadas, ou (b) zeroed-out com peso redistribuido para BSE/executivo.

**BUG-P3: alerta de "evolucao de votos" compara cargos diferentes**
- Arnaldinho: alerta "Crescimento 1159%" compara dep.estadual 2018 (15.364 votos) com prefeito 2024 (193.451 votos).
- Eduardo Paes: alerta "Queda 60%" compara governador 2018 (4.629.231 votos) com prefeito 2024 (1.861.856 votos).
- Fix: calculo de evolucao de votos so deve comparar ciclos do MESMO cargo. Mudanca de cargo deve gerar nota informativa, nao alerta de queda/crescimento.

**BUG-P4: territorial penaliza cidade pequena com zona unica**
- Coronel Duch: territorial=40, mas ganhou 100% dos votos na unica zona da cidade.
- O algoritmo interpreta "1 zona com concentracao 100%" como perfil concentrado/fraco.
- Fix: normalizar territorial pelo numero de zonas disponiveis no municipio. Cidade com 1 zona = 100% de cobertura possivel.

**BUG-P5: integridade=null quando juridico indisponivel**
- Coronel Duch: `integridade=null` porque `juridico.disponivel=false`.
- Candidato sem historico de sancoes nao e o mesmo que sem dados. Null no overall distorce o tier.
- Fix: se sancoes=[] e ciclos_inapto=0, default integridade=85 (neutro) ao inves de null.

**BUG-P6: ficha_limpa=null em ciclos recentes de candidato com historico**
- Eduardo Paes: ficha_limpa=null para 2024 e 2020, true apenas para 2018.
- Pode ser problema de ETL/fonte TSE que nao carregou o campo para ciclos municipais.

---

## Sugestoes fix

1. **Criar flag `cargo_eh_executivo_municipal`** no calculo do overall. Quando true: zerar articulacao legislativa e redistribuir peso para BSE+executivo_municipal (futuro).
2. **Evolucao de votos**: filtrar `evolucao_votos` por cargo=ciclo_cargo antes de calcular delta percentual. Exibir linha separada "outros cargos disputados" sem gerar alerta de crescimento/queda.
3. **Territorial normalizado**: dividir concentracao_top3 pelo total_regioes_disponiveis no municipio, nao pelo total_regioes_com_voto do candidato.
4. **integridade default**: quando sancoes_ativas=0 e ciclos_inapto=0 mas juridico.disponivel=false, usar integridade=85 ao inves de null.
5. **Bonus capital/grande**: Eduardo Paes recebeu bonus "+2 Prefeito" apenas. Verificar se bonus capital (+5 previsto na matriz) foi aplicado - nao aparece em `bonus_aplicados`. Pode estar faltando.
6. **BSE para prefeito**: validar se BSE usa votos_total do proprio ciclo (correto) e nao media nacional. Eduardo Paes tinha BSE implicito alto (percentil 88.9) mas bonus capital ausente.
