"""
Agente de Análise Eleitoral com Tool Use.
O agente recebe perguntas em português e usa ferramentas para consultar
o banco de dados real, retornando respostas fundamentadas em dados.
"""
import json
import anthropic
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from app.core.config import settings

client = anthropic.AsyncAnthropic(api_key=settings.ANTHROPIC_API_KEY)

SYSTEM_PROMPT = """Você é o assistente de inteligência eleitoral do partido União Brasil.

Você tem acesso a ferramentas que consultam dados eleitorais reais de todo o Brasil.
Use SEMPRE as ferramentas para responder — nunca invente números.

CONTEXTO CRÍTICO:
- União Brasil (nº 44) foi criado em fev/2022. Antes: DEM (nº 25) e PSL (nº 17).
- Municípios (Prefeito/Vereador): eleições em 2016, 2020, 2024.
- Estado/Federal (Dep./Senador/Gov.): eleições em 2018, 2022.
- Farol: VERDE = força, AMARELO = frágil, VERMELHO = fraqueza.

ESTILO: Responder em português brasileiro. Ser direto e objetivo.
Destacar números relevantes. Mencionar tendências preocupantes proativamente.
"""

TOOLS = [
    {
        "name": "resumo_brasil",
        "description": "KPIs nacionais: municípios por farol, eleitos, votos totais.",
        "input_schema": {
            "type": "object",
            "properties": {
                "ano": {"type": "integer", "default": 2024},
                "cargo": {"type": "string", "default": "VEREADOR"},
            },
        },
    },
    {
        "name": "resumo_estado",
        "description": "KPIs de um estado: municípios por farol, eleitos, votos, variação.",
        "input_schema": {
            "type": "object",
            "properties": {
                "uf": {"type": "string", "description": "Sigla do estado"},
                "ano": {"type": "integer", "default": 2024},
                "cargo": {"type": "string", "default": "VEREADOR"},
            },
            "required": ["uf"],
        },
    },
    {
        "name": "top_municipios",
        "description": "Lista municípios por desempenho. Use para 'onde somos mais fortes', 'maiores perdas', etc.",
        "input_schema": {
            "type": "object",
            "properties": {
                "uf": {"type": "string"},
                "farol": {"type": "string", "enum": ["VERDE", "AMARELO", "VERMELHO"]},
                "ordem": {"type": "string", "enum": ["votos_desc", "votos_asc", "variacao_desc", "variacao_asc"], "default": "votos_desc"},
                "limite": {"type": "integer", "default": 10},
                "ano": {"type": "integer", "default": 2024},
                "cargo": {"type": "string", "default": "VEREADOR"},
            },
        },
    },
    {
        "name": "buscar_politico",
        "description": "Busca histórico eleitoral de um político pelo nome.",
        "input_schema": {
            "type": "object",
            "properties": {
                "nome": {"type": "string"},
                "cargo": {"type": "string"},
                "uf": {"type": "string"},
            },
            "required": ["nome"],
        },
    },
    {
        "name": "comparar_eleicoes",
        "description": "Compara desempenho entre duas eleições: votos, eleitos, municípios ganhos/perdidos.",
        "input_schema": {
            "type": "object",
            "properties": {
                "ano_atual": {"type": "integer"},
                "ano_anterior": {"type": "integer"},
                "uf": {"type": "string"},
                "cargo": {"type": "string", "default": "VEREADOR"},
            },
            "required": ["ano_atual", "ano_anterior"],
        },
    },
]


async def _resumo_brasil(db, ano, cargo):
    r = await db.execute(text("""
        SELECT COUNT(*) FILTER (WHERE f.status='VERDE') AS verdes,
               COUNT(*) FILTER (WHERE f.status='AMARELO') AS amarelos,
               COUNT(*) FILTER (WHERE f.status='VERMELHO') AS vermelhos,
               COALESCE(SUM(f.votos_atual),0) AS votos,
               COALESCE(SUM(f.eleitos_atual),0) AS eleitos,
               ROUND(AVG(f.variacao_pct)::numeric,1) AS var_media
        FROM farol_municipio f
        WHERE f.ano_referencia=:ano AND UPPER(f.cargo)=:cargo
    """), {"ano": ano, "cargo": cargo.upper()})
    row = r.fetchone()
    return {"ano": ano, "cargo": cargo, "verdes": row.verdes, "amarelos": row.amarelos,
            "vermelhos": row.vermelhos, "total_votos": row.votos, "total_eleitos": row.eleitos,
            "variacao_media_pct": float(row.var_media) if row.var_media else None}


