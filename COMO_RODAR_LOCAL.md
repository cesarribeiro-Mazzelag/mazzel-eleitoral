============================================================
COMO RODAR O PROJETO EM LOCALHOST
============================================================

Pré-requisitos:
  Python 3.12+
  Node.js 20+
  PostgreSQL 16 com extensão PostGIS
  Redis

============================================================
BACKEND (FastAPI)
============================================================

  cd /Users/cesarribeiro/projetos/uniao-brasil/codigo/backend

  # Criar e ativar ambiente virtual
  python -m venv .venv
  source .venv/bin/activate

  # Instalar dependências
  pip install -r requirements.txt

  # Criar banco de dados local
  createdb uniao_brasil
  psql uniao_brasil -c "CREATE EXTENSION IF NOT EXISTS postgis;"

  # Rodar migrations (quando estiverem criadas)
  alembic upgrade head

  # Iniciar servidor
  uvicorn app.main:app --reload --port 8000

  API disponível em: http://localhost:8000
  Docs (dev): http://localhost:8000/docs

============================================================
FRONTEND (Next.js)
============================================================

  cd /Users/cesarribeiro/projetos/uniao-brasil/codigo/frontend

  # Instalar dependências
  npm install

  # Iniciar servidor
  npm run dev

  Plataforma disponível em: http://localhost:3002

============================================================
VARIÁVEIS DE AMBIENTE
============================================================

  Backend: /codigo/backend/.env
  Frontend: /codigo/frontend/.env.local

  Preencher antes de rodar:
  - ANTHROPIC_API_KEY (para módulo de IA)
  - SECRET_KEY (trocar o valor padrão)

============================================================
ORDEM DE DESENVOLVIMENTO (Sprints)
============================================================

  Sprint 0 — Rodar: uvicorn + next dev, login, auditoria
  Sprint 1 — ETL:   python etl/tse/download.py
  Sprint 2 — Mapa:  http://localhost:3002/mapa
  Sprint 3 — Dossiê
  ...

============================================================
