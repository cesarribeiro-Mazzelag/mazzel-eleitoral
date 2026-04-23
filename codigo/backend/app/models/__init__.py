# Todos os modelos importados aqui para que o Alembic os encontre
from app.models.base import Base
from app.models.eleitoral import (
    Candidato,
    Candidatura,
    VotosPorZona,
    Municipio,
    Partido,
    ZonaEleitoral,
    SecaoEleitoral,
)
from app.models.operacional import (
    Usuario,
    PoliticoPlataforma,
    Delegado,
    DelegadoZona,
    Filiado,
    FarolMunicipio,
    Alerta,
    AuditoriaLog,
    RelatorioGerado,
)
from app.models.campanha import (
    PessoaBase,
    Campanha,
    CampCerca,
    PapelCampanhaModel,
    MetaCerca,
    CercaAgregacao,
)
from app.models.afiliados import (
    AfilFiliado,
    AfilRepasse,
    AfilTreinamento,
    AfilComunicacao,
    AfilSaudeBase,
    AtividadeExecutivo,
)
from app.models.chat import (
    ChatSala,
    ChatParticipante,
    ChatMensagem,
    ChatAudit,
)
