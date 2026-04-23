"""
Seed: popula dados de demonstração para o Módulo Afiliados.

Cria:
  - 15 filiados (replicando o mock do frontend)
  - 6 repasses (Ago/25 a Jan/26)
  - 5 treinamentos (mesmos nomes do mock)
  - 4 comunicações
  - 6 saude_base (Ago/25 a Jan/26)

Uso:
    docker exec ub_backend python -m app.cli.seed_afiliados

Idempotente: não duplica se rodar duas vezes (checa por nome/tenant).
"""
import asyncio
import hashlib
import sys
from datetime import date, datetime, timezone

TENANT_ID = 1


def _cpf_hash(cpf_digits: str) -> str:
    return hashlib.sha256(cpf_digits.encode()).hexdigest()


async def main() -> int:
    from app.core.database import AsyncSessionLocal
    from app.models.afiliados import (
        AfilComunicacao,
        AfilFiliado,
        AfilRepasse,
        AfilSaudeBase,
        AfilTreinamento,
    )
    from sqlalchemy import select

    async with AsyncSessionLocal() as db:
        try:
            # ------------------------------------------------------------------
            # 1. Filiados
            # ------------------------------------------------------------------
            FILIADOS_DATA = [
                ("Carlos Eduardo Silva",      "11122233301", "Salvador",        "BA", "ativo",    date(2019, 3, 1),  True,  4, ["Liderança", "Jovem"],                  "Masculino",  date(1994, 5, 15)),
                ("Maria das Graças Oliveira", "11122233302", "Feira de Santana","BA", "ativo",    date(2021, 7, 1),  True,  2, ["Mulher", "Diretoria local"],            "Feminino",   date(1978, 11, 2)),
                ("João Pedro Santos",         "11122233303", "Ilhéus",          "BA", "inativo",  date(2016, 11, 1), False, 0, [],                                       "Masculino",  date(1965, 3, 20)),
                ("Ana Beatriz Costa",         "11122233304", "Vitória da Conq.","BA", "ativo",    date(2023, 1, 1),  True,  5, ["Jovem", "Tech"],                        "Feminino",   date(2000, 8, 7)),
                ("Roberto Almeida",           "11122233305", "Barreiras",       "BA", "ativo",    date(2018, 5, 1),  False, 1, ["Rural"],                                "Masculino",  date(1970, 2, 14)),
                ("Fernanda Lima",             "11122233306", "Salvador",        "BA", "suspenso", date(2020, 2, 1),  False, 0, ["Investigação"],                         "Feminino",   date(1985, 6, 30)),
                ("Pedro Henrique Rocha",      "11122233307", "Juazeiro",        "BA", "ativo",    date(2022, 9, 1),  True,  3, ["Jovem"],                                "Masculino",  date(1998, 4, 11)),
                ("Luciana Barbosa",           "11122233308", "Porto Seguro",    "BA", "ativo",    date(2017, 6, 1),  True,  6, ["Mulher", "Liderança"],                  "Feminino",   date(1975, 12, 5)),
                ("Gilberto Mendonça",         "11122233309", "Alagoinhas",      "BA", "ativo",    date(2020, 11, 1), True,  2, ["Rural", "Jovem"],                       "Masculino",  date(1996, 9, 22)),
                ("Simone Rodrigues",          "11122233310", "Cruz das Almas",  "BA", "ativo",    date(2019, 4, 1),  True,  4, ["Mulher", "Tech"],                       "Feminino",   date(1982, 7, 17)),
                ("Márcio de Souza",           "11122233311", "Salvador",        "BA", "inativo",  date(2015, 8, 1),  False, 1, [],                                       "Masculino",  date(1960, 1, 9)),
                ("Raquel Ferreira",           "11122233312", "Camaçari",        "BA", "ativo",    date(2021, 3, 1),  True,  3, ["Mulher", "Diretoria local"],            "Feminino",   date(1988, 10, 25)),
                ("Paulo Freitas",             "11122233313", "Lauro de Freitas","BA", "ativo",    date(2022, 6, 1),  False, 2, ["Jovem"],                                "Masculino",  date(2001, 3, 3)),
                ("Daniela Castro",            "11122233314", "Feira de Santana","BA", "suspenso", date(2018, 1, 1),  False, 0, ["Investigação"],                         "Feminino",   date(1979, 8, 14)),
                ("Wilson Teixeira",           "11122233315", "Vitória da Conq.","BA", "ativo",    date(2020, 9, 1),  True,  5, ["Rural", "Liderança"],                   "Masculino",  date(1967, 5, 28)),
            ]

            criados_fil = 0
            for (nome, cpf, cidade, uf, st, dt_fil, contrib, trein, tags, genero, dt_nasc) in FILIADOS_DATA:
                row = await db.execute(
                    select(AfilFiliado).where(
                        AfilFiliado.tenant_id == TENANT_ID,
                        AfilFiliado.nome_completo == nome,
                    )
                )
                if row.scalar_one_or_none() is None:
                    db.add(AfilFiliado(
                        tenant_id=TENANT_ID,
                        nome_completo=nome,
                        cpf_hash=_cpf_hash(cpf),
                        cidade=cidade,
                        uf=uf,
                        status=st,
                        data_filiacao=dt_fil,
                        contribuinte_em_dia=contrib,
                        treinamentos_concluidos=trein,
                        tags=tags,
                        genero=genero,
                        data_nascimento=dt_nasc,
                    ))
                    criados_fil += 1

            await db.flush()
            print(f"[filiados] {criados_fil} criados (de 15 tentativas)")

            # ------------------------------------------------------------------
            # 2. Repasses
            # ------------------------------------------------------------------
            REPASSES_DATA = [
                (date(2025, 8, 1),  1842000.00, 0,         176500.00),
                (date(2025, 9, 1),  1842000.00, 0,         198200.00),
                (date(2025, 10, 1), 1842000.00, 1240000.00, 412800.00),
                (date(2025, 11, 1), 1842000.00, 0,         148700.00),
                (date(2025, 12, 1), 1842000.00, 0,         212100.00),
                (date(2026, 1, 1),  1842000.00, 620000.00, 185400.00),
            ]

            criados_rep = 0
            for (mes_ref, fp, fe, doacoes) in REPASSES_DATA:
                row = await db.execute(
                    select(AfilRepasse).where(
                        AfilRepasse.tenant_id == TENANT_ID,
                        AfilRepasse.mes_ref == mes_ref,
                    )
                )
                if row.scalar_one_or_none() is None:
                    total = fp + fe + doacoes
                    db.add(AfilRepasse(
                        tenant_id=TENANT_ID,
                        mes_ref=mes_ref,
                        fundo_partidario=fp,
                        fundo_especial=fe,
                        doacoes=doacoes,
                        total=total,
                    ))
                    criados_rep += 1

            await db.flush()
            print(f"[repasses] {criados_rep} criados (de 6 tentativas)")

            # ------------------------------------------------------------------
            # 3. Treinamentos
            # ------------------------------------------------------------------
            TREINAMENTOS_DATA = [
                ("Escola de Líderes · Módulo I",  312, 287, 87, date(2026, 4, 15)),
                ("Marketing Político Digital",     208, 174, 82, date(2026, 4, 22)),
                ("Oratória para Candidatos",       156, 142, 91, date(2026, 5, 3)),
                ("Legislação Eleitoral 2026",      429, 381, 78, date(2026, 5, 10)),
                ("Fundraising e Compliance",        94,  81, 85, date(2026, 5, 18)),
            ]

            criados_trein = 0
            for (nome, insc, concl, nps, prox) in TREINAMENTOS_DATA:
                row = await db.execute(
                    select(AfilTreinamento).where(
                        AfilTreinamento.tenant_id == TENANT_ID,
                        AfilTreinamento.nome_curso == nome,
                    )
                )
                if row.scalar_one_or_none() is None:
                    db.add(AfilTreinamento(
                        tenant_id=TENANT_ID,
                        nome_curso=nome,
                        inscritos=insc,
                        concluintes=concl,
                        nps=nps,
                        data_proxima=prox,
                    ))
                    criados_trein += 1

            await db.flush()
            print(f"[treinamentos] {criados_trein} criados (de 5 tentativas)")

            # ------------------------------------------------------------------
            # 4. Comunicações
            # ------------------------------------------------------------------
            COMUNICACOES_DATA = [
                ("Convite Congresso Estadual 2026", "E-mail + WhatsApp", 47382, 28429, 9874,  datetime(2026, 4, 19, 10, 0, tzinfo=timezone.utc)),
                ("Boleto mensal Jan/26",            "E-mail + SMS",      47382, 38217, 31254, datetime(2026, 4, 16, 9, 0,  tzinfo=timezone.utc)),
                ("Curso novo: Escola de Líderes",   "WhatsApp",          12043, 8921,  3184,  datetime(2026, 4, 13, 14, 0, tzinfo=timezone.utc)),
                ("Campanha Filie-se · Q1",          "E-mail + Push",     47382, 22104, 4821,  datetime(2026, 4, 9, 8, 0,   tzinfo=timezone.utc)),
            ]

            criados_com = 0
            for (assunto, canal, env, ab, cli, enviado_em) in COMUNICACOES_DATA:
                row = await db.execute(
                    select(AfilComunicacao).where(
                        AfilComunicacao.tenant_id == TENANT_ID,
                        AfilComunicacao.assunto == assunto,
                    )
                )
                if row.scalar_one_or_none() is None:
                    db.add(AfilComunicacao(
                        tenant_id=TENANT_ID,
                        assunto=assunto,
                        canal=canal,
                        enviados=env,
                        aberturas=ab,
                        cliques=cli,
                        enviado_em=enviado_em,
                    ))
                    criados_com += 1

            await db.flush()
            print(f"[comunicacoes] {criados_com} criadas (de 4 tentativas)")

            # ------------------------------------------------------------------
            # 5. Saúde da base
            # ------------------------------------------------------------------
            SAUDE_DATA = [
                (date(2025, 8, 1),  1024, 186),
                (date(2025, 9, 1),  987,  172),
                (date(2025, 10, 1), 941,  203),
                (date(2025, 11, 1), 1102, 198),
                (date(2025, 12, 1), 843,  234),
                (date(2026, 1, 1),  892,  214),
            ]

            criados_saude = 0
            for (mes_ref, fil, canc) in SAUDE_DATA:
                row = await db.execute(
                    select(AfilSaudeBase).where(
                        AfilSaudeBase.tenant_id == TENANT_ID,
                        AfilSaudeBase.mes_ref == mes_ref,
                    )
                )
                if row.scalar_one_or_none() is None:
                    db.add(AfilSaudeBase(
                        tenant_id=TENANT_ID,
                        mes_ref=mes_ref,
                        filiacoes_mes=fil,
                        cancelamentos_mes=canc,
                    ))
                    criados_saude += 1

            await db.flush()
            print(f"[saude_base] {criados_saude} criados (de 6 tentativas)")

            await db.commit()
            print("\nSeed concluído com sucesso.")
            return 0

        except Exception as e:
            await db.rollback()
            print(f"ERRO: {e}", file=sys.stderr)
            import traceback
            traceback.print_exc()
            return 1


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