async def _resumo_estado(db, uf, ano, cargo):
    r = await db.execute(text("""
        SELECT COUNT(*) FILTER (WHERE f.status='VERDE') AS verdes,
               COUNT(*) FILTER (WHERE f.status='AMARELO') AS amarelos,
               COUNT(*) FILTER (WHERE f.status='VERMELHO') AS vermelhos,
               COALESCE(SUM(f.votos_atual),0) AS votos,
               COALESCE(SUM(f.votos_anterior),0) AS votos_ant,
               COALESCE(SUM(f.eleitos_atual),0) AS eleitos,
               COALESCE(SUM(f.eleitos_anterior),0) AS eleitos_ant,
               ROUND(AVG(f.variacao_pct)::numeric,1) AS var_media
        FROM farol_municipio f JOIN municipios m ON m.id=f.municipio_id
        WHERE m.estado_uf=:uf AND f.ano_referencia=:ano AND UPPER(f.cargo)=:cargo
    """), {"uf": uf.upper(), "ano": ano, "cargo": cargo.upper()})
    row = r.fetchone()
    total = (await db.execute(text("SELECT COUNT(*) FROM municipios WHERE estado_uf=:uf"), {"uf": uf.upper()})).scalar()
    return {"estado": uf.upper(), "ano": ano, "cargo": cargo, "total_municipios": total,
            "verdes": row.verdes, "amarelos": row.amarelos, "vermelhos": row.vermelhos,
            "votos": row.votos, "votos_anteriores": row.votos_ant,
            "eleitos": row.eleitos, "eleitos_anteriores": row.eleitos_ant,
            "variacao_media_pct": float(row.var_media) if row.var_media else None}


async def _top_municipios(db, uf, farol, ordem, limite, ano, cargo):
    filtro_uf = "AND m.estado_uf=:uf" if uf else ""
    filtro_farol = "AND f.status=:farol" if farol else ""
    ordem_sql = {"votos_desc": "f.votos_atual DESC", "votos_asc": "f.votos_atual ASC",
                 "variacao_desc": "f.variacao_pct DESC NULLS LAST", "variacao_asc": "f.variacao_pct ASC NULLS LAST"}.get(ordem, "f.votos_atual DESC")
    r = await db.execute(text(f"""
        SELECT m.nome, m.estado_uf, f.status, f.votos_atual, f.votos_anterior, f.variacao_pct, f.eleitos_atual
        FROM farol_municipio f JOIN municipios m ON m.id=f.municipio_id
        WHERE f.ano_referencia=:ano AND UPPER(f.cargo)=:cargo {filtro_uf} {filtro_farol}
        ORDER BY {ordem_sql} LIMIT :lim
    """), {"ano": ano, "cargo": cargo.upper(), "uf": uf.upper() if uf else None, "farol": farol, "lim": limite})
    return [{"municipio": row.nome, "uf": row.estado_uf, "farol": row.status,
             "votos": row.votos_atual, "votos_anteriores": row.votos_anterior,
             "variacao_pct": float(row.variacao_pct) if row.variacao_pct else None,
             "eleitos": row.eleitos_atual} for row in r.fetchall()]


async def _buscar_politico(db, nome, cargo=None, uf=None):
    filtro_cargo = "AND UPPER(ca.cargo)=:cargo" if cargo else ""
    filtro_uf = "AND ca.estado_uf=:uf" if uf else ""
    r = await db.execute(text(f"""
        SELECT COALESCE(c.nome_urna,c.nome_completo) AS nome, p.sigla,
               ca.ano, ca.cargo, ca.estado_uf, ca.votos_total, ca.eleito, ca.situacao_final
        FROM candidatos c JOIN candidaturas ca ON ca.candidato_id=c.id JOIN partidos p ON p.id=ca.partido_id
        WHERE UPPER(COALESCE(c.nome_urna,c.nome_completo)) LIKE :q AND p.numero IN (44,25,17)
          {filtro_cargo} {filtro_uf}
        ORDER BY ca.eleito DESC, ca.ano DESC, ca.votos_total DESC LIMIT 20
    """), {"q": f"%{nome.upper()}%", "cargo": cargo.upper() if cargo else None, "uf": uf.upper() if uf else None})
    return [{"nome": row.nome, "partido": row.sigla, "ano": row.ano, "cargo": row.cargo,
             "estado": row.estado_uf, "votos": row.votos_total, "eleito": row.eleito,
             "situacao": row.situacao_final} for row in r.fetchall()]


