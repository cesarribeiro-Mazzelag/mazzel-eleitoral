"""
Validação de CPF e Título de Eleitor para cadastro de filiados.
Trava contra inversão CPF x Título.
"""
import httpx
from app.core.config import settings
from app.core.security import validar_cpf_digitos, detectar_inversao_cpf_titulo


class ResultadoValidacao:
    def __init__(self, valido: bool, mensagem: str, fonte: str):
        self.valido = valido
        self.mensagem = mensagem
        self.fonte = fonte  # "local", "serpro", "tse"


async def validar_cpf_completo(cpf: str) -> ResultadoValidacao:
    """
    Validação em duas etapas:
    1. Validação matemática local (dígitos verificadores)
    2. Consulta SERPRO DataValid (se configurado)
    """
    digitos = "".join(c for c in cpf if c.isdigit())

    # Etapa 1: validação matemática
    if not validar_cpf_digitos(digitos):
        return ResultadoValidacao(
            valido=False,
            mensagem="CPF inválido — dígitos verificadores incorretos.",
            fonte="local",
        )

    # Etapa 2: SERPRO DataValid (se API key configurada)
    if settings.SERPRO_API_KEY:
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                resp = await client.post(
                    settings.SERPRO_CPF_URL,
                    headers={
                        "Authorization": f"Bearer {settings.SERPRO_API_KEY}",
                        "Content-Type": "application/json",
                    },
                    json={"key": {"cpf": digitos}},
                )
                if resp.status_code == 200:
                    data = resp.json()
                    if data.get("answer", {}).get("cpf", {}).get("ni") == digitos:
                        return ResultadoValidacao(
                            valido=True,
                            mensagem="CPF válido e ativo na Receita Federal.",
                            fonte="serpro",
                        )
                    return ResultadoValidacao(
                        valido=False,
                        mensagem="CPF não encontrado ou inativo na Receita Federal.",
                        fonte="serpro",
                    )
        except httpx.TimeoutException:
            # Se SERPRO não responde, aceita a validação matemática
            pass

    return ResultadoValidacao(
        valido=True,
        mensagem="CPF válido (validação matemática).",
        fonte="local",
    )


async def validar_titulo_eleitor(titulo: str) -> ResultadoValidacao:
    """
    Validação do título de eleitor.
    Etapa 1: validação matemática do dígito verificador.
    Etapa 2: consulta TSE (quando disponível).
    """
    digitos = "".join(c for c in titulo if c.isdigit())

    if len(digitos) not in (12, 13):
        return ResultadoValidacao(
            valido=False,
            mensagem="Título de Eleitor deve ter 12 ou 13 dígitos.",
            fonte="local",
        )

    # Validação matemática básica do título de eleitor
    if not _validar_titulo_digitos(digitos):
        return ResultadoValidacao(
            valido=False,
            mensagem="Título de Eleitor inválido — dígitos verificadores incorretos.",
            fonte="local",
        )

    return ResultadoValidacao(
        valido=True,
        mensagem="Título de Eleitor válido.",
        fonte="local",
    )


def _validar_titulo_digitos(titulo: str) -> bool:
    """
    Validação matemática dos dígitos verificadores do Título de Eleitor.
    """
    try:
        digitos = "".join(c for c in titulo if c.isdigit())
        if len(digitos) not in (12, 13):
            return False

        # Sequencial (primeiros 8 dígitos)
        sequencial = [int(d) for d in digitos[:8]]
        # Estado (2 dígitos seguintes)
        estado = [int(d) for d in digitos[8:10]]
        # Dígito verificador 1
        dv1_esperado = int(digitos[10])
        # Dígito verificador 2
        dv2_esperado = int(digitos[11]) if len(digitos) >= 12 else None

        pesos1 = [2, 3, 4, 5, 6, 7, 8, 9]
        soma1 = sum(sequencial[i] * pesos1[i] for i in range(8))
        resto1 = soma1 % 11
        dv1 = 0 if resto1 == 0 else (1 if resto1 == 1 else 11 - resto1)

        if dv1 != dv1_esperado:
            return False

        if dv2_esperado is not None:
            pesos2 = [7, 8, 9]
            soma2 = estado[0] * 7 + estado[1] * 8 + dv1 * 9
            resto2 = soma2 % 11
            dv2 = 0 if resto2 == 0 else (1 if resto2 == 1 else 11 - resto2)
            if dv2 != dv2_esperado:
                return False

        return True
    except Exception:
        return False


def verificar_inversao(campo: str, valor: str) -> dict | None:
    """
    Verifica se o usuário inverteu o campo CPF com Título ou vice-versa.
    Retorna um aviso se detectar inversão, None caso contrário.
    """
    resultado = detectar_inversao_cpf_titulo(valor)
    digitos = "".join(c for c in valor if c.isdigit())

    if campo == "cpf" and resultado["parece_titulo"]:
        return {
            "aviso": True,
            "mensagem": (
                f"O número informado ({len(digitos)} dígitos) parece ser um "
                "Título de Eleitor, não um CPF. CPF deve ter 11 dígitos. "
                "Verifique se não inverteu os campos."
            ),
        }

    if campo == "titulo" and resultado["parece_cpf"]:
        return {
            "aviso": True,
            "mensagem": (
                "O número informado parece ser um CPF (11 dígitos), não um "
                "Título de Eleitor. Título de Eleitor tem 12 ou 13 dígitos. "
                "Verifique se não inverteu os campos."
            ),
        }

    return None
