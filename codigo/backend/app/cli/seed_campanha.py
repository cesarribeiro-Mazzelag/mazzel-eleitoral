"""
Seed: popula dados de demonstração para o Módulo Campanha.

Cria:
  - 1 PessoaBase candidato: Jaques Wagner
  - 5 PessoaBase equipe: Carlos (delegado), Ana (coord regional),
    Roberto (coord regional), Maria (coord territorial), Luís (coord territorial)
  - 1 Campanha: "Senador BA 2026 - Jaques Wagner"
  - 3 CercaVirtual na Bahia (raio via ST_Buffer)
  - 5 PapelCampanha em cascata
  - 3 MetaCerca (uma por cerca)

Uso:
    docker exec ub_backend python -m app.cli.seed_campanha

Idempotente: não duplica se rodar duas vezes (checa por nome/email).
"""
import asyncio
import sys
import uuid
from datetime import date

from sqlalchemy import select, text


TENANT_ID = 1


async def main() -> int:
    from app.core.database import AsyncSessionLocal
    from app.models.campanha import (
        CampCerca,
        Campanha,
        MetaCerca,
        PapelCampanhaModel,
        PessoaBase,
    )

    async with AsyncSessionLocal() as db:
        try:
            # ------------------------------------------------------------------
            # 1. PessoaBase: candidato Jaques Wagner
            # ------------------------------------------------------------------
            row = await db.execute(
                select(PessoaBase).where(
                    PessoaBase.tenant_id == TENANT_ID,
                    PessoaBase.nome_completo == "Jaques Wagner",
                )
            )
            wagner = row.scalar_one_or_none()
            if not wagner:
                wagner = PessoaBase(
                    id=uuid.uuid4(),
                    tenant_id=TENANT_ID,
                    nome_completo="Jaques Wagner",
                    nome_politico="Jaques Wagner",
                    cpf="12345678901",
                    data_nascimento=date(1952, 4, 9),
                    telefone="(71) 9 9101-0001",
                    email="jaques.wagner@campanha.ba",
                    fonte_cadastro="manual",
                    status="ativo",
                )
                db.add(wagner)
                await db.flush()
                print(f"[+] PessoaBase criada: Jaques Wagner ({wagner.id})")
            else:
                print(f"[=] PessoaBase já existe: Jaques Wagner ({wagner.id})")

            # ------------------------------------------------------------------
            # 2. PessoaBase: equipe (5 pessoas)
            # ------------------------------------------------------------------
            equipe_specs = [
                {
                    "nome_completo": "Carlos Andrade",
                    "nome_politico": "Carlos Andrade",
                    "cpf": "11122233344",
                    "data_nascimento": date(1970, 7, 15),
                    "telefone": "(71) 9 8811-0001",
                    "email": "carlos.andrade@campanha.ba",
                },
                {
                    "nome_completo": "Ana Beatriz Souza",
                    "nome_politico": "Ana Beatriz",
                    "cpf": "22233344455",
                    "data_nascimento": date(1982, 11, 3),
                    "telefone": "(75) 9 8182-3311",
                    "email": "ana.souza@campanha.ba",
                },
                {
                    "nome_completo": "Roberto Carvalho",
                    "nome_politico": "Roberto Carvalho",
                    "cpf": "33344455566",
                    "data_nascimento": date(1975, 9, 20),
                    "telefone": "(77) 9 8420-1100",
                    "email": "roberto.carvalho@campanha.ba",
                },
                {
                    "nome_completo": "Maria Fernanda Lima",
                    "nome_politico": "Maria Lima",
                    "cpf": "44455566677",
                    "data_nascimento": date(1988, 6, 11),
                    "telefone": "(75) 9 9211-3040",
                    "email": "maria.lima@campanha.ba",
                },
                {
                    "nome_completo": "Luís Henrique Oliveira",
                    "nome_politico": "Luís Oliveira",
                    "cpf": "55566677788",
                    "data_nascimento": date(1984, 3, 15),
                    "telefone": "(75) 9 9812-4422",
                    "email": "luis.oliveira@campanha.ba",
                },
            ]
            equipe_pessoas = []
            for spec in equipe_specs:
                row = await db.execute(
                    select(PessoaBase).where(
                        PessoaBase.tenant_id == TENANT_ID,
                        PessoaBase.nome_completo == spec["nome_completo"],
                    )
                )
                p = row.scalar_one_or_none()
                if not p:
                    p = PessoaBase(
                        id=uuid.uuid4(),
                        tenant_id=TENANT_ID,
                        fonte_cadastro="manual",
                        status="ativo",
                        **spec,
                    )
                    db.add(p)
                    await db.flush()
                    print(f"[+] PessoaBase criada: {spec['nome_completo']} ({p.id})")
                else:
                    print(f"[=] PessoaBase já existe: {spec['nome_completo']} ({p.id})")
                equipe_pessoas.append(p)

            # ------------------------------------------------------------------
            # 3. Campanha
            # ------------------------------------------------------------------
            row = await db.execute(
                select(Campanha).where(
                    Campanha.tenant_id == TENANT_ID,
                    Campanha.nome == "Senador BA 2026 - Jaques Wagner",
                )
            )
            campanha = row.scalar_one_or_none()
            if not campanha:
                campanha = Campanha(
                    id=uuid.uuid4(),
                    tenant_id=TENANT_ID,
                    nome="Senador BA 2026 - Jaques Wagner",
                    candidato_pessoa_id=wagner.id,
                    cargo_disputado="SENADOR",
                    ciclo_eleitoral=2026,
                    uf="BA",
                    periodo_atual="pre_campanha",
                    status="ativa",
                    metas_json={"votos_meta": 2200000, "cobertura_meta": 80, "cercas_meta": 46},
                    orcamento_total_centavos=620000000,
                )
                db.add(campanha)
                await db.flush()
                print(f"[+] Campanha criada: {campanha.nome} ({campanha.id})")
            else:
                print(f"[=] Campanha já existe: {campanha.nome} ({campanha.id})")

            # ------------------------------------------------------------------
            # 4. CercaVirtual (3 cercas via ST_Buffer)
            # ------------------------------------------------------------------
            cercas_specs = [
                {
                    "nome": "Recôncavo Norte",
                    "cor_hex": "#3B82F6",
                    # Centro: Feira de Santana - BA  (lat: -12.2664, lng: -38.9663)
                    "lat": -12.2664,
                    "lng": -38.9663,
                    "raio": 20000,  # 20km
                    "observacoes": "Área estratégica principal — coração do Recôncavo Baiano",
                },
                {
                    "nome": "Tatuapé Centro",
                    "cor_hex": "#10B981",
                    # Sub-área dentro do Recôncavo Norte - perto de São Félix
                    "lat": -12.6050,
                    "lng": -38.9736,
                    "raio": 8000,  # 8km
                    "observacoes": "Sub-cerca urbana: São Félix e adjacências",
                },
                {
                    "nome": "Mooca Leste",
                    "cor_hex": "#F59E0B",
                    # Cachoeira - BA
                    "lat": -12.6100,
                    "lng": -38.9630,
                    "raio": 10000,  # 10km
                    "observacoes": "Expansão leste do Recôncavo — Cachoeira",
                },
            ]
            cercas_criadas = []
            for i, spec in enumerate(cercas_specs):
                row = await db.execute(
                    select(CampCerca).where(
                        CampCerca.campanha_id == campanha.id,
                        CampCerca.nome == spec["nome"],
                    )
                )
                cerca = row.scalar_one_or_none()
                if not cerca:
                    # Gera polígono via PostGIS ST_Buffer
                    r = await db.execute(
                        text(
                            "SELECT ST_AsText(ST_SetSRID("
                            "  ST_Buffer("
                            "    ST_SetSRID(ST_MakePoint(:lng, :lat), 4326)::geography,"
                            "    :raio"
                            "  )::geometry,"
                            "  4326"
                            ")) AS wkt"
                        ),
                        {"lat": spec["lat"], "lng": spec["lng"], "raio": spec["raio"]},
                    )
                    wkt = r.scalar_one_or_none()

                    cerca = CampCerca(
                        id=uuid.uuid4(),
                        campanha_id=campanha.id,
                        # Cerca 1 é raiz; 2 e 3 são sub-cercas da cerca 0
                        parent_id=cercas_criadas[0].id if i > 0 and cercas_criadas else None,
                        nome=spec["nome"],
                        cor_hex=spec["cor_hex"],
                        observacoes=spec["observacoes"],
                        tipo_criacao="raio",
                        raio_metros=spec["raio"],
                        status="ativa",
                    )
                    if wkt:
                        cerca.poligono = wkt
                        # Centro como POINT WKT
                        cerca.centro = f"SRID=4326;POINT({spec['lng']} {spec['lat']})"
                    db.add(cerca)
                    await db.flush()
                    print(f"[+] CercaVirtual criada: {spec['nome']} ({cerca.id})")
                else:
                    print(f"[=] CercaVirtual já existe: {spec['nome']} ({cerca.id})")
                cercas_criadas.append(cerca)

            # ------------------------------------------------------------------
            # 5. PapelCampanha em cascata
            # Carlos = delegado (topo)
            # Ana, Roberto = coord_regional (abaixo de Carlos)
            # Maria, Luís = coord_territorial (abaixo de Ana e Roberto respectivamente)
            # ------------------------------------------------------------------
            papeis_specs = [
                {
                    "pessoa": equipe_pessoas[0],  # Carlos = delegado
                    "papel": "delegado",
                    "superior_id": None,
                    "cerca": None,
                    "idx": 0,
                },
                {
                    "pessoa": equipe_pessoas[1],  # Ana = coord_regional
                    "papel": "coord_regional",
                    "superior_id": None,  # será atualizado
                    "cerca": cercas_criadas[0],
                    "idx": 1,
                },
                {
                    "pessoa": equipe_pessoas[2],  # Roberto = coord_regional
                    "papel": "coord_regional",
                    "superior_id": None,  # será atualizado
                    "cerca": cercas_criadas[1] if len(cercas_criadas) > 1 else None,
                    "idx": 2,
                },
                {
                    "pessoa": equipe_pessoas[3],  # Maria = coord_territorial
                    "papel": "coord_territorial",
                    "superior_id": None,  # será atualizado
                    "cerca": cercas_criadas[1] if len(cercas_criadas) > 1 else None,
                    "idx": 3,
                },
                {
                    "pessoa": equipe_pessoas[4],  # Luís = coord_territorial
                    "papel": "coord_territorial",
                    "superior_id": None,  # será atualizado
                    "cerca": cercas_criadas[2] if len(cercas_criadas) > 2 else None,
                    "idx": 4,
                },
            ]

            papeis_criados = []
            for spec in papeis_specs:
                pessoa = spec["pessoa"]
                row = await db.execute(
                    select(PapelCampanhaModel).where(
                        PapelCampanhaModel.campanha_id == campanha.id,
                        PapelCampanhaModel.pessoa_id == pessoa.id,
                    )
                )
                papel = row.scalar_one_or_none()
                if not papel:
                    # superior: delegado é topo; regionais reportam ao delegado; territoriais ao seu regional
                    if spec["idx"] == 0:
                        superior_id = None
                    elif spec["idx"] in (1, 2):
                        # Regionais reportam ao delegado (Carlos = papeis_criados[0])
                        superior_id = papeis_criados[0].id if papeis_criados else None
                    elif spec["idx"] == 3:
                        # Maria reporta a Ana (papeis_criados[1])
                        superior_id = papeis_criados[1].id if len(papeis_criados) > 1 else None
                    else:
                        # Luís reporta a Roberto (papeis_criados[2])
                        superior_id = papeis_criados[2].id if len(papeis_criados) > 2 else None

                    cerca_id = spec["cerca"].id if spec["cerca"] else None

                    papel = PapelCampanhaModel(
                        id=uuid.uuid4(),
                        pessoa_id=pessoa.id,
                        campanha_id=campanha.id,
                        papel=spec["papel"],
                        superior_id=superior_id,
                        cerca_virtual_id=cerca_id,
                        status="ativo",
                    )
                    db.add(papel)
                    await db.flush()
                    print(f"[+] PapelCampanha criado: {pessoa.nome_completo} ({spec['papel']}) ({papel.id})")
                else:
                    print(f"[=] PapelCampanha já existe: {pessoa.nome_completo} ({papel.id})")
                papeis_criados.append(papel)

            # Atualiza responsável das cercas com os papéis dos coordenadores
            # Cerca 0 = Recôncavo Norte -> responsável: Ana (papeis_criados[1])
            # Cerca 1 = Tatuapé Centro -> responsável: Roberto (papeis_criados[2])
            # Cerca 2 = Mooca Leste -> responsável: Maria (papeis_criados[3])
            responsaveis = [
                (0, 1), (1, 2), (2, 3),
            ]
            for ci, pi in responsaveis:
                if ci < len(cercas_criadas) and pi < len(papeis_criados):
                    if cercas_criadas[ci].responsavel_papel_id is None:
                        cercas_criadas[ci].responsavel_papel_id = papeis_criados[pi].id
                        print(f"[=] Cerca '{cercas_criadas[ci].nome}' -> responsável: {equipe_pessoas[pi - 1].nome_completo}")

            # ------------------------------------------------------------------
            # 6. MetaCerca (uma por cerca)
            # ------------------------------------------------------------------
            meta_specs = [
                {"cerca_idx": 0, "votos_meta": 62000, "eleitores_estimados": 486000},
                {"cerca_idx": 1, "votos_meta": 14000, "eleitores_estimados": 95000},
                {"cerca_idx": 2, "votos_meta": 18000, "eleitores_estimados": 120000},
            ]
            for spec in meta_specs:
                cerca = cercas_criadas[spec["cerca_idx"]]
                row = await db.execute(
                    select(MetaCerca).where(MetaCerca.cerca_virtual_id == cerca.id)
                )
                meta = row.scalar_one_or_none()
                if not meta:
                    meta = MetaCerca(
                        id=uuid.uuid4(),
                        cerca_virtual_id=cerca.id,
                        votos_meta=spec["votos_meta"],
                        eleitores_estimados=spec["eleitores_estimados"],
                        prioridade="alta",
                    )
                    db.add(meta)
                    print(f"[+] MetaCerca criada para: {cerca.nome}")
                else:
                    print(f"[=] MetaCerca já existe para: {cerca.nome}")

            await db.commit()
            print("\n[OK] Seed concluído com sucesso.")
            print(f"  Tenant ID  : {TENANT_ID}")
            print(f"  Candidato  : Jaques Wagner ({wagner.id})")
            print(f"  Campanha   : {campanha.nome} ({campanha.id})")
            print(f"  Pessoas    : {1 + len(equipe_pessoas)} (candidato + equipe)")
            print(f"  Cercas     : {len(cercas_criadas)}")
            print(f"  Papéis     : {len(papeis_criados)}")
            return 0

        except Exception as e:
            import traceback
            print(f"[ERRO] {type(e).__name__}: {e}", file=sys.stderr)
            traceback.print_exc(file=sys.stderr)
            await db.rollback()
            return 1


if __name__ == "__main__":
    exit_code = asyncio.run(main())
    sys.exit(exit_code)