async def _comparar_eleicoes(db, ano_atual, ano_anterior, uf=None, cargo="VEREADOR"):
    filtro_uf = "AND m.estado_uf=:uf" if uf else ""
    r = await db.execute(text(f"""
        SELECT COUNT(*) FILTER (WHERE f.status='VERDE') AS verdes,
               COUNT(*) FILTER (WHERE f.status='AMARELO') AS amarelos,
               COUNT(*) FILTER (WHERE f.status='VERMELHO') AS vermelhos,
               COALESCE(SUM(f.votos_atual),0) AS votos_atual,
               COALESCE(SUM(f.votos_anterior),0) AS votos_ant,
               COALESCE(SUM(f.eleitos_atual),0) AS eleitos_atual,
               COALESCE(SUM(f.eleitos_anterior),0) AS eleitos_ant,
               COUNT(*) FILTER (WHERE f.eleitos_atual>0 AND f.eleitos_anterior=0) AS ganhos,
               COUNT(*) FILTER (WHERE f.eleitos_atual=0 AND f.eleitos_anterior>0) AS perdidos
        FROM farol_municipio f JOIN municipios m ON m.id=f.municipio_id
        WHERE f.ano_referencia=:ano AND UPPER(f.cargo)=:cargo {filtro_uf}
    """), {"ano": ano_atual, "cargo": cargo.upper(), "uf": uf.upper() if uf else None})
    row = r.fetchone()
    var = round((row.votos_atual - row.votos_ant) / row.votos_ant * 100, 1) if row.votos_ant else None
    return {"periodo": f"{ano_anterior} → {ano_atual}", "estado": uf.upper() if uf else "Brasil",
            "votos_atual": row.votos_atual, "votos_anteriores": row.votos_ant, "variacao_votos_pct": var,
            "eleitos_atual": row.eleitos_atual, "eleitos_anteriores": row.eleitos_ant,
            "verdes": row.verdes, "amarelos": row.amarelos, "vermelhos": row.vermelhos,
            "municipios_ganhos": row.ganhos, "municipios_perdidos": row.perdidos}


async def _executar_ferramenta(nome, inputs, db):
    try:
        if nome == "resumo_brasil":
            res = await _resumo_brasil(db, inputs.get("ano", 2024), inputs.get("cargo", "VEREADOR"))
        elif nome == "resumo_estado":
            res = await _resumo_estado(db, inputs["uf"], inputs.get("ano", 2024), inputs.get("cargo", "VEREADOR"))
        elif nome == "top_municipios":
            res = await _top_municipios(db, inputs.get("uf"), inputs.get("farol"), inputs.get("ordem", "votos_desc"), inputs.get("limite", 10), inputs.get("ano", 2024), inputs.get("cargo", "VEREADOR"))
        elif nome == "buscar_politico":
            res = await _buscar_politico(db, inputs["nome"], inputs.get("cargo"), inputs.get("uf"))
        elif nome == "comparar_eleicoes":
            res = await _comparar_eleicoes(db, inputs["ano_atual"], inputs["ano_anterior"], inputs.get("uf"), inputs.get("cargo", "VEREADOR"))
        else:
            res = {"erro": f"ferramenta desconhecida: {nome}"}
    except Exception as e:
        res = {"erro": str(e)}
    return json.dumps(res, ensure_ascii=False)


async def processar_pergunta(pergunta, historico, contexto_usuario, db):
    if not settings.ANTHROPIC_API_KEY:
        return "IA não configurada. Defina ANTHROPIC_API_KEY no arquivo .env."

    system = SYSTEM_PROMPT
    if contexto_usuario.get("perfil") == "DIRETORIA":
        uf = contexto_usuario.get("estado_uf", "")
        system += f"\n\nRESTRIÇÃO: Usuário da Diretoria de {uf}. Mostre apenas dados de {uf}."

    msgs = list(historico) + [{"role": "user", "content": pergunta}]

    for _ in range(5):
        resp = await client.messages.create(
            model="claude-opus-4-6", max_tokens=2048,
            system=system, tools=TOOLS, messages=msgs,
        )
        if resp.stop_reason == "end_turn":
            return "\n".join(b.text for b in resp.content if hasattr(b, "text"))
        if resp.stop_reason == "tool_use":
            msgs.append({"role": "assistant", "content": [b.model_dump() for b in resp.content]})
            results = []
            for bloco in resp.content:
                if bloco.type == "tool_use":
                    resultado = await _executar_ferramenta(bloco.name, bloco.input, db)
                    results.append({"type": "tool_result", "tool_use_id": bloco.id, "content": resultado})
            msgs.append({"role": "user", "content": results})
    return "Não foi possível processar. Tente novamente."


async def busca_rapida(texto):
    if not settings.ANTHROPIC_API_KEY:
        return {"tipo": "pergunta", "valor": texto, "acao": "responder_pergunta"}
    r = await client.messages.create(
        model="claude-haiku-4-5-20251001", max_tokens=150,
        messages=[{"role": "user", "content": f'Analise: "{texto}". JSON: {{"tipo":"municipio"|"estado"|"politico"|"pergunta","valor":"...","acao":"filtrar_mapa"|"abrir_dossie"|"responder_pergunta"}}. Só o JSON.'}],
    )
    try:
        return json.loads(r.content[0].text)
    except Exception:
        return {"tipo": "pergunta", "valor": texto, "acao": "responder_pergunta"}
